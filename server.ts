import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", empire: "WINRIDER.AI", timestamp: new Date().toISOString() });
});

// In-memory active orders store for cross-device & cross-tab sync
interface ServerOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceIconEmoji: string;
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fare: number;
  welfareFund2Baht: number;
  netFare: number;
  estMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  driverName?: string;
  driverLevel?: number;
  driverPhone?: string;
  driverPlate?: string;
  driverAvatarEmoji?: string;
  driverVehicle?: string;
  tipAmount?: number;
}

let activeOrders: ServerOrder[] = [
  {
    id: "WIN-7782",
    serviceId: "knight",
    serviceTitle: "WIN KNIGHT (หลบรถติดซอยสุขุมวิท)",
    serviceIconEmoji: "🛵",
    passengerName: "คุณอารียา สุขสวัสดิ์",
    passengerPhone: "089-445-1234",
    pickupLocation: "ซอยสุขุมวิท 23 (แยก 4)",
    dropoffLocation: "อาคาร Exchange Tower BTS อโศก",
    distanceKm: 2.4,
    fare: 45,
    welfareFund2Baht: 2.0,
    netFare: 43,
    estMinutes: 7,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Orders API
app.get("/api/orders", (_req, res) => {
  res.json({ orders: activeOrders });
});

app.post("/api/orders", (req, res) => {
  const newOrder = req.body as ServerOrder;
  if (!newOrder || !newOrder.id) {
    return res.status(400).json({ error: "Invalid order data" });
  }
  activeOrders.unshift(newOrder);
  if (activeOrders.length > 50) activeOrders.pop();
  res.json({ success: true, order: newOrder });
});

app.post("/api/orders/:id/accept", (req, res) => {
  const { id } = req.params;
  const driverInfo = req.body;
  const order = activeOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  order.status = "accepted";
  order.updatedAt = new Date().toISOString();
  order.driverName = driverInfo.driverName || "พี่สมศักดิ์ ไนท์สายฟ้า";
  order.driverLevel = driverInfo.driverLevel || 100;
  order.driverPhone = driverInfo.driverPhone || "081-998-3344";
  order.driverPlate = driverInfo.driverPlate || "1กข 7789 กทม.";
  order.driverAvatarEmoji = driverInfo.driverAvatarEmoji || "🦁";
  res.json({ success: true, order });
});

app.post("/api/orders/:id/step", (req, res) => {
  const { id } = req.params;
  const { status, tipAmount } = req.body;
  const order = activeOrders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  if (status) order.status = status;
  if (tipAmount !== undefined) order.tipAmount = tipAmount;
  order.updatedAt = new Date().toISOString();
  res.json({ success: true, order });
});

// Low-Code Webhook Dispatch Proxy (bypasses browser CORS for Make.com / Zapier / Google Sheets)
app.post("/api/webhooks/dispatch", async (req, res) => {
  try {
    const { webhookUrl, event, payload } = req.body;
    if (!webhookUrl) {
      return res.json({
        success: true,
        simulated: true,
        message: "No Webhook URL provided. Simulated dispatch succeeded."
      });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(webhookUrl, {
      method: "POST",
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
      error: err?.message || "Webhook dispatch failed",
      simulatedFallback: true
    });
  }
});

// LINE Notify Proxy Endpoint
app.post("/api/notifications/line", async (req, res) => {
  try {
    const { message, token } = req.body;
    if (!token) {
      return res.status(400).json({ status: "error", message: "Missing LINE Notify Token" });
    }

    const params = new URLSearchParams();
    params.append("message", message || "WINRIDER.AI notification alert");

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

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WINRIDER.AI] Sovereign Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
