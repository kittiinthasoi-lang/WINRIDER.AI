# 🛡️ WINRIDER.AI

**Thailand is Home 🇹🇭 — รับหน้าบ้าน**

WINRIDER.AI เป็นเว็บแอป Mobility / Super App ที่รวมงานรับส่งผู้โดยสาร งานส่งพัสดุ บริการเฉพาะทาง ระบบแผนที่ การชำระเงิน กระเป๋าเงิน และเครื่องมือ AI/การจัดการไว้ในแพลตฟอร์มเดียว

> เอกสารนี้อธิบายสถานะของ repository ตามโค้ดที่มีอยู่จริง ไม่ใช่ roadmap หรือโครงสร้างสมมติ

## สถานะสำคัญ

ระบบ dispatch ใน production mode ใช้ **คำสั่งงานจริงจากผู้โดยสาร** เป็นแหล่งกำเนิดงาน

- ไม่มีการสร้างงานผู้โดยสารปลอมเพื่อให้พี่วินรับงาน
- ไม่มี fallback ที่สร้างตัวตนพี่วินปลอมตอนรับงาน
- การรับงานต้องอ้างอิง order ที่มีอยู่จริง
- ข้อมูลพี่วินที่ส่งไปยังระบบต้องมาจาก session/account ของพี่วิน
- การ sync ระหว่างหน้าจอใช้ order event และ Firestore/server ตาม implementation ปัจจุบัน
- ฟังก์ชัน/หน้าจอที่เป็น testing simulator บางส่วนยังอาจมีอยู่ใน repository แต่ไม่ถูกใช้เป็นกลไก dispatch production

## Free Thai Public Data Layer

WINRIDER.AI includes a **WIN Public Data Hub** for carefully selected public Thai datasets. The current production sources include the Tourism Authority of Thailand (TAT) Data Catalog for tourism activities, attractions, restaurants, accommodations, and souvenir shops. Source records are staged as `pending_admin_review` and are **never customer-visible until an administrator verifies them**. The app does not use PredictHQ or Google Places/Routes runtime APIs for this layer.

The Thai government open-data portal `data.go.th` is tracked as an additional source for future curated integrations such as public health, safety, air quality, transport, and city data; datasets are added only when their schema, freshness, license, and relevance are verified.

## Architecture

```text
React 19 + Vite
       │
       ├── UI / Customer / Driver / Admin
       │
       ├── Firebase Auth / Firestore
       │
       ├── Express server.ts
       │     ├── Orders API
       │     ├── GPS / Public Data endpoints
       │     ├── External AI handoff
       │     └── Webhook / Notification endpoints
       │
       └── Firebase Functions
             ├── wallet / ledger
             ├── KYC / admin
             ├── trip settlement
             └── backend business logic
```

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite 6
- **Styling:** Tailwind CSS 4
- **Backend:** Node.js 20+, Express 4
- **Database/Auth:** Firebase / Firestore / Firebase Authentication
- **Serverless:** Firebase Functions
- **Maps/Places:** WIN Public Data + OpenStreetMap-compatible public data; no paid Maps/Places/Routes API key is required. Turn-by-turn navigation opens externally.
- **AI:** External AI handoff. WINRIDER prepares/copies prompts and lets the user open the AI service directly; no AI-provider API key is required by WINRIDER.
- **Charts/UI:** Recharts, Lucide React, Motion
- **PWA:** vite-plugin-pwa
- **Tests:** Node test runner ผ่าน `tsx`

## Repository Structure

```text
WINRIDER.AI/
├── src/
│   ├── components/       # UI และ feature screens
│   ├── core/             # business logic และ unit tests
│   ├── services/         # service integrations
│   ├── adapters/         # provider adapters
│   ├── hooks/            # React hooks
│   ├── utils/            # dispatch, notifications, integrations
│   ├── data/             # domain/reference data
│   └── types/            # TypeScript types
├── functions/             # Firebase Functions
├── server.ts              # Express application/server + GPS/Public Data endpoints
├── scripts/               # build/generation scripts
├── public/                # static assets
├── package.json
└── README.md
```

## Real Dispatch Flow

```text
Passenger
   │
   │ createLiveOrder()
   ▼
Firestore / server order
   │
   │ status = pending
   ▼
Live dispatch event
   │
   ▼
Online verified WINRIDER
   │
   │ accepts the existing order
   ▼
status = accepted
   │
   ▼
heading_pickup
   │
   ▼
picked_up
   │
   ▼
in_transit
   │
   ▼
completed
```

หากไม่มี order จริง ระบบจะ **ไม่สร้างงานขึ้นมาเอง** เพื่อสาธิตการรับงาน

## Financial Core

ระบบมี financial engine แบบ integer satang และ double-entry ledger

แนวคิดที่มี test รองรับ ได้แก่:

- Tiered Knight fee
- Founding Knight fee
- Equipment contribution
- Citizen fee buckets
- Merchant GP
- Debit/Credit balance invariant
- Idempotency
- Wallet available-balance constraints

ชุดทดสอบหลักอยู่ใน:

```text
src/core/feeEngine.test.ts
src/core/walletDoubleEntry.test.ts
```

## Admin / Security

Firebase Functions รองรับงาน เช่น:

- KYC approval / rejection
- User suspension / unsuspension
- Wallet adjustment
- Fee rule versioning
- Admin role management
- Audit logging

Admin levels ที่มีในโค้ด:

```text
super
reviewer
support
```

สิทธิ์จริงต้องตรวจที่ backend/Firebase Functions ไม่ควรพึ่ง UI อย่างเดียว

## AI

WIN-AI และ WIN Buddy ใช้ **External AI Handoff**:
- WINRIDER เตรียม prompt จากสิ่งที่ผู้ใช้พิมพ์
- ไม่ส่ง prompt หรือรูปไป AI provider อัตโนมัติ
- ไม่มี `GEMINI_API_KEY` / OpenAI provider key ในระบบ
- ผู้ใช้เลือกเปิด ChatGPT, Gemini หรือ Copilot ภายนอกด้วยตนเอง

## Maps / Live Location

WINRIDER ใช้ GPS จริงและข้อมูลสาธารณะโดยไม่ฝัง paid map provider:
- ทริปใช้จอ A/B/C: A = พี่วิน, B = ลูกค้า/จุดรับ, C = ปลายทาง
- ตำแหน่งสดซิงก์ผ่าน order backend ของ WINRIDER
- ระยะทางในแอปเป็นค่าประมาณจากพิกัด
- Radar / WIN Pet Care / ศูนย์พยาบาลใช้ WIN Public Data + OpenStreetMap contributors
- Turn-by-turn, traffic และเส้นทางถนนเปิดใน Google Maps / Apple Maps / Waze ภายนอก
- ไม่มี `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` หรือ Routes/Places paid API ใน runtime

## Environment Variables

Secrets/config ที่ยังจำเป็นต้องเก็บผ่าน environment / secret management ได้แก่ Firebase, payment provider และ internal scheduler configuration. `VITE_FIREBASE_API_KEY` ยังคงเป็น Firebase Web config ที่จำเป็นสำหรับ Authentication/Firestore; ไม่ใช่ Maps/AI provider key.

## Development

ต้องใช้ Node.js 20 ขึ้นไป

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

Type check:

```bash
npm run lint
```

Tests:

```bash
npm test
```

## Production Notes

ก่อน production deployment ควรตรวจเพิ่มเติม:

1. Secret/API key exposure
2. Firestore security rules
3. Firebase Authentication claims
4. Webhook SSRF protection / domain allowlist
5. Rate limiting
6. Persistent order consistency across multiple server instances
7. Payment verification with a real payment provider
8. Real GPS / routing availability
9. Monitoring and audit logs
10. Legal and regulatory requirements for mobility services in Thailand

## Testing / Simulation Policy

Repository นี้เคยมี component และ data สำหรับ demo/testing หลายส่วน

ตั้งแต่ production dispatch flow นี้เป็นต้นไป:

**ห้ามใช้ simulated passenger / simulated driver / fake order เพื่อเปลี่ยนสถานะงานจริง**

ถ้าต้องการทดสอบระบบ ควรใช้ test environment หรือ automated tests ที่แยกจาก production data

## License

Repository ใช้ proprietary `LICENSE` และ `package.json` ระบุ `UNLICENSED`

---

## 🇹🇭 WINRIDER.AI

**Thailand is Home**

**รับหน้าบ้าน — Mobility ที่สร้างจากข้อมูลจริง การเดินทางจริง และผู้ให้บริการจริง**
