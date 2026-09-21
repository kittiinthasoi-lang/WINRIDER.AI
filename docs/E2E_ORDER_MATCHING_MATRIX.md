# WINRIDER.AI Order & Matching E2E Test Matrix

ใช้เป็น checklist สำหรับทดสอบเส้นทางสร้างออเดอร์ → จับคู่ → รับงาน → วิ่ง → จบงานจริง

| กลุ่มต้องทดสอบ | Flow |
| --- | --- |
| 🚕 เรียกรถทั่วไป | สร้าง → จับคู่ → รับ → วิ่ง → จบ |
| 📦 Express/ส่งของ | สร้าง → จับคู่ → รับ → จบ |
| 🐕 WIN PETCARE | สร้าง → จับคู่พี่วินที่ตรงบริการ → จบ |
| ❤️ WIN Spirit | ตรวจ training → จับคู่ → รับ → จบ |
| 👨‍👩‍👧 WIN FAMILY | ตรวจ training → จับคู่ → รับ → จบ |
| 🧭 Destination/Event | destination → route → fare → order → dispatch |
| 🚨 Emergency/SOS | สร้าง incident/บริการ → dispatch → lifecycle |
| 🏪 Merchant/Partner | order → dispatch → acceptance |
| 👤 Preferred Driver | ระบุพี่วิน → offer → รับ |
| 📍 GPS | stale / offline / กลับมาออนไลน์ |
| 💰 Fare/Wallet | fare → transaction → ledger |
| ⭐ XP/Quest | completed trip → metric → reward |

## Entry points ที่ต้องผ่าน dispatch เดียวกัน

- หน้าหลัก → ค้นหาไลฟ์สไตล์ → เลือกสถานที่ → ระบบจับคู่ → ยืนยัน → สร้าง Order
- หน้าหลัก → Win Alert เราไปส่งได้นะ → เลือกกิจกรรม → ระบบจับคู่ → ยืนยัน → สร้าง Order
- หน้าหลัก → เรียกรถทั่วไป/บริการเฉพาะ → ระบบจับคู่ → ยืนยัน → สร้าง Order
- Preferred Driver → offer แบบระบุพี่วิน → รับงานแบบ transaction
- SOS ไม่เปลี่ยน flow ในงานนี้ และยังคงเชื่อมไปศูนย์พยาบาล & กู้ชีพฉุกเฉินตามเดิม

## Acceptance criteria

1. Client สร้าง order ได้เพียงเมื่อมี Firebase authentication และพิกัดจริง
2. Server เป็น source of truth ของ order/dispatch/acceptance
3. Dispatch เลือกเฉพาะ Knight ที่ active, approved/verified, online, heartbeat ไม่ stale และตรง service requirement
4. Offer มีเวลาหมดอายุและส่งต่อได้
5. Accept ต้องตรวจว่า offer เป็นของ Knight คนที่กดรับ และทำ transaction เดียวกับการล็อก active ride
6. Client ต้องไม่ crash หาก route/GPS/Google Maps ยังไม่พร้อม
7. Polling เป็น fallback สำหรับ sync ไม่ใช่กลไกจับคู่หลัก
8. ทุก service ต้องตรวจ requirement ฝั่ง server อีกครั้งก่อนรับงาน
9. เมื่อ completed ต้องตรวจผลต่อ Wallet/Ledger/XP/Quest
10. ทดสอบซ้ำกรณี offline, stale GPS, offer หมดอายุ, กดรับซ้ำ และพี่วินมีงานอยู่แล้ว

> สถานะในเอกสารนี้เป็น checklist ไม่ใช่ผลการทดสอบ production จริง จนกว่าจะรัน E2E บน deployment พร้อมบัญชีลูกค้าและพี่วินจริง
