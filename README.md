# ปลาศาลาหุม · SPARK team prototype

เว็บภาษาไทย HTML/CSS/Vanilla JavaScript 19 หน้า รองรับคอมและมือถือ ไม่มี Build Step

**เริ่มที่ [คู่มือ GitHub Pages + Supabase](DEPLOY_GITHUB_DATABASE_TH.md)**

1. สร้าง Supabase project และรัน `database/schema.sql`
2. สร้าง Auth users และเพิ่มสมาชิกด้วย `database/add-members.example.sql` ใน SQL Editor ส่วนตัว
3. กรอก URL + **publishable key** และเปิด `enabled: true` ใน `assets/js/database-config.js`
4. อัปโหลดไฟล์ในโฟลเดอร์นี้โดยมี `index.html` ที่ราก repo แล้วเปิด Settings → Pages → main → / (root)
5. เจ้าของทีมล็อกอินก่อน จากนั้นเพื่อนใช้ลิงก์ Pages และบัญชีแยกของตนเอง

ค่าเริ่มต้นยังไม่เชื่อม cloud (`enabled: false`) จึงลองเดโมได้ทันทีด้วย local HTTP server ไม่ใช่ฐานข้อมูลออนไลน์ที่เปิดไว้ให้แล้ว

**ห้ามใส่ service_role, secret key, รหัสผ่าน หรือ token ลง GitHub** โค้ดเปิดเผยได้ แต่ข้อมูลกลางอ่าน/เขียนได้เฉพาะบัญชีที่เป็นสมาชิกทีม

เหมาะสำหรับทีมที่ไว้ใจกันและใช้ข้อมูลสมมติ บทบาทธุรกิจยังสลับสาธิตได้ ไม่ใช่ marketplace production หรือระบบสิทธิ์ผู้ซื้อ/ผู้เลี้ยงจริง

- [เปิดเดโมในเครื่อง](README_TH.md)
- [คู่มือแก้ไข](EDIT_GUIDE_TH.md)
- [สถานการณ์นำเสนอ](DEMO_GUIDE_TH.md)
- [ผลทดสอบและข้อจำกัด](TEST_REPORT_TH.md)

```bash
python3 -m http.server 8000
node tests/run-node.js
node tests/cloud-test.js
python3 tests/check-files.py
```

เปิด http://localhost:8000 ไม่ต้องติดตั้งแพ็กเกจเพิ่มเติม โหมดฐานข้อมูลต้องมีอินเทอร์เน็ตและตั้งค่า Supabase ก่อน
