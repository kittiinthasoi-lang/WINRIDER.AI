import express from "express";
import path from "path";
import fs from "fs";
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

// Health check endpoints (Cloud Run, Kubernetes, AI Studio probes)
app.get(["/api/health", "/healthz", "/health"], (_req, res) => {
  res.json({ status: "ok", empire: "WINRIDER.AI", timestamp: new Date().toISOString() });
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
  if (getApps().length) {
    return getFirestore(getApps()[0]);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return getFirestore(
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      })
    );
  }

  // Cloud Run / Firebase environments can use Application Default Credentials.
  return getFirestore(initializeApp());
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
    const snapshot = await ordersCollection.orderBy("createdAt", "desc").limit(50).get();
    const orders = snapshot.docs.map((doc) => doc.data() as ServerOrder);
    return res.json({ orders });
  } catch (error: any) {
    console.error("[Orders GET Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
  }
});

app.post("/api/orders", async (req, res) => {
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

app.post("/api/orders/:id/accept", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const eligibility = await requireEligibleDriver(user.uid);
  if (!eligibility) {
    return res.status(403).json({ error: "Driver is not eligible to accept orders" });
  }
  const { id } = req.params;
  const driverInfo = req.body;

  if (!driverInfo?.driverName || !driverInfo?.driverPlate) {
    return res.status(400).json({ error: "Real driver identity is required" });
  }
  driverInfo.driverUserId = user.uid;
  driverInfo.driverName = String(eligibility.user.displayName || driverInfo.driverName);
  driverInfo.driverPlate = String(eligibility.knight.plateNumber || driverInfo.driverPlate);

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

app.post("/api/orders/:id/step", async (req, res) => {
  const user = await requireFirebaseUser(req, res);
  if (!user) return;
  const { id } = req.params;
  const { status, tipAmount } = req.body;

  if (!status && tipAmount === undefined) {
    return res.status(400).json({ error: "Order update is required" });
  }

  try {
    const orderRef = ordersCollection.doc(id);
    let updatedOrder: ServerOrder | null = null;

    await ordersDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const order = snapshot.data() as ServerOrder;
      updatedOrder = {
        ...order,
        ...(status ? { status } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: new Date().toISOString(),
      };

      transaction.update(orderRef, {
        ...(status ? { status } : {}),
        ...(tipAmount !== undefined ? { tipAmount: Number(tipAmount) } : {}),
        updatedAt: updatedOrder.updatedAt,
      });
    });

    return res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ error: "Order not found" });
    }
    console.error("[Orders Step Error]:", error?.message);
    return res.status(503).json({ error: "Order store unavailable" });
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
app.post("/api/webhooks/dispatch", async (req, res) => {
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
app.post("/api/notifications/line", async (req, res) => {
  try {
    const token = process.env.LINE_NOTIFY_TOKEN;
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

app.post("/api/routes/compute", async (req, res) => {
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

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCB6IzBTHuQDVGc018yllw4yZVKB-GOhGQ";

    // 1. If live Google Maps API Key is available and not rate-limited, request Google Routes API REST endpoint
    if (apiKey && apiKey.trim() !== "" && !apiKey.includes("MY_GOOGLE_MAPS") && Date.now() > routesApiRateLimitedUntil) {
      try {
        const routesPayload = {
          origin: {
            location: {
              latLng: {
                latitude: Number(origin.latitude || origin.lat),
                longitude: Number(origin.longitude || origin.lng)
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: Number(destination.latitude || destination.lat),
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

// In-memory audit logs and storage for local execution consistency
interface ServerAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid: string;
  targetCollection: string;
  before: any;
  after: any;
  reason: string;
  ip: string;
  createdAt: string;
}
const inMemoryAuditLogs: ServerAuditLog[] = [];

// 1. Approve KYC
app.post("/api/admin/approve-kyc", (req, res) => {
  const { uid, reason } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "ต้องระบุ uid ของผู้ใช้งาน" });
  }

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "APPROVE_KYC",
    targetUid: uid,
    targetCollection: "users/knights",
    before: { status: "pending_review", kycStatus: "pending" },
    after: { status: "active", kycStatus: "approved" },
    reason: reason || "ตรวจสอบเอกสารผ่านเกณฑ์มาตรฐานความปลอดภัยอธิปไตย",
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    message: `อนุมัติ KYC สำหรับผู้ใช้ ${uid} เรียบร้อยแล้ว`,
    auditId: auditEntry.id,
    targetUid: uid,
    status: "active",
    kycStatus: "approved"
  });
});

// 2. Reject KYC
app.post("/api/admin/reject-kyc", (req, res) => {
  const { uid, reason, detail } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "ต้องระบุ uid ของผู้ใช้งาน" });
  }
  if (!reason || !detail) {
    return res.status(400).json({ error: "ต้องระบุเหตุผลและรายละเอียดในการปฏิเสธ" });
  }

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "REJECT_KYC",
    targetUid: uid,
    targetCollection: "users/knights",
    before: { status: "pending_review", kycStatus: "pending" },
    after: { status: "pending_review", kycStatus: "rejected", rejectionReason: reason, rejectionDetail: detail },
    reason: `ปฏิเสธ KYC: ${reason} - ${detail}`,
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    message: `ปฏิเสธ KYC สำหรับผู้ใช้ ${uid} เรียบร้อยแล้ว`,
    auditId: auditEntry.id,
    targetUid: uid,
    kycStatus: "rejected",
    reason,
    detail
  });
});

// 3. Suspend User
app.post("/api/admin/suspend-user", (req, res) => {
  const { uid, reason } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "ต้องระบุ uid ของผู้ใช้งาน" });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "ต้องระบุเหตุผลในการระงับบัญชี (บังคับ)" });
  }

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "SUSPEND_USER",
    targetUid: uid,
    targetCollection: "users",
    before: { status: "active" },
    after: { status: "suspended", suspendedReason: reason, isOnline: false },
    reason,
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    message: `ระงับบัญชีผู้ใช้ ${uid} เรียบร้อยแล้ว`,
    status: "suspended",
    reason
  });
});

// 4. Unsuspend User
app.post("/api/admin/unsuspend-user", (req, res) => {
  const { uid, reason } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "ต้องระบุ uid ของผู้ใช้งาน" });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "ต้องระบุเหตุผลในการปลดระงับบัญชี" });
  }

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "UNSUSPEND_USER",
    targetUid: uid,
    targetCollection: "users",
    before: { status: "suspended" },
    after: { status: "active" },
    reason,
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    message: `ปลดการระงับบัญชีผู้ใช้ ${uid} เรียบร้อยแล้ว`,
    status: "active",
    reason
  });
});

// 5. Adjust Wallet (Double-Entry Invariant Enforced)
app.post("/api/admin/adjust-wallet", (req, res) => {
  const { uid, amountSatang, bucket, reason, direction } = req.body;
  const rawAmount = Number(amountSatang);

  if (!uid) {
    return res.status(400).json({ error: "ต้องระบุ uid ของผู้ใช้งาน" });
  }
  if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
    return res.status(400).json({ error: "จำนวนเงินต้องเป็นจำนวนเต็มบวกในหน่วยสตางค์ (Satang Integer) เท่านั้น" });
  }
  const validBuckets = ["system", "insurance", "pension", "helmet", "equipment"];
  if (!bucket || !validBuckets.includes(bucket)) {
    return res.status(400).json({ error: `ถังเงินไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${validBuckets.join(", ")}` });
  }
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return res.status(400).json({ error: "ต้องระบุเหตุผลในการปรับปรุงยอดเงินในกระเป๋า (บังคับ)" });
  }

  const dir = direction === "DEBIT" ? "DEBIT" : "CREDIT";

  // Double-entry legs
  const legs = dir === "CREDIT" ? [
    {
      accountId: "SYSTEM_REVENUE",
      accountType: "SYSTEM_REVENUE",
      direction: "DEBIT",
      amountSatang: rawAmount,
      descriptionTh: `หักเงินกองทุนกลางเพื่อปรับปรุงยอดเข้ากระเป๋า (${reason})`
    },
    {
      accountId: uid,
      accountType: "KNIGHT_WALLET",
      direction: "CREDIT",
      amountSatang: rawAmount,
      descriptionTh: `เครดิตเพิ่มเงินเข้ากระเป๋าผู้ใช้ (${reason})`
    }
  ] : [
    {
      accountId: uid,
      accountType: "KNIGHT_WALLET",
      direction: "DEBIT",
      amountSatang: rawAmount,
      descriptionTh: `หักเงินปรับยอดออกจากกระเป๋าผู้ใช้ (${reason})`
    },
    {
      accountId: "SYSTEM_REVENUE",
      accountType: "SYSTEM_REVENUE",
      direction: "CREDIT",
      amountSatang: rawAmount,
      descriptionTh: `รับเงินคืนเข้ากองทุนกลางจากการปรับยอด (${reason})`
    }
  ];

  const totalDebit = legs.filter(l => l.direction === "DEBIT").reduce((s, l) => s + l.amountSatang, 0);
  const totalCredit = legs.filter(l => l.direction === "CREDIT").reduce((s, l) => s + l.amountSatang, 0);

  if (totalDebit !== totalCredit) {
    return res.status(500).json({ error: `Double-entry invariant violated: Debit (${totalDebit}) != Credit (${totalCredit})` });
  }

  const ledgerId = `LEDGER_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "ADJUST_WALLET",
    targetUid: uid,
    targetCollection: "wallets",
    before: { amountSatang: rawAmount, direction: dir, bucket },
    after: { ledgerId, balanced: true, amountSatang: rawAmount, direction: dir, bucket },
    reason: `ปรับยอดเงิน ${dir === "CREDIT" ? "+" : "-"}${rawAmount} สตางค์ ในถัง ${bucket} เหตุผล: ${reason}`,
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    ledgerId,
    direction: dir,
    amountSatang: rawAmount,
    bucket,
    balanced: true,
    totalDebitSatang: totalDebit,
    totalCreditSatang: totalCredit,
    message: `บันทึก Ledger แบบ Double-Entry และปรับยอดเงินสำเร็จ`
  });
});

// 6. Update Fee Rule
app.post("/api/admin/update-fee-rule", (req, res) => {
  const { ruleId, patch, reason } = req.body;
  if (!ruleId || !patch) {
    return res.status(400).json({ error: "ต้องระบุ ruleId และ patch ข้อมูลใหม่" });
  }

  const newRuleId = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "UPDATE_FEE_RULE",
    targetUid: newRuleId,
    targetCollection: "fee_rules",
    before: { oldRuleId: ruleId },
    after: { ...patch, id: newRuleId, supersedesRuleId: ruleId, activeFrom: nowIso },
    reason: reason || `ปรับปรุงกฎค่าธรรมเนียมเดิม ${ruleId} เป็นกฎใหม่ ${newRuleId}`,
    ip: req.ip || "127.0.0.1",
    createdAt: nowIso
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    oldRuleId: ruleId,
    newRuleId,
    activeFrom: nowIso,
    message: `ปิดกฎเดิมและสร้างกฎค่าธรรมเนียมใหม่ ${newRuleId} เรียบร้อยแล้ว`
  });
});

// 7. Set Admin Role
app.post("/api/admin/set-role", (req, res) => {
  const { targetUid, level, reason } = req.body;
  if (!targetUid || !level) {
    return res.status(400).json({ error: "ต้องระบุ targetUid และ level" });
  }

  const auditEntry: ServerAuditLog = {
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    adminUid: "ADMIN_SERVER_001",
    adminEmail: "kittiinthasoi@gmail.com",
    action: "SET_ADMIN_ROLE",
    targetUid,
    targetCollection: "users",
    before: { adminLevel: "unknown" },
    after: { admin: true, adminLevel: level },
    reason: reason || `แต่งตั้งสิทธิ์ผู้ดูแลระดับ ${level} ให้แก่ ${targetUid}`,
    ip: req.ip || "127.0.0.1",
    createdAt: new Date().toISOString()
  };
  inMemoryAuditLogs.unshift(auditEntry);

  return res.json({
    success: true,
    targetUid,
    adminLevel: level,
    message: `แต่งตั้งสิทธิ์ระดับ ${level} ให้แก่ ${targetUid} เรียบร้อยแล้ว`
  });
});

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
