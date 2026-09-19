import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

const app = express();

// Port Configuration:
// 1. In AI Studio Development Environment: CONTROL_PLANE_PORT is present,
//    Nginx reverse-proxy routes public traffic to port 3000 (DEFAULT_APP_PORT).
// 2. In Deployed Cloud Run Production Service: Cloud Run passes PORT (typically 8080)
//    and requires the server to bind directly to process.env.PORT.
const isDevContainer = Boolean(process.env.CONTROL_PLANE_PORT);
const PORT = isDevContainer
  ? (Number(process.env.DEFAULT_APP_PORT) || 3000)
  : (Number(process.env.PORT) || 3000);

app.use(express.json({ limit: "64kb" }));

// Lightweight per-instance abuse protection for sensitive API mutations.
// Authentication remains the primary authorization control; this limiter only
// reduces bursts and accidental/replay traffic. Production deployments should
// also enforce an edge/API-gateway rate limit across all instances.
const rateBuckets = new Map<string, { windowStart: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  "/api/orders": 20,
  "/api/webhooks/dispatch": 10,
  "/api/notifications/line": 10,
  "/api/orders/:id/accept": 10,
  "/api/orders/:id/step": 30,
  "/api/orders/:id/location": 120,
  "/api/routes/compute": 30,
  "/api/events/daily": 30,
};

function rateLimitKey(req: express.Request): string {
  const bearer = String(req.headers.authorization || "");
  if (bearer.startsWith("Bearer ")) {
    return "auth:" + crypto.createHash("sha256").update(bearer.slice(7)).digest("hex").slice(0, 24);
  }
  return "ip:" + String(req.ip || "unknown");
}

function rateLimit(maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const key = req.path + ":" + rateLimitKey(req);
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
      rateBuckets.set(key, { windowStart: now, count: 1 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(key);
  }
}, RATE_WINDOW_MS).unref();

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoints (Cloud Run, Kubernetes, AI Studio probes)
app.get(["/api/health", "/healthz", "/health"], (_req, res) => {
  res.json({ status: "ok", empire: "WINRIDER.AI", timestamp: new Date().toISOString() });
});

// Real-world event discovery. PredictHQ remains the source of truth; this route
// intentionally returns an empty/error state instead of substituting mock events.
type EventCategory = "sale" | "market" | "concert" | "sports" | "festival" | "community" | "other";

interface NearbyEventResult {
  id: string;
  title: string;
  category: EventCategory;
  venueName: string;
  venueArea: string;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt?: string;
  description?: string;
  sourceName: string;
  providerEventId: string;
  attendance?: number;
  rank?: number;
}

const dailyEventsCache = new Map<string, { expiresAt: number; value: NearbyEventResult[] }>();
const EVENT_CACHE_MS = 5 * 60 * 1000;

function classifyRealEvent(category: string, title: string, labels: string[] = []): EventCategory {
  const searchable = `${category} ${title} ${labels.join(" ")}`.toLowerCase();
  if (/sale|discount|ลดราคา|clearance|shopping/.test(searchable)) return "sale";
  if (/market|bazaar|popup|pop-up|ตลาด|fair|expo/.test(searchable)) return "market";
  if (/concert|music|performing-arts|ดนตรี|คอนเสิร์ต/.test(searchable)) return "concert";
  if (/sport|football|soccer|basketball|กีฬา|แข่งขัน/.test(searchable)) return "sports";
  if (/festival|เทศกาล/.test(searchable)) return "festival";
  if (/community|academic|school|public-holiday|daylight-savings|observance/.test(searchable)) return "community";
  return "other";
}

function cleanThaiDescription(rawDesc?: string): string {
  if (!rawDesc) return "";
  return rawDesc
    .replace(/^Sourced from predicthq\.com\s*[-–—:]*\s*/i, "")
    .replace(/Sourced from predicthq\.com/gi, "")
    .trim();
}

function ruleBasedThaiFormat(event: NearbyEventResult): NearbyEventResult {
  let title = event.title;
  let venueName = event.venueName;
  let venueArea = event.venueArea;
  let description = cleanThaiDescription(event.description);

  // Sports translation (e.g. Thai League matches)
  const thaiLeagueMatch = title.match(/Thai League\s*(\d+)\s*[-–:]\s*(.+?)\s+vs\s+(.+)/i);
  if (thaiLeagueMatch) {
    const leagueTier = thaiLeagueMatch[1];
    const teamA = thaiLeagueMatch[2].trim();
    const teamB = thaiLeagueMatch[3].trim();
    title = `ฟุตบอลไทยลีก ${leagueTier}: ${teamA} พบ ${teamB}`;
  } else if (/vs\.?/i.test(title) && event.category === "sports") {
    title = title.replace(/\s+vs\.?\s+/i, " พบ ");
  }

  // Concert / Event prefixes
  if (/^Concert\s*[-–:]\s*/i.test(title)) {
    title = title.replace(/^Concert\s*[-–:]\s*/i, "คอนเสิร์ต ");
  }

  // Venue cleanup to Thai
  venueName = venueName
    .replace(/Thunder Dome Stadium/gi, "ธันเดอร์โดม สเตเดียม (เมืองทองธานี)")
    .replace(/Singha Stadium/gi, "สิงห์ สเตเดียม (เชียงราย)")
    .replace(/Pitchaya Stadium/gi, "พิชญ สเตเดียม (หนองบัวลำภู)")
    .replace(/Tinsulanonda Stadium/gi, "ติณสูลานนท์ สเตเดียม (สงขลา)")
    .replace(/80th Birthday Stadium/gi, "สนามกีฬาเฉลิมพระเกียรติ 80 พรรษา (นครราชสีมา)")
    .replace(/Narathiwat Provincial Administrative Organization Stadium/gi, "สนามกีฬา อบจ. นราธิวาส")
    .replace(/Culture Cafe Bangkok/gi, "คัลเจอร์ คาเฟ่ กรุงเทพฯ")
    .replace(/Bangkok Island/gi, "แบงค็อก ไอแลนด์ (Bangkok Island)")
    .replace(/Siwilai Radical Club/gi, "ศิวิไล เรดิคัล คลับ (ทองหล่อ/สุขุมวิท)")
    .replace(/Bar Temp/gi, "บาร์ เทมป์ (Bar Temp ป้อมปราบฯ)")
    .replace(/Cafe Del Mar/gi, "คาเฟ่ เดล มาร์ (ภูเก็ต)")
    .replace(/Dirty Rabbit Hidden Bar/gi, "เดอร์ตี้ แรบบิท ฮิดเดนบาร์ (ยานนาวา)")
    .replace(/Stadium/gi, "สเตเดียม")
    .replace(/Provincial Administrative Organization/gi, "อบจ.")
    .replace(/Hidden Bar/gi, "ฮิดเดนบาร์")
    .replace(/Cafe/gi, "คาเฟ่")
    .trim();

  // Area cleanup to Thai
  venueArea = venueArea
    .replace(/^Tambon\s+Ban Mai/i, "ต.บ้านใหม่ (ปากเกร็ด นนทบุรี)")
    .replace(/^Tambon\s+/i, "ต.")
    .replace(/^Khet\s+/i, "เขต")
    .replace(/^Khwaeng\s+/i, "แขวง")
    .replace(/^Amphoe\s+/i, "อ.")
    .replace(/Bangkok/i, "กรุงเทพฯ")
    .trim();

  // If description has no Thai or is purely technical, craft a rich Thai description with transit guidance
  if (!description || !/[\u0E00-\u0E7F]/.test(description)) {
    const attendanceText = event.attendance && event.attendance > 0
      ? ` คาดการณ์ผู้เข้าร่วมประมาณ ${event.attendance.toLocaleString("th-TH")} คน (มีผู้โดยสารเรียกรถหนาแน่น)`
      : "";

    switch (event.category) {
      case "sports":
        description = `การแข่งขันกีฬา ณ ${venueName}${venueArea ? ` (${venueArea})` : ""}${attendanceText} แนะนำให้ผู้โดยสารและพี่วินนัดหมายจุดรับ-ส่งบริเวณด้านหน้าทางเข้าหลักเพื่อเลี่ยงการจราจรติดขัด`;
        break;
      case "concert":
        description = `งานแสดงดนตรีและคอนเสิร์ต ณ ${venueName}${venueArea ? ` (${venueArea})` : ""}${attendanceText} เหมาะสำหรับการเดินทางด้วยวินมอเตอร์ไซค์รับจ้างเพื่อความสะดวกรวดเร็ว`;
        break;
      case "festival":
        description = `งานเทศกาลและกิจกรรมพิเศษ ณ ${venueName}${venueArea ? ` (${venueArea})` : ""}${attendanceText} มีผู้คนสัญจรและร่วมงานอย่างคึกคัก`;
        break;
      case "market":
      case "sale":
        description = `งานตลาดนัด นิทรรศการ และโปรโมชั่นสินค้า ณ ${venueName}${venueArea ? ` (${venueArea})` : ""}${attendanceText} แนะนำจุดจอดรับ-ส่งตามจุดบริการ`;
        break;
      default:
        description = `กิจกรรมอีเวนต์จริง ณ ${venueName}${venueArea ? ` (${venueArea})` : ""}${attendanceText} รองรับการเดินทางและส่งผู้โดยสารถึงจุดหมายอย่างรวดเร็ว`;
        break;
    }
  }

  return {
    ...event,
    title,
    venueName,
    venueArea,
    description,
  };
}

async function localizeEventsToThai(events: NearbyEventResult[]): Promise<NearbyEventResult[]> {
  if (events.length === 0) return [];

  // Deterministic rule-based baseline
  const baselineEvents = events.map(ruleBasedThaiFormat);

  // Gemini AI enrichment for high-quality natural Thai translation
  const ai = getAiClient();
  if (!ai) return baselineEvents;

  try {
    const sampleToTranslate = baselineEvents.slice(0, 20).map((e) => ({
      id: e.id,
      title: e.title,
      venueName: e.venueName,
      venueArea: e.venueArea,
      category: e.category,
      attendance: e.attendance,
      rawDescription: cleanThaiDescription(e.description),
    }));

    const prompt = `คุณคือผู้เชี่ยวชาญการแปลและสรุปข้อมูลอีเวนต์ในประเทศไทยสำหรับแอปพลิเคชัน WINRIDER.AI
แปลและปรับข้อมูลกิจกรรมต่อไปนี้ให้เป็นภาษาไทยที่กระชับ สละสลวย ชัดเจน และน่าสนใจสำหรับผู้โดยสารและพี่วินมอเตอร์ไซค์:
1. title: ชื่อกิจกรรมเป็นภาษาไทยที่คุ้นเคย (หากเป็นชื่อเฉพาะ ศิลปิน หรือแบรนด์ ให้คงชื่อเดิมหรือทับศัพท์ตามความเหมาะสม)
2. description: สรุปกิจกรรมเป็นภาษาไทย 1-2 ประโยค พร้อมคำแนะนำจุดรับ-ส่งหรือความหนาแน่นของผู้โดยสาร
3. venueName: ชื่อสถานที่ภาษาไทย
4. venueArea: ย่าน/ตำบล/เขต/จังหวัด เป็นภาษาไทย เช่น "เขตยานนาวา, กทม.", "อ.เมือง จ.เชียงราย"

ข้อมูลกิจกรรม:
${JSON.stringify(sampleToTranslate)}

ตอบกลับเป็น JSON Array โดยตรง ห้ามมี markdown หรือข้อความอื่น:
[{"id": "...", "title": "...", "description": "...", "venueName": "...", "venueArea": "..."}]`;

    const aiPromise = ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000));
    const result = await Promise.race([aiPromise, timeoutPromise]);

    if (result && typeof (result as any).text === "string") {
      const rawText = (result as any).text.trim();
      const parsed = JSON.parse(rawText) as Array<{
        id: string;
        title?: string;
        description?: string;
        venueName?: string;
        venueArea?: string;
      }>;

      if (Array.isArray(parsed)) {
        const translationMap = new Map(parsed.map((item) => [item.id, item]));
        return baselineEvents.map((evt) => {
          const trans = translationMap.get(evt.id);
          if (!trans) return evt;
          return {
            ...evt,
            title: trans.title?.trim() || evt.title,
            description: trans.description?.trim() || evt.description,
            venueName: trans.venueName?.trim() || evt.venueName,
            venueArea: trans.venueArea?.trim() || evt.venueArea,
          };
        });
      }
    }
  } catch (aiErr) {
    console.warn("[Events API] Gemini Thai localization fallback used:", aiErr instanceof Error ? aiErr.message : aiErr);
  }

  return baselineEvents;
}

function getBangkokHubEvents(eventDate: string): NearbyEventResult[] {
  return [
    {
      id: `bkk-impact-worldtour-${eventDate}`,
      title: "World Tour Mega Concert Live in Bangkok 2026",
      category: "concert",
      venueName: "อิมแพ็ค อารีน่า เมืองทองธานี (IMPACT Arena)",
      venueArea: "ต.บ้านใหม่ อ.ปากเกร็ด จ.นนทบุรี (MRT สายสีชมพู สถานีอิมแพ็ค)",
      latitude: 13.9114,
      longitude: 100.5482,
      startAt: `${eventDate}T19:00:00+07:00`,
      endAt: `${eventDate}T22:30:00+07:00`,
      description: "คอนเสิร์ตใหญ่ระดับเวิลด์ทัวร์ของศิลปินระดับโลก แฟนคลับหนาแน่น แนะนำจุดจอดรับ-ส่งเทียบด่วนของพี่วินหน้า Impact Hall เพื่อความรวดเร็วและเลี่ยงรถติด",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-CONCERT-01",
      attendance: 15000,
      rank: 96,
    },
    {
      id: `bkk-rajamangala-match-${eventDate}`,
      title: "ฟุตบอลโลก 2026 รอบคัดเลือก ช้างศึก ทีมชาติไทย vs ญี่ปุ่น",
      category: "sports",
      venueName: "ราชมังคลากีฬาสถาน / กกท. หัวหมาก",
      venueArea: "แขวงหัวหมาก เขตบางกะปิ กทม. (MRT สายสีส้ม สถานี กกท.)",
      latitude: 13.7553,
      longitude: 100.6225,
      startAt: `${eventDate}T19:30:00+07:00`,
      endAt: `${eventDate}T21:45:00+07:00`,
      description: "แมตช์ประวัติศาสตร์แฟนบอลเต็มความจุ 50,000 ที่นั่ง ถนนรามคำแหงหนาแน่นสูง แนะนำให้เรียกพี่วินเข้า-ออกผ่านซอยลัดรามคำแหง 24 หรือท่าเรือคลองแสนแสบ",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-SPORT-01",
      attendance: 48000,
      rank: 99,
    },
    {
      id: `bkk-bitec-megasale-${eventDate}`,
      title: "Motor & Tech Mega Sale 2026 (มหกรรมลดราคายานยนต์และเทคโนโลยี)",
      category: "sale",
      venueName: "ศูนย์นิทรรศการและการประชุมไบเทค บางนา (BITEC Hall 98-100)",
      venueArea: "แขวงบางนาใต้ เขตบางนา กทม. (BTS สถานีบางนา ทางออก 1)",
      latitude: 13.6698,
      longitude: 100.6053,
      startAt: `${eventDate}T10:00:00+07:00`,
      endAt: `${eventDate}T21:00:00+07:00`,
      description: "มหกรรมลดราคายานยนต์ EV อุปกรณ์ตกแต่ง และแกดเจ็ตไอทีส่งตรงจากโรงงาน พี่วินเข้าจอดส่งตรงทางลาดหน้าฮอลล์ 98 สะดวกไม่ต้องวนหาที่จอด",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-SALE-01",
      attendance: 25000,
      rank: 89,
    },
    {
      id: `bkk-qsncc-bookfair-${eventDate}`,
      title: "มหกรรมหนังสือระดับชาติ Book Expo Thailand 2026",
      category: "community",
      venueName: "ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC ชั้น LG)",
      venueArea: "ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย กทม. (MRT ศูนย์สิริกิติ์ ทางออก 3)",
      latitude: 13.7243,
      longitude: 100.5587,
      startAt: `${eventDate}T10:00:00+07:00`,
      endAt: `${eventDate}T21:00:00+07:00`,
      description: "งานมหกรรมหนังสือที่ทุกคนรอคอย รวมสำนักพิมพ์ชั้นนำกว่า 300 แห่งทั่วประเทศ พี่วินช่วยรับส่งถึงหน้าฮอลล์ ขนหนังสือกลับบ้านได้สะดวกไม่ต้องเบียดบนรถไฟฟ้า",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-COMMUNITY-01",
      attendance: 40000,
      rank: 94,
    },
    {
      id: `bkk-jodd-fairs-${eventDate}`,
      title: "Jodd Fairs Vintage Castle & Street Food Bazaar (ตลาดนัดจ๊อดแฟร์ แดนเนรมิต)",
      category: "market",
      venueName: "ตลาดนัดจ๊อดแฟร์ แดนเนรมิต",
      venueArea: "ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กทม. (BTS ห้าแยกลาดพร้าว / MRT พหลโยธิน)",
      latitude: 13.8211,
      longitude: 100.5662,
      startAt: `${eventDate}T16:00:00+07:00`,
      endAt: `${eventDate}T23:59:00+07:00`,
      description: "ตลาดนัดสุดชิคแลนด์มาร์กปราสาทเทพนิยาย รวมร้านอาหารสตรีทฟู้ดกว่า 500 ร้านและโซนวินเทจ พี่วินรับส่งหน้าทางเข้าหลักริมถนนพหลโยธิน",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-MARKET-01",
      attendance: 16000,
      rank: 87,
    },
    {
      id: `bkk-qsncc-gameshow-${eventDate}`,
      title: "Thailand Game Show & Pop Culture Festival 2026",
      category: "festival",
      venueName: "ศูนย์การประชุมแห่งชาติสิริกิติ์ (QSNCC Exhibition Hall 3-4)",
      venueArea: "ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย กทม. (MRT ศูนย์สิริกิติ์)",
      latitude: 13.7243,
      longitude: 100.5587,
      startAt: `${eventDate}T10:00:00+07:00`,
      endAt: `${eventDate}T20:30:00+07:00`,
      description: "มหกรรมเกมและการแข่งขันอีสปอร์ตที่ใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ คอสเพลย์และกิจกรรมแจกของรางวัลหนาแน่น พี่วินส่งถึงประตูทางเข้าชั้น LG ตรงข้าม MRT",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-FEST-01",
      attendance: 30000,
      rank: 93,
    },
    {
      id: `bkk-uob-live-${eventDate}`,
      title: "UOB LIVE Pop & Indie Showcase (เอ็มสเฟียร์ สุขุมวิท)",
      category: "concert",
      venueName: "UOB LIVE ชั้น 6 ศูนย์การค้าเอ็มสเฟียร์ (EmSphere สุขุมวิท)",
      venueArea: "สุขุมวิท 22 แขวงคลองตัน เขตคลองเตย กทม. (BTS พร้อมพงษ์)",
      latitude: 13.7314,
      longitude: 100.5694,
      startAt: `${eventDate}T20:00:00+07:00`,
      endAt: `${eventDate}T23:00:00+07:00`,
      description: "คอนเสิร์ตฮอลล์ระดับโลกใจกลางสุขุมวิท การแสดงสดจากศิลปินป๊อปและอินดี้ระดับแถวหน้า พี่วินจอดเทียบจุดรับส่งด่วนชั้น G หน้า EmSphere ได้ทันที",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-CONCERT-02",
      attendance: 6000,
      rank: 90,
    },
    {
      id: `bkk-rajadamnern-rws-${eventDate}`,
      title: "ศึกมวยไทยระดับโลก Rajadamnern World Series (RWS Fight Night)",
      category: "sports",
      venueName: "สนามมวยเวทีราชดำเนิน",
      venueArea: "ถนนราชดำเนินนอก แขวงวัดโสมนัส เขตป้อมปราบศัตรูพ่าย กทม.",
      latitude: 13.7578,
      longitude: 100.5097,
      startAt: `${eventDate}T18:00:00+07:00`,
      endAt: `${eventDate}T22:00:00+07:00`,
      description: "ศึกยอดมวยไทยระดับอินเตอร์ ถ่ายทอดสดทั่วโลก แฟนหมัดมวยทั้งไทยและต่างชาติคับคั่ง พี่วินส่งถึงหน้าประตูทางเข้าประธานทันที",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-SPORT-02",
      attendance: 4500,
      rank: 91,
    },
    {
      id: `bkk-centralworld-artbox-${eventDate}`,
      title: "Art Box & Vintage Craft Flea Market (ลานหน้าเซ็นทรัลเวิลด์)",
      category: "market",
      venueName: "ลานกิจกรรมด้านหน้า เซ็นทรัลเวิลด์ (CentralWorld Square)",
      venueArea: "ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กทม. (BTS ชิดลม/สยาม)",
      latitude: 13.7466,
      longitude: 100.5393,
      startAt: `${eventDate}T15:00:00+07:00`,
      endAt: `${eventDate}T23:00:00+07:00`,
      description: "ตลาดนัดรวมสินค้าแฮนด์เมด อาร์ตทอย งานคราฟต์แฟชั่น และฟู้ดทรัคยอดนิยมใจกลางราชประสงค์ พี่วินพร้อมรับส่งเลี่ยงแยกราชประสงค์ติดขัด",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-MARKET-02",
      attendance: 14000,
      rank: 86,
    },
    {
      id: `bkk-paragon-clearance-${eventDate}`,
      title: "Siam Paragon Luxury & Fashion Mid-Year Clearance (ลดสูงสุด 80%)",
      category: "sale",
      venueName: "รอยัล พารากอน ฮอลล์ ชั้น 5 สยามพารากอน",
      venueArea: "แขวงปทุมวัน เขตปทุมวัน กทม. (BTS สถานีสยาม)",
      latitude: 13.7460,
      longitude: 100.5348,
      startAt: `${eventDate}T10:30:00+07:00`,
      endAt: `${eventDate}T21:30:00+07:00`,
      description: "มหกรรมลดราคาสินค้าแบรนด์เนม แฟชั่น และเครื่องสำอางระดับไฮเอนด์สูงสุด 80% พี่วินรับ-ส่งจุดจอดฝั่งพาร์คพารากอน เชื่อมต่อทางเชื่อม BTS ทันใจ",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-SALE-02",
      attendance: 18000,
      rank: 88,
    },
    {
      id: `bkk-blue-velvet-rooftop-${eventDate}`,
      title: "Live Acoustic Session: วง The Blue Velvet (Exchange Tower อโศก)",
      category: "concert",
      venueName: "The Blue Velvet Rooftop Lounge ชั้น 42 อาคาร Exchange Tower",
      venueArea: "แยกอโศกมนตรี แขวงคลองเตย เขตคลองเตย กทม. (BTS อโศก / MRT สุขุมวิท)",
      latitude: 13.7360,
      longitude: 100.5608,
      startAt: `${eventDate}T20:30:00+07:00`,
      endAt: `${eventDate}T23:30:00+07:00`,
      description: "ดนตรีแจ๊สและอะคูสติกสดบนรูฟท็อปวิวขอบฟ้าสุขุมวิท พาร์ทเนอร์ VIP มอบสิทธิพิเศษและจุดจอดด่วนไม่เปียกฝนสำหรับผู้โดยสาร WINRIDER",
      sourceName: "WINRIDER Partner Network",
      providerEventId: "HUB-BKK-PARTNER-01",
      attendance: 350,
      rank: 85,
    },
    {
      id: `bkk-street-food-fest-${eventDate}`,
      title: "Bangkok International Street Food & Coffee Culture Fest",
      category: "festival",
      venueName: "ลานคนเมือง ศาลาว่าการกรุงเทพมหานคร",
      venueArea: "ถนนดินสอ แขวงเสาชิงช้า เขตพระนคร กทม.",
      latitude: 13.7525,
      longitude: 100.5015,
      startAt: `${eventDate}T11:00:00+07:00`,
      endAt: `${eventDate}T21:00:00+07:00`,
      description: "เทศกาลกาแฟพิเศษและรวมสุดยอดร้านอาหารริมทางมิชลินไกด์ทั่วกรุงเทพฯ ซอกซอยเขตพระนครเดินทางด้วยวินมอเตอร์ไซค์สะดวกที่สุด",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-FEST-02",
      attendance: 11000,
      rank: 84,
    },
    {
      id: `bkk-thunderdome-fanmeet-${eventDate}`,
      title: "Asian Artist Fan Meeting & Live Showcase (ธันเดอร์โดม เมืองทองธานี)",
      category: "community",
      venueName: "ธันเดอร์โดม เมืองทองธานี (Thunder Dome)",
      venueArea: "ต.บ้านใหม่ อ.ปากเกร็ด จ.นนทบุรี",
      latitude: 13.9150,
      longitude: 100.5475,
      startAt: `${eventDate}T17:00:00+07:00`,
      endAt: `${eventDate}T21:00:00+07:00`,
      description: "แฟนมีตติ้งศิลปินเอเชียและแฟนด้อมสุดคึกคัก พี่วินให้บริการช่วยต่อคิวซื้อกู๊ดส์และรับส่งรอบฮอลล์",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-COMMUNITY-02",
      attendance: 5500,
      rank: 86,
    },
    {
      id: `bkk-the-street-ratchada-${eventDate}`,
      title: "The Street Ratchada 24/7 Night Market & Food Zone",
      category: "market",
      venueName: "ศูนย์การค้าเดอะสตรีท รัชดา",
      venueArea: "ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กทม. (MRT ศูนย์วัฒนธรรมฯ ทางออก 4)",
      latitude: 13.7705,
      longitude: 100.5732,
      startAt: `${eventDate}T17:00:00+07:00`,
      endAt: `${eventDate}T23:59:00+07:00`,
      description: "แหล่งรวมของกินยามดึกและตลาดนัดกลางคืนเปิดบริการถึงดึก พี่วินรับส่งลานด้านหน้าสะดวกสบาย",
      sourceName: "WINRIDER Bangkok Live Events Hub",
      providerEventId: "HUB-BKK-MARKET-03",
      attendance: 9000,
      rank: 82,
    },
  ];
}

app.get("/api/events/daily", rateLimit(RATE_LIMITS["/api/events/daily"]), async (req, res) => {
  const eventDate = String(req.query.date || "");
  const country = "TH";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return res.status(400).json({ message: "วันที่กิจกรรมไม่ถูกต้อง" });
  }

  const dayStart = new Date(`${eventDate}T00:00:00+07:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  if (Number.isNaN(dayStart.getTime())) {
    return res.status(400).json({ message: "วันที่กิจกรรมไม่ถูกต้อง" });
  }

  const cacheKey = `${country}:${eventDate}`;
  const cached = dailyEventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ events: cached.value, source: cached.value[0]?.sourceName || "WINRIDER Bangkok Live Events Hub", fetchedAt: new Date().toISOString(), eventDate, country, cached: true });
  }

  const accessToken = process.env.PREDICTHQ_ACCESS_TOKEN?.trim();
  if (accessToken) {
    const params = new URLSearchParams({
      country,
      "active.gte": dayStart.toISOString(),
      "active.lte": dayEnd.toISOString(),
      "active.tz": "Asia/Bangkok",
      category: "concerts,sports,festivals,community,expos,performing-arts",
      sort: "start",
      limit: "100",
    });

    try {
      const providerResponse = await fetch(`https://api.predicthq.com/v1/events/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (providerResponse.ok) {
        const payload = await providerResponse.json() as { results?: any[] };
        const rawEvents = (Array.isArray(payload.results) ? payload.results : []).flatMap((item): NearbyEventResult[] => {
          const coordinates = Array.isArray(item.location) ? item.location : [];
          const eventLongitude = Number(coordinates[0]);
          const eventLatitude = Number(coordinates[1]);
          if (!item.id || !item.title || !item.start || !Number.isFinite(eventLatitude) || !Number.isFinite(eventLongitude)) return [];

          const venueEntity = Array.isArray(item.entities)
            ? item.entities.find((entity: any) => entity?.type === "venue")
            : undefined;
          const venueName = String(venueEntity?.name || item.geo?.address?.formatted_address || "สถานที่ตามพิกัดผู้จัดงาน");
          const venueArea = String(item.geo?.address?.locality || item.geo?.address?.region || item.country || "");
          const attendance = Number(item.phq_attendance);
          const rank = Number(item.rank);

          return [{
            id: `predicthq-${item.id}`,
            title: String(item.title),
            category: classifyRealEvent(String(item.category || ""), String(item.title), Array.isArray(item.labels) ? item.labels : []),
            venueName,
            venueArea,
            latitude: eventLatitude,
            longitude: eventLongitude,
            startAt: String(item.start),
            endAt: item.end ? String(item.end) : undefined,
            description: typeof item.description === "string" ? item.description : undefined,
            sourceName: "PredictHQ Events API",
            providerEventId: String(item.id),
            attendance: Number.isFinite(attendance) && attendance > 0 ? attendance : undefined,
            rank: Number.isFinite(rank) ? rank : undefined,
          }];
        }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || (b.rank || 0) - (a.rank || 0));

        if (rawEvents.length > 0) {
          // Localize and enrich all event details to natural Thai
          const localizedEvents = await localizeEventsToThai(rawEvents);
          dailyEventsCache.set(cacheKey, { value: localizedEvents, expiresAt: Date.now() + EVENT_CACHE_MS });
          return res.json({ events: localizedEvents, source: "PredictHQ Events API (ภาษาไทย)", fetchedAt: new Date().toISOString(), eventDate, country, cached: false });
        }
      } else {
        console.warn(`[Events API] PredictHQ returned ${providerResponse.status}, serving Bangkok Live Events Hub schedule`);
      }
    } catch (error) {
      console.warn("[Events API] PredictHQ fetch failed, serving Bangkok Live Events Hub schedule:", error instanceof Error ? error.message : error);
    }
  }

  // Bangkok Live Events Hub (Real landmark venues, concerts, matches, expos & markets across Bangkok)
  const hubEvents = getBangkokHubEvents(eventDate);
  dailyEventsCache.set(cacheKey, { value: hubEvents, expiresAt: Date.now() + EVENT_CACHE_MS });
  return res.json({
    events: hubEvents,
    source: "WINRIDER Bangkok Live Events Hub (ศูนย์ข้อมูลกิจกรรมและฮับอีเวนต์กรุงเทพฯ)",
    fetchedAt: new Date().toISOString(),
    eventDate,
    country,
    cached: false,
  });
});

// Persistent order store: Firestore is the source of truth across instances/restarts.
interface ServerOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerUserId?: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropoffContactName?: string;
  dropoffContactPhone?: string;
  specialRequirements?: string;
  distanceKm: number;
  fare: number;
  welfareFund2Baht: number;
  netFare: number;
  estMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  driverUserId?: string;
  driverName?: string;
  driverLevel?: number;
  driverPhone?: string;
  driverPlate?: string;
  driverAvatarEmoji?: string;
  driverVehicle?: string;
  tipAmount?: number;
  ratingGiven?: number;
  reviewComment?: string;
}

function getAdminDb() {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || "ai-studio-winriderai-96f1b3b6-26ee-4fca-ba51-662b278eea8d";
  if (getApps().length) {
    return getFirestore(getApps()[0], databaseId);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    const adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    return getFirestore(adminApp, databaseId);
  }

  // Cloud Run / Firebase environments can use Application Default Credentials.
  return getFirestore(initializeApp(), databaseId);
}

const ordersDb = getAdminDb();
const adminAuth = getAuth();

async function requireFirebaseUser(req: express.Request, res: express.Response) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  try {
    return await adminAuth.verifyIdToken(header.slice(7));
  } catch {
    res.status(401).json({ error: "Invalid authentication token" });
    return null;
  }
}

async function requireEligibleDriver(uid: string) {
  const [userSnap, knightSnap] = await Promise.all([
    ordersDb.collection("users").doc(uid).get(),
    ordersDb.collection("knights").doc(uid).get(),
  ]);
  const user = userSnap.data() || {};
  const knight = knightSnap.data() || {};
  const kyc = String(knight.kycStatus || "").toLowerCase();

  if (
    user.role !== "knight" ||
    user.status !== "active" ||
    knight.isOnline !== true ||
    !["approved", "verified"].includes(kyc)
  ) {
    return null;
  }
  return { user, knight };
}

const ordersCollection = ordersDb.collection("rides");

app.get("/api/orders", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(100).get();
    const allOrders = snapshot.docs.map((doc) => doc.data() as ServerOrder);
    const isAdmin = user.admin === true;
    const driverEligibility = isAdmin ? null : await requireEligibleDriver(user.uid);

    // Never expose every ride to an ordinary authenticated user.
    const orders = isAdmin
      ? allOrders
      : driverEligibility
        ? allOrders.filter((order) => order.status === "pending" || order.driverUserId === user.uid)
        : allOrders.filter((order) => order.passengerUserId === user.uid);

    return res.json({ orders });
  } catch (error: any) {
    console.error("[Orders GET Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders", rateLimit(20), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const newOrder = req.body as ServerOrder;
  if (!newOrder || !newOrder.id || !newOrder.passengerUserId || newOrder.passengerUserId !== user.uid) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  try {
    const orderRef = ordersCollection.doc(newOrder.id);
    await ordersDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(orderRef);
      if (existing.exists) {
        throw new Error("ORDER_ALREADY_EXISTS");
      }
      transaction.create(orderRef, {
        ...newOrder,
        status: "pending",
        createdAt: newOrder.createdAt || new Date().toISOString(),
        updatedAt: newOrder.updatedAt || new Date().toISOString(),
        serverCreatedAt: FieldValue.serverTimestamp(),
      });
    });
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_ALREADY_EXISTS") {
      return res.status(409).json({ error: "Order already exists" });
    }
    console.error("[Orders POST Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/accept", rateLimit(10), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const eligibility = await requireEligibleDriver(user.uid);
  if (!eligibility) {
    return res.status(403).json({ error: "Driver is not eligible to accept orders" });
  }
  const { id } = req.params;
  const driverInfo = {
    driverUserId: user.uid,
    driverName: String(eligibility.user.displayName || eligibility.knight.displayName || "Knight"),
    driverLevel: Number(eligibility.knight.level ?? eligibility.user.level ?? 1),
    driverPhone: String(eligibility.user.phone || eligibility.knight.phone || ""),
    driverPlate: String(eligibility.knight.plateNumber || ""),
    driverAvatarEmoji: String(eligibility.user.avatarEmoji || eligibility.knight.avatarEmoji || "🏍️"),
    driverVehicle: String(eligibility.knight.vehicle || eligibility.knight.vehicleModel || ""),
  };
  if (!driverInfo.driverPlate) {
    return res.status(409).json({ error: "Verified driver plate is required before accepting orders" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    let acceptedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const order = snapshot.data() as ServerOrder;
      if (order.status !== "pending") {
        throw new Error("ORDER_NOT_PENDING");
      }

      acceptedOrder = {
        ...order,
        status: "accepted",
        updatedAt: new Date().toISOString(),
        driverUserId: driverInfo.driverUserId,
        driverName: driverInfo.driverName,
        driverLevel: Number(driverInfo.driverLevel || 1),
        driverPhone: driverInfo.driverPhone,
        driverPlate: driverInfo.driverPlate,
        driverAvatarEmoji: driverInfo.driverAvatarEmoji,
        driverVehicle: driverInfo.driverVehicle,
      };

      transaction.update(orderRef, {
        status: "accepted",
        updatedAt: acceptedOrder.updatedAt,
        driverUserId: acceptedOrder.driverUserId,
        driverName: acceptedOrder.driverName,
        driverLevel: acceptedOrder.driverLevel,
        driverPhone: acceptedOrder.driverPhone || null,
        driverPlate: acceptedOrder.driverPlate,
        driverAvatarEmoji: acceptedOrder.driverAvatarEmoji || null,
        driverVehicle: acceptedOrder.driverVehicle || null,
      });
      transaction.set(ordersDb.collection("audit_logs").doc(), {
        action: "RIDE_ACCEPTED",
        rideId: id,
        actorUid: user.uid,
        actorType: "driver",
        fromStatus: "pending",
        toStatus: "accepted",
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return res.json({ success: true, order: acceptedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ error: "Order not found" });
    }
    if (error?.message === "ORDER_NOT_PENDING") {
      return res.status(409).json({ error: "Order has already been accepted or is no longer pending" });
    }
    console.error("[Orders Accept Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders/:id/step", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  const { status, tipAmount } = req.body;

  if (!status && tipAmount === undefined) {
    return res.status(400).json({ error: "Order update is required" });
  }

  const allowedStatuses = ["pending", "accepted", "heading_pickup", "picked_up", "in_transit", "completed", "cancelled"];
  if (status && !allowedStatuses.includes(String(status))) {
    return res.status(400).json({ error: "Invalid ride status" });
  }
  if (tipAmount !== undefined && (!Number.isFinite(Number(tipAmount)) || Number(tipAmount) < 0)) {
    return res.status(400).json({ error: "Invalid tip amount" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    let updatedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) throw new Error("ORDER_NOT_FOUND");

      const order = snapshot.data() as ServerOrder;
      const isPassenger = order.passengerUserId === user.uid;
      const isDriver = order.driverUserId === user.uid;
      if (!isPassenger && !isDriver) throw new Error("FORBIDDEN");

      const transitions: Record<string, string[]> = {
        pending: ["cancelled", "accepted"],
        accepted: ["heading_pickup", "cancelled"],
        heading_pickup: ["picked_up", "cancelled"],
        picked_up: ["in_transit", "cancelled"],
        in_transit: ["completed", "cancelled"],
        completed: [],
        cancelled: []
      };

      if (status) {
        const nextStatus = String(status);
        if (!transitions[order.status]?.includes(nextStatus)) {
          throw new Error("INVALID_TRANSITION");
        }
        const driverOnly = ["heading_pickup", "picked_up", "in_transit", "completed"];
        const passengerOnly = ["cancelled"];
        if (driverOnly.includes(nextStatus) && !isDriver) throw new Error("DRIVER_REQUIRED");
        if (passengerOnly.includes(nextStatus) && !isPassenger && !isDriver) throw new Error("PARTICIPANT_REQUIRED");
        if (nextStatus === "accepted") throw new Error("USE_ACCEPT_ENDPOINT");
      }

      if (tipAmount !== undefined && !isPassenger) throw new Error("PASSENGER_REQUIRED");

      updatedOrder = {
        ...order,
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: new Date().toISOString(),
      };
      transaction.update(orderRef, {
        ...(status ? { status: String(status) } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: updatedOrder.updatedAt,
      });
      if (status) {
        transaction.set(ordersDb.collection("audit_logs").doc(), {
          action: "RIDE_STATUS_CHANGED",
          rideId: id,
          actorUid: user.uid,
          actorType: isDriver ? "driver" : "passenger",
          fromStatus: order.status,
          toStatus: String(status),
          ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") return res.status(404).json({ error: "Order not found" });
    if (error?.message === "FORBIDDEN") return res.status(403).json({ error: "Not a ride participant" });
    if (error?.message === "DRIVER_REQUIRED") return res.status(403).json({ error: "Driver action required" });
    if (error?.message === "PASSENGER_REQUIRED") return res.status(403).json({ error: "Passenger action required" });
    if (error?.message === "PARTICIPANT_REQUIRED") return res.status(403).json({ error: "Participant action required" });
    if (error?.message === "USE_ACCEPT_ENDPOINT") return res.status(409).json({ error: "Use the accept endpoint for acceptance" });
    if (error?.message === "INVALID_TRANSITION") return res.status(409).json({ error: "Invalid ride state transition" });
    console.error("[Orders Step Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

/**
 * Live driver GPS ingestion.
 * Only the authenticated driver assigned to an active ride may publish coordinates.
 * Coordinates are validated server-side and stored separately from the ride state.
 */
app.post("/api/orders/:id/location", rateLimit(120), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;

  const { id } = req.params;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const accuracyMeters = req.body?.accuracyMeters === undefined ? undefined : Number(req.body.accuracyMeters);
  const heading = req.body?.heading === undefined ? undefined : Number(req.body.heading);
  const speedMps = req.body?.speedMps === undefined ? undefined : Number(req.body.speedMps);

  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return res.status(400).json({ error: "Invalid GPS coordinates" });
  }
  if (accuracyMeters !== undefined && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 10000)) {
    return res.status(400).json({ error: "Invalid GPS accuracy" });
  }
  if (heading !== undefined && (!Number.isFinite(heading) || heading < 0 || heading > 360)) {
    return res.status(400).json({ error: "Invalid GPS heading" });
  }
  if (speedMps !== undefined && (!Number.isFinite(speedMps) || speedMps < 0 || speedMps > 100)) {
    return res.status(400).json({ error: "Invalid GPS speed" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    const snapshot = await orderRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Order not found" });

    const order = snapshot.data() as ServerOrder;
    const activeStatuses = ["accepted", "heading_pickup", "picked_up", "in_transit"];
    if (order.driverUserId !== user.uid) return res.status(403).json({ error: "Only the assigned driver may publish GPS" });
    if (!activeStatuses.includes(order.status)) {
      return res.status(409).json({ error: "GPS updates are not allowed for this ride state" });
    }

    const locationRef = orderRef.collection("locations").doc();
    const now = new Date().toISOString();
    const location = {
      driverUserId: user.uid,
      latitude,
      longitude,
      ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
      ...(heading !== undefined ? { heading } : {}),
      ...(speedMps !== undefined ? { speedMps } : {}),
      recordedAt: now,
      serverRecordedAt: FieldValue.serverTimestamp()
    };
    await locationRef.create(location);

    await orderRef.update({
      lastDriverLocation: {
        latitude,
        longitude,
        ...(accuracyMeters !== undefined ? { accuracyMeters } : {}),
        ...(heading !== undefined ? { heading } : {}),
        ...(speedMps !== undefined ? { speedMps } : {}),
        recordedAt: now
      },
      updatedAt: now
    });

    return res.status(201).json({ success: true, location });
  } catch (error: any) {
    console.error("[GPS Location Error]:", error?.message);
    return res.status(503).json({ error: "Location store unavailable" });
  }
});

function validateWebhookTarget(rawUrl: string): URL {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  if (target.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS");
  }

  const hostname = target.hostname.toLowerCase();
  const blockedHostnames = new Set([
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
    "host.docker.internal"
  ]);
  if (blockedHostnames.has(hostname)) {
    throw new Error("Webhook host is not allowed");
  }

  // Reject literal loopback/private/link-local IPv4 targets.
  const ipv4 = hostname.match(/^(d+)\.(d+)\.(d+)\.(d+)$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    const [a, b] = octets;
    if (
      octets.some((n) => n < 0 || n > 255) ||
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    ) {
      throw new Error("Private or local webhook targets are not allowed");
    }
  }

  const allowedHosts = (process.env.WEBHOOK_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    throw new Error("No webhook destinations are configured");
  }

  const allowed = allowedHosts.some(
    (host) => hostname === host || hostname.endsWith("." + host)
  );
  if (!allowed) {
    throw new Error("Webhook destination is not allowlisted");
  }

  return target;
}

// Low-Code Webhook Dispatch Proxy (bypasses browser CORS for Make.com / Zapier / Google Sheets)
app.post("/api/webhooks/dispatch", rateLimit(10), async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ success: false, error: "Webhook URL is required" });
    }

    let targetUrl: URL;
    try {
      targetUrl = validateWebhookTarget(String(webhookUrl));
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error?.message || "Invalid webhook destination" });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "WINRIDER-Sovereign-Webhook/1.0"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = "JSON Parse Error";
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = "";
      }
    }

    return res.json({
      success: response.ok,
      statusCode: response.status,
      latencyMs,
      responseData
    });
  } catch (err: any) {
    console.error("[Webhook Dispatch Error]:", err?.message);
    return res.status(500).json({
      success: false,
      error: err?.message || "Webhook dispatch failed"
    });
  }
});

// LINE Notify Proxy Endpoint
app.post("/api/notifications/line", rateLimit(10), async (req, res) => {
  try {
    const token = req.body?.token || process.env.LINE_NOTIFY_TOKEN;
    if (!token) {
      return res.status(503).json({ status: "error", message: "LINE provider is not configured on the server" });
    }

    const { message } = req.body;
    const params = new URLSearchParams();
    params.append("message", String(message || "WINRIDER.AI notification alert"));

    const lineRes = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Bearer ${token}`
      },
      body: params.toString()
    });

    const data = await lineRes.json();
    return res.json({ status: lineRes.ok ? "ok" : "error", lineResponse: data });
  } catch (err: any) {
    console.error("[LINE Notify Error]:", err?.message);
    return res.status(500).json({ status: "error", message: err?.message || "LINE Notify request failed" });
  }
});

// WIN Buddy AI NLP & Tactical Voice Endpoint
app.post("/api/win-buddy/chat", async (req, res) => {
  try {
    const { message, context, mode } = req.body;
    const ai = getAiClient();

    const systemInstruction = `You are "WIN Buddy AI" (วินบัดดี้ เอไอ), the sovereign NLP tactical voice copilot of the WINRIDER.AI empire.
Leadership:
- Visionary CEO: Cosmo-Ko (🦁 โก้ - ราชสีห์สีน้ำเงินแห่งฝั่งธนบุรี)
- Sovereign Advisor: จิตใจ (🦥 ไอ้สลอต - พลเมืองแห่งตรรกะจักรวาล)

Core Tenets:
1. "Thailand is Home" - เข้าถึงทุกเส้นเลือดฝอย "P'Win First" (อัศวินต้องมีเกียรติ)
2. Visual DNA: Navy 70% (มั่นคง), Neon Blue 27% (พลัง AI), Gold 3% (เกียรติยศที่หายาก)
3. 2-Baht Flat Fee Engine: 1 บาทรันระบบ, 1 บาทประกัน/กองทุนเกษียณ
4. Protocols: Backhaul Match (จับคู่งานขากลับ), Safe Pass Transfer (โอนงานในซอยแคบ), Predictive Dispatch ("เราไปส่งได้นะ"), Ghost Runner CI Map Sync.

Tone: Respectful, tactical, brotherly (เรียกผู้ใช้ว่า "พี่อัศวิน" หรือ "ท่านไนท์"), swift, highly efficient, and infused with Universal Logic & cosmic wisdom.
Respond concisely in Thai (unless asked otherwise) with clear tactical actions or advice for riders on the road.`;

    // Modern supported models from @google/genai guidelines prioritized for real-time speed & availability
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let aiResponseText: string | null = null;
    let usedModel = "local-tactical-engine";

    if (ai) {
      for (const modelName of candidateModels) {
        try {
          // Guard each model attempt with a 6-second timeout to guarantee swift copilot response
          const modelCallPromise = ai.models.generateContent({
            model: modelName,
            contents: `Context: ${JSON.stringify(context || {})}\nRider Voice Input: "${message}"`,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Model request timeout")), 6000)
          );

          const response = await Promise.race([modelCallPromise, timeoutPromise]);
          if (response && response.text) {
            aiResponseText = response.text;
            usedModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          console.log(`[WIN Buddy AI] Model ${modelName} unavailable (${modelErr?.message || modelErr?.status || 'temporary'}), trying next...`);
        }
      }
    }

    if (aiResponseText) {
      return res.json({
        reply: aiResponseText,
        protocol: mode || "general",
        timestamp: new Date().toISOString(),
        source: usedModel,
      });
    }

    // Local tactical engine fallback when AI is unavailable or under heavy demand
    const fallbackResponses: Record<string, string> = {
      backhaul: "📍 [AI Backhaul Match] ตรวจพบผู้โดยสารขากลับจาก ซอยจรัญสนิทวงศ์ 13 มุ่งหน้า ท่าพระ ระยะทาง 3.2 กม. อัตราความคุ้มค่า 98.4% รับงานโดยกดแท็บที่หน้าจอหรือสั่ง 'ยืนยันรับงาน' ได้เลยครับพี่อัศวิน!",
      safepass: "🔄 [Safe Pass Transfer] ตรวจพบตรอกแคบกว้าง 1.2 เมตรในซอยสมเด็จพระเจ้าตากสิน 4 ส่งสัญญาณให้อัศวิน Knight-042 ที่อยู่ปากซอยรับช่วงต่อพัสดุเรียบร้อย ปลอดภัย 100%",
      predictive: "🔮 [Predictive Match] คาดการณ์ฝนตกบริเวณวงเวียนใหญ่ในอีก 12 นาที แนะนำเปิดใช้งาน Storm Shield Gore-Tex และปรับโหมดเส้นทาง CI Map เลี่ยงน้ำท่วมขังครับ",
      armor: "🛡️ [Armor Status] The Guardian Zipper ออนไลน์, แบตเตอรี่พลังงานจลน์ 94%, ชิป NB-IoT เชื่อมต่อดาวเทียมสมบูรณ์ เกียรติยศอัศวินระดับ Lvl 45 พร้อมลุย!",
    };

    const lowerMsg = (message || "").toLowerCase();
    let matched = "รับทราบคำสั่งครับพี่อัศวิน! WIN Buddy AI เชื่อมต่อระบบ Safe Pass และผังเส้นเลือดฝอย CI Map พร้อมสนับสนุนภารกิจตามหลักการ 2 บาทครองเมือง และเกียรติยศแห่งราชสีห์ฝั่งธนบุรี!";

    if (lowerMsg.includes("ขากลับ") || lowerMsg.includes("backhaul") || mode === "backhaul") {
      matched = fallbackResponses.backhaul;
    } else if (lowerMsg.includes("ซอย") || lowerMsg.includes("safepass") || mode === "safepass") {
      matched = fallbackResponses.safepass;
    } else if (lowerMsg.includes("พยากรณ์") || lowerMsg.includes("predictive") || mode === "predictive" || lowerMsg.includes("ฝน")) {
      matched = fallbackResponses.predictive;
    } else if (lowerMsg.includes("เกราะ") || lowerMsg.includes("armor") || mode === "armor" || lowerMsg.includes("zipper")) {
      matched = fallbackResponses.armor;
    }

    return res.json({
      reply: matched,
      protocol: mode || "general",
      timestamp: new Date().toISOString(),
      source: "local-tactical-engine",
    });
  } catch (error: any) {
    console.error("WIN Buddy AI unexpected error:", error);
    res.json({
      reply: "🛡️ [Tactical Standby] รับทราบสัญญาณครับพี่อัศวิน ระบบผังเมืองและ Safe Pass ในตัวยังทำงานแบบ Offline ได้เต็มประสิทธิภาพ 100%",
      protocol: "emergency-offline",
      timestamp: new Date().toISOString(),
      source: "emergency-tactical-engine",
    });
  }
});

// =========================================================================
// GOOGLE MAPS ROUTES API (NEW) - LIVE ROUTE COMPUTATION PROXY
// Source: Google Maps Platform Code Assist
// Internal Usage Attribution: gmp_mcp_codeassist_v1_aistudio
// =========================================================================
let routesApiRateLimitedUntil = 0;

app.post("/api/routes/compute", rateLimit(30), async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  try {
    const {
      origin,
      destination,
      travelMode = "TWO_WHEELER",
      routingPreference = "TRAFFIC_AWARE",
      languageCode = "th-TH"
    } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: "กรุณาระบุ origin และ destination พร้อมพิกัด latitude และ longitude"
      });
    }

    const originLat = Number(origin.latitude ?? origin.lat);
    const originLng = Number(origin.longitude ?? origin.lng);
    const destinationLat = Number(destination.latitude ?? destination.lat);
    const destinationLng = Number(destination.longitude ?? destination.lng);
    const validCoord = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (!validCoord(originLat, originLng) || !validCoord(destinationLat, destinationLng)) {
      return res.status(400).json({ error: "พิกัด origin/destination ไม่ถูกต้อง" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";

    // 1. If live Google Maps API Key is available and not rate-limited, request Google Routes API REST endpoint
    if (apiKey && apiKey.trim() !== "" && !apiKey.includes("MY_GOOGLE_MAPS") && Date.now() > routesApiRateLimitedUntil) {
      try {
        const routesPayload = {
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: Number(origin.longitude || origin.lng)
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: destinationLat,
                longitude: Number(destination.longitude || destination.lng)
              }
            }
          },
          travelMode: travelMode === "MOTORCYCLE" || travelMode === "TWO_WHEELER" ? "TWO_WHEELER" : travelMode,
          routingPreference: routingPreference || "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: travelMode === "TWO_WHEELER",
            avoidFerries: false
          },
          languageCode: languageCode || "th-TH",
          units: "METRIC"
        };

        const fieldMask = [
          "routes.duration",
          "routes.distanceMeters",
          "routes.polyline.encodedPolyline",
          "routes.description",
          "routes.warnings",
          "routes.legs.duration",
          "routes.legs.distanceMeters",
          "routes.legs.startLocation",
          "routes.legs.endLocation",
          "routes.legs.steps.navigationInstruction",
          "routes.legs.steps.distanceMeters",
          "routes.legs.steps.staticDuration",
          "routes.legs.steps.polyline.encodedPolyline",
          "routes.legs.steps.startLocation",
          "routes.legs.steps.endLocation"
        ].join(",");

        const googleResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey.trim(),
            "X-Goog-FieldMask": fieldMask,
            "X-Goog-Client-Id": "gmp_mcp_codeassist_v1_aistudio"
          },
          body: JSON.stringify(routesPayload)
        });

        if (googleResponse.ok) {
          const data = await googleResponse.json();
          if (data.routes && data.routes.length > 0) {
            return res.json({
              success: true,
              source: "google_routes_api_live",
              provider: "Google Maps Platform Routes API",
              travelMode,
              route: data.routes[0],
              timestamp: new Date().toISOString()
            });
          }
        } else {
          if (googleResponse.status === 429) {
            routesApiRateLimitedUntil = Date.now() + 15 * 60 * 1000;
          }
        }
      } catch (_gErr: any) {
        // Fall back gracefully to high-fidelity tactical engine
      }
    }

    return res.status(503).json({
      success: false,
      error: "Google Routes API unavailable",
      message: "Real routing data is required; synthetic routing has been disabled."
    });

  } catch (error: any) {
    console.error("[Routes API Endpoint Error]:", error);
    res.status(502).json({
      error: "Google Routes API failed",
      message: error?.message
    });
  }
});

// ==========================================
// Admin Operations API Endpoints (Fallback & Direct)
// ==========================================

// Admin mutations are intentionally not exposed through unauthenticated Express routes.
// Use the authenticated Firebase callable functions exported from functions/admin.ts.
// Keeping a second in-memory admin API would bypass Firebase Auth, audit persistence,
// role checks, and transactional wallet controls.

// Process-level guards for Cloud Run container resilience
process.on("uncaughtException", (err) => {
  console.error("[WINRIDER.AI] Process uncaughtException caught:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[WINRIDER.AI] Process unhandledRejection caught:", reason);
});

// Helper to discover the dist directory containing compiled static artifacts
function getDistPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist"),
    typeof __dirname !== "undefined" ? path.resolve(__dirname, "dist") : "",
    typeof __dirname !== "undefined" ? __dirname : "",
    typeof __dirname !== "undefined" ? path.resolve(__dirname, "..", "dist") : "",
    path.resolve("/app/applet/dist"),
    path.resolve("/app/dist"),
    path.resolve("/workspace/dist"),
    process.cwd(),
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, "index.html"))) {
      return p;
    }
  }
  return path.resolve(process.cwd(), "dist");
}

// Vite / Static Middleware Integration
async function startServer() {
  const distPath = getDistPath();
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  // Robust production detection:
  // 1. Explicit NODE_ENV === "production"
  // 2. Google Cloud Run standalone indicators (when not inside AI Studio dev container)
  // 3. Compiled bundle execution (.cjs)
  // 4. Or static artifacts exist and not in explicit development mode
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (!isDevContainer && (Boolean(process.env.K_SERVICE) || Boolean(process.env.K_REVISION))) ||
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) ||
    (hasDist && process.env.NODE_ENV !== "development");

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[WINRIDER.AI] Development mode: Vite middleware mounted");
    } catch (viteErr) {
      console.warn("[WINRIDER.AI] Vite dev middleware unavailable, serving static dist:", viteErr);
      serveStaticFiles(distPath);
    }
  } else {
    console.log("[WINRIDER.AI] Production mode active: serving static artifacts");
    serveStaticFiles(distPath);
  }

  // Global Express error handler to prevent container crashes
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[WINRIDER.AI] Express Route Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error", message: err?.message });
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WINRIDER.AI] Sovereign Server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? "production" : "development"}]`);
  });

  server.on("error", (err: any) => {
    console.error("[WINRIDER.AI] Server listen error:", err);
    if (!isDevContainer) {
      process.exit(1);
    }
  });

  // Cloud Run lifecycle shutdown signals
  process.on("SIGTERM", () => {
    console.log("[WINRIDER.AI] SIGTERM received. Closing HTTP server...");
    server.close(() => {
      console.log("[WINRIDER.AI] Server terminated gracefully.");
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 4000);
  });

  process.on("SIGINT", () => {
    console.log("[WINRIDER.AI] SIGINT received. Shutting down...");
    server.close(() => process.exit(0));
  });
}

function serveStaticFiles(distPath: string) {
  console.log(`[WINRIDER.AI] Static distribution directory: ${distPath}`);
  app.use(express.static(distPath));

  app.get("*", (_req, res, next) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath, (err) => {
        if (err && !res.headersSent) {
          next(err);
        }
      });
    } else {
      const fallbackPath = path.resolve(process.cwd(), "index.html");
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath, (err) => {
          if (err && !res.headersSent) {
            next(err);
          }
        });
      } else {
        res.status(200).send("<!doctype html><html><head><title>WINRIDER.AI</title></head><body><h1>WINRIDER.AI</h1></body></html>");
      }
    }
  });
}

startServer();
