# 🛡️ WINRIDER.AI

**Thailand is Home 🇹🇭 — รับหน้าบ้าน**

WINRIDER.AI คือ Mobility / Local Service Super App สำหรับผู้โดยสาร พี่วิน ร้านค้า องค์กรพาร์ทเนอร์ และผู้ดูแลระบบ โดยยึดหลักว่า **ข้อมูลปฏิบัติการต้องมาจากผู้ใช้จริง งานจริง และ GPS จริง** ไม่สร้างงานจำลองขึ้นมาให้ระบบดูเหมือนมีผู้ใช้งาน

> README นี้อธิบายสถานะของโค้ดที่อยู่ใน `main` ปัจจุบัน ไม่ใช่ roadmap และไม่ถือว่า feature ที่ยังไม่ผ่าน production-like verification พร้อมเปิดใช้งานจริงโดยอัตโนมัติ

## สถานะปัจจุบัน

ระบบอยู่ในระดับ **พร้อมทดสอบแบบ controlled staging / production-like** แต่ยังไม่ควรประกาศว่า production-ready 100% จนกว่าจะผ่าน release gates ที่เหลือใน `docs/PRODUCTION_READINESS.md`

สิ่งที่ repository ตรวจผ่านด้วย CI แล้วครอบคลุม TypeScript, unit tests, integration tests, production build, Cloud Functions build, dependency audit และ secret scan ส่วนการทดสอบที่ยังต้องทำกับ environment จริง เช่น authenticated ride E2E, concurrent load, mobile/background GPS, reconnect, manual top-up/withdrawal reconciliation, backup/restore, monitoring และ independent security review

## บทบาทผู้ใช้

บัญชีหลักของระบบแบ่งเป็น 4 บทบาท:

| Role | ชื่อในแอป | หน้าที่หลัก |
| --- | --- | --- |
| `citizen` | พลเมืองอัศวิน | ผู้โดยสาร / ผู้ใช้บริการ |
| `knight` | อัศวินไรเดอร์ | พี่วิน / ผู้ให้บริการเดินทาง |
| `merchant` | ร้านค้าพันธมิตร | ร้านค้าและผู้ขาย |
| `partner` | องค์กรพาร์ทเนอร์ | องค์กร / B2B / บริการพันธมิตร |

บัญชีใหม่ทุกบทบาท (`citizen`, `knight`, `merchant`, `partner`) เริ่มที่สถานะ `pending_review` และต้องให้ Super Admin อนุมัติก่อนเข้าใช้งานจริง

ระบบยังมี **Owner / Super Admin** ซึ่งสามารถเข้าศูนย์ Admin และสลับมุมมอง Customer / Driver / Merchant / Partner จากบัญชีเจ้าของเดียวกันตามสิทธิ์ที่ backend อนุญาต

## App Modes

โหมดหลักที่มีในโค้ดปัจจุบัน:

- `passenger` — แอปผู้โดยสาร
- `driver` — แอปพี่วิน
- `merchant` — ศูนย์ร้านค้า
- `partner` — ศูนย์องค์กรพาร์ทเนอร์
- `market` — WIN Street Market
- `hospital` — Emergency / Hospital Command Center
- `codex` — WINRIDER Codex
- `admin` — Admin Command Center

Passenger มีแท็บ `home`, `dreamRide`, `petCare`, `ride`, `shop`, `profile`

## Ride / Dispatch จริง

Production dispatch ใช้ order จริงจากผู้โดยสารเท่านั้น

```text
Citizen
  │
  │ สร้าง order จริง
  ▼
WINRIDER Server / Firestore
  │
  │ status = pending
  ▼
Dispatch ไปยัง Knight ที่มีสิทธิ์และ online
  │
  │ Knight รับงาน
  ▼
accepted
  ▼
heading_pickup
  ▼
picked_up
  ▼
in_transit
  ▼
completed
```

หลักสำคัญ:

- ไม่มี fake passenger / fake driver / fake order เพื่อทำให้หน้ารับงานดูมีงาน
- การรับงานต้องอ้างอิง order ที่มีอยู่จริง
- Server เป็นผู้ควบคุม state transition ของทริป
- การรับงานใช้ transactional acceptance เพื่อป้องกันพี่วินหลายคนรับงานเดียวกัน
- มี idempotency สำหรับ mutation สำคัญ
- มี GPS authorization, stale-driver cutoff และ outlier rejection
- การทดสอบจำลองอนุญาตเฉพาะ test harness ที่แยกจากข้อมูล production

## Live Location A / B / C

WINRIDER ไม่ฝัง paid map provider ในหน้าทริปหลัก

จอ Live Location ใช้:

- **A = พี่วิน**
- **B = ลูกค้า / จุดรับ**
- **C = ปลายทาง**

ตำแหน่งสดถูก sync ผ่าน backend ของ order และ endpoint อ่านตำแหน่งถูกจำกัดให้ผู้โดยสารหรือพี่วินที่อยู่ในทริปนั้น

ระยะทางในแอปเป็น **ค่าประมาณจากพิกัด** ไม่ใช่ระยะทางถนนจริงและไม่ใช่ traffic ETA

เมื่อต้องการ turn-by-turn navigation แอปจะเปิดภายนอก เช่น:

- Google Maps
- Apple Maps
- Waze

ดังนั้น runtime ปัจจุบันไม่ต้องใช้ Google Maps / Places / Routes API key

## WIN Public Radar

Radar ใช้ GPS จริงของผู้ใช้เป็นจุดศูนย์กลาง และดึงสถานที่ใกล้เคียงจาก:

- WIN Public Data
- OpenStreetMap-compatible public data

กลุ่มข้อมูลที่แสดงได้ เช่น ร้านค้า ร้านอาหาร คาเฟ่ ตลาด จุดขนส่ง สถานศึกษา โรงพยาบาล คลินิก ศาสนสถาน โรงแรม และสถานที่ท่องเที่ยวตามข้อมูลสาธารณะที่หาได้จริง

ระยะทางที่แสดงเป็นระยะเส้นตรงอ้างอิง และการนำทางเต็มรูปแบบเปิดในแอปแผนที่ภายนอก

## WIN Pet Care

WIN Pet Care ใช้ GPS จริงเพื่อค้นหาสถานพยาบาลสัตว์ใกล้เคียงจากข้อมูลสาธารณะ

Flow หลัก:

```text
GPS ผู้ใช้
  → /api/pet-care/nearby
  → รายชื่อคลินิก/โรงพยาบาลสัตว์จริง
  → เลือกสถานที่
  → ใช้เป็นปลายทางสำหรับการเดินทาง / เปิดแผนที่ภายนอก
```

ระบบไม่สร้าง rating, จำนวนรีวิว, เวลาเปิด หรือ ETA ปลอม หากแหล่งข้อมูลไม่มีค่าเหล่านั้น

## Emergency / Hospital Command Center

ศูนย์ฉุกเฉินใช้ GPS จริงและ public data เพื่อแสดงสถานที่ใกล้เคียง เช่น:

- โรงพยาบาล / คลินิก
- สถานีตำรวจ
- สถานีดับเพลิง

มีทางลัดหมายเลขฉุกเฉิน และลิงก์นำทางภายนอก

หน้าจอนี้เป็น **directory / command interface** เท่านั้น ไม่กล่าวอ้างว่ามีหน่วยฉุกเฉินกำลังเดินทาง หากไม่มีเหตุการณ์ตอบรับจริงจากระบบ

## WIN Alert

WIN Alert แสดง event/public activity จาก source-driven public data ที่ผ่านกติกาของระบบ

ความสามารถปัจจุบัน:

- กรองตามวัน
- ใช้ GPS จริงเพื่อคำนวณระยะเส้นตรงและเรียงใกล้ก่อน
- เก็บ source attribution
- เปิด source / แผนที่ภายนอก
- เลือก event เป็นปลายทางเรียกรถได้
- TAT/public-data sync ใช้ internal sync secret ไม่ใช่ paid event API key

`WIN_ALERT_INTERNAL_SYNC_SECRET` เป็นรหัสภายในเพียงตัวเดียวที่ WINRIDER ใช้ป้องกัน endpoint สำหรับ scheduled public-data/WIN Alert sync

## WIN Shop / Street Market

ระบบ Commerce มี:

- WIN Shop directory
- Merchant profile
- Partner profile
- WIN Street Market
- publish / unpublish listing แบบ owner-authorized
- audit trail สำหรับการเปลี่ยนสถานะสำคัญ

Customer/Driver สามารถดู profile ฝั่ง Merchant/Partner ผ่าน customer-facing view โดยไม่มีสิทธิ์แก้ข้อมูลของเจ้าของร้านหรือองค์กร

ส่วน lifecycle เต็มของ order / stock / promotion ยังต้องผ่าน production-like audit ก่อนเปิดใช้งานเชิงพาณิชย์จริง

## Wallet / Payment

Financial core ใช้ integer satang และ double-entry accounting

มี test ครอบคลุมแนวคิดสำคัญ เช่น:

- Tiered Knight fee
- Founding Knight fee
- Citizen fee buckets
- Merchant GP
- wallet debit / credit invariant
- balance protection
- idempotency

Top-up ปัจจุบันใช้แนวทาง:

```text
ผู้ใช้โอนเข้าบัญชีรับเงินที่แอปกำหนด
  → ส่งสลิป
  → Super Admin ตรวจว่ามีเงินเข้าจริง
  → Admin อนุมัติยอด
  → server เครดิต WIN Wallet
```

WINRIDER ไม่ใช้ AI เพื่อยืนยันว่าเงินเข้าแล้วจากรูปสลิปเพียงอย่างเดียว และไม่มี Payment Provider ภายนอกใน flow นี้

## WIN-AI / WIN Buddy

WIN-AI และ WIN Buddy ใช้ **External AI Handoff**

WINRIDER จะ:

1. เตรียม prompt จากข้อมูลที่ผู้ใช้พิมพ์
2. คัดลอก/แสดง prompt ให้ผู้ใช้
3. ให้ผู้ใช้เลือกเปิด ChatGPT, Gemini หรือ Copilot ภายนอก

WINRIDER **ไม่ส่ง prompt หรือรูปไปยัง AI provider อัตโนมัติ** และ runtime ปัจจุบันไม่ต้องใช้ Gemini/OpenAI model API key

## Admin Command Center

Admin UI ปัจจุบันรองรับ:

- ภาพรวมระบบ
- Operations / active rides
- System Health
- KYC review
- User management
- Payment profiles
- Public Data moderation
- Wallet / Ledger
- Top-up review
- Fee rules / GP
- Audit logs
- SOS incident management
- dispatch intervention สำหรับ Super Admin

สิทธิ์สำคัญต้องตรวจที่ backend / Firebase rules / Firebase Functions ไม่พึ่งการซ่อนปุ่มใน UI เพียงอย่างเดียว

## Security Baseline

โครงสร้างปัจจุบันใช้:

- WIN Auth server sessions สำหรับ authentication และ sensitive APIs
- Firestore deny-by-default rules
- server-authoritative ride mutation
- server-controlled wallet / ledger / top-up
- role / status / privilege field protection
- API rate limiting
- distributed Firestore rate buckets สำหรับ mutation สำคัญ
- audit logging
- CI secret scanning
- dependency vulnerability scan

สิ่งที่ยังต้องทำก่อน production เต็มรูปแบบ ได้แก่ edge/WAF rate limiting, independent IDOR/privilege review, recovery drills และ production monitoring

## Architecture

```text
React 19 + Vite + PWA
        │
        ├── Citizen / Knight / Merchant / Partner / Admin UI
        │
        ├── WIN Auth / Firestore / Storage
        │
        ├── Express server.ts
        │     ├── Orders / Dispatch
        │     ├── Live GPS A/B/C
        │     ├── Radar / Pet Care / Emergency
        │     ├── WIN Alert / Public Data
        │     ├── Shop / Market
        │     ├── External AI handoff
        │     └── Admin / Manual top-up APIs
        │
        └── Firebase Functions
              ├── wallet / ledger
              ├── KYC / admin
              ├── trip settlement
              └── backend business logic
```

## Technology Stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Node.js 20+
- Express 4
- WIN Auth / Firestore / Storage
- Firebase Functions
- Recharts / Lucide React / Motion
- vite-plugin-pwa
- Node test runner ผ่าน `tsx`

## Environment Variables

ค่าตัวอย่างอยู่ใน `.env.example`

### Firebase

Frontend ต้องมี Firebase Web config ที่ถูกต้อง โดยเฉพาะ:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`

Backend ใช้:

- `FIREBASE_PROJECT_ID`
- `FIRESTORE_DATABASE_ID`
- `FIREBASE_STORAGE_BUCKET`

เมื่อรัน backend นอก Google-managed environment ต้องมี Firebase Admin credentials ที่เหมาะสม เช่น application default credentials หรือ service-account configuration ที่ code รองรับ

### Owner

- `ADMIN_OWNER_EMAIL`

### Public Data Sync

- `WIN_ALERT_INTERNAL_SYNC_SECRET`

**ห้าม commit secret หรือ service-account private key ลง repository**

## Run Locally

ต้องใช้ Node.js 20 ขึ้นไป

```bash
npm install
npm run dev
```

Server ใช้ `process.env.PORT` ถ้ามี และ fallback เป็น port `3000`

Health check:

```text
/api/health
/health
/healthz
```

Build และ run แบบ production:

```bash
npm run build
npm start
```

## GitHub Codespaces

Repository มี `.devcontainer/devcontainer.json` สำหรับ Codespaces

เมื่อสร้างหรือ rebuild Codespace:

1. dependencies จะถูกติดตั้งอัตโนมัติ
2. WINRIDER dev server จะพยายามเริ่มอัตโนมัติ
3. port `3000` ถูก forward เป็น HTTP service
4. GitHub จะสร้าง HTTPS forwarded URL ให้ภายนอก

สำหรับการทดสอบด้วยมือถืออีกเครื่อง ให้เปลี่ยน Visibility ของ port `3000` จาก **Private → Public**

ถ้าพอร์ตยังไม่ active หลัง Codespace เก่าถูกสร้างมาก่อน config นี้ ให้ใช้ **Rebuild Container** เพื่อให้ devcontainer config ล่าสุดทำงาน

## PWA / Mobile Test

WINRIDER มี PWA manifest และ service worker แบบ auto-update

สำหรับ controlled staging สามารถเปิด HTTPS URL บนมือถือ 2 เครื่อง:

- เครื่องที่ 1: Citizen
- เครื่องที่ 2: Knight

ใช้บัญชี WIN Auth คนละ UID เพื่อทดสอบ dispatch จริง

หลังทดสอบผ่าน browser แล้วสามารถ Add to Home Screen เพื่อทดสอบ standalone PWA ต่อได้

## Tests

```bash
npm run lint
npm test
npm run test:integration
npm run build
```

Production-like harness:

```bash
npm run test:e2e
npm run load:test
```

E2E/load harness ต้องใช้ environment, authenticated tokens และ test fixtures จริงตามไฟล์ใน `scripts/` จึงไม่ควรถือว่าผ่านเพียงเพราะ script มีอยู่ใน repository

## Production Readiness

รายละเอียด release gate อยู่ที่:

`docs/PRODUCTION_READINESS.md`

ก่อนเปิดให้ผู้ใช้ทั่วไปหรือรับเงินจริง ต้องตรวจอย่างน้อย:

- authenticated ride E2E
- concurrent dispatch/load
- persistence ทุกบทบาท
- re-login / reinstall recovery
- mobile background GPS
- offline / reconnect
- navigation/public-data outage UX
- manual top-up / withdrawal reconciliation
- admin role integration tests
- security review
- backup / restore
- monitoring / alerting
- privacy / consent / retention review

## Testing / Simulation Policy

WINRIDER production flow ต้องไม่ใช้:

- simulated passenger
- simulated driver
- fake ride/job
- fabricated operational status
- fabricated public event/place data

Test fixtures สามารถมีได้เฉพาะใน automated test / staging ที่แยกจากข้อมูลใช้งานจริง

## Repository Structure

```text
WINRIDER.AI/
├── .devcontainer/        # Codespaces configuration
├── src/
│   ├── components/       # UI / feature screens
│   ├── core/             # business logic + tests
│   ├── services/         # integrations / client services
│   ├── adapters/
│   ├── hooks/
│   ├── utils/
│   ├── data/
│   └── types/
├── functions/            # Firebase Functions
├── docs/                 # security / readiness / provider docs
├── scripts/              # E2E, load, Codespaces startup
├── public/               # PWA/static assets
├── server.ts             # Express backend + Vite integration
├── firebase.json
├── firestore.rules
├── package.json
└── README.md
```

## License

Repository นี้เป็น proprietary software และ `package.json` ระบุ `UNLICENSED`

---

## 🇹🇭 WINRIDER.AI

**Thailand is Home**

**รับหน้าบ้าน — Mobility ที่สร้างจากข้อมูลจริง การเดินทางจริง และผู้ให้บริการจริง**
