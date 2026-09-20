/**
 * set-admin-by-email.js
 * -----------------------------------------------------------------
 * เวอร์ชันที่ง่ายที่สุด — ใส่แค่ "อีเมล" ไม่ต้องไปหา UID เอง
 * สคริปต์จะค้นหา user จากอีเมลแล้วตั้ง admin: true ให้อัตโนมัติ
 *
 * รันใน Google Cloud Shell:
 *   npm install firebase-admin
 *   node set-admin-by-email.js kittiinthasoi@gmail.com
 * -----------------------------------------------------------------
 */

const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("❌ วิธีใช้: node set-admin-by-email.js <email>");
  process.exit(1);
}

admin.initializeApp({
  credential:admin.applicationDefault(),
  
});

async function main() {
  try {
    const user = await getAuth().getUserByEmail(targetEmail);
    console.log(`พบผู้ใช้: ${user.email} (UID: ${user.uid})`);

    await getAuth().setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      admin: true,
      adminLevel: "super"
    });
    console.log(`✅ ตั้งค่า admin: true ให้ ${targetEmail} เรียบร้อยแล้ว`);
    console.log("ℹ️  ให้ logout แล้ว login ใหม่ในเว็บแอป เพื่อให้สิทธิ์มีผล");

    process.exit(0);
  } catch (err) {
    console.error("❌ เกิดข้อผิดพลาด:", err.message);
    process.exit(1);
  }
}

main();
