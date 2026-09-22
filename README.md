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
       │     ├── Google Routes proxy
       │     ├── WIN Buddy AI
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
- **Maps:** OSM/coordinate fallback in FREE-ONLY mode; Google Routes/Places/Dynamic Maps are hard-disabled
- **AI:** Google GenAI
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
├── server.ts              # Express application/server (FREE-ONLY external API lock)
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

`server.ts` มี WIN Buddy AI ซึ่งใช้ Google GenAI เมื่อมี `GEMINI_API_KEY` และมี local response engine สำหรับกรณีที่ AI provider ไม่พร้อม

## Maps

ระบบมี integration กับ Google Maps Platform Routes API ผ่าน backend endpoint:

```text
POST /api/routes/compute
```

Frontend ใช้ service:

```text
src/services/googleRoutesService.ts
```

> สำหรับ production navigation ควรใช้ผล route จาก provider จริง และไม่ควรนำข้อมูลจำลองไปตีความเป็นตำแหน่งหรือเส้นทางจริง

## Environment Variables

Secrets ต้องเก็บผ่าน environment / secret management และ **ห้าม commit secret จริงลง repository**

ตัวแปรที่โค้ดอ้างถึง ได้แก่:

```env
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
FIRESTORE_DATABASE_ID=
PORT=
CONTROL_PLANE_PORT=
DEFAULT_APP_PORT=
```

ค่าจริงขึ้นอยู่กับ deployment environment

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

ยังไม่มี license ที่ระบุอย่างเป็นทางการใน repository

---

## 🇹🇭 WINRIDER.AI

**Thailand is Home**

**รับหน้าบ้าน — Mobility ที่สร้างจากข้อมูลจริง การเดินทางจริง และผู้ให้บริการจริง**
