# คู่มือแก้โค้ด

**เพิ่มในรุ่นฐานข้อมูล:** ตั้งค่าที่ `assets/js/database-config.js`; SQL อยู่ใน `database/`; วิธีนำขึ้น GitHub และเพิ่มเพื่อนอยู่ใน `DEPLOY_GITHUB_DATABASE_TH.md` โหมดฐานข้อมูลใช้ `cloud.js` ครอบ store เดิมและคืน Promise สำหรับรายการที่ต้องบันทึก server ห้ามลบ `await`/`return U.submit` ออกจากฟอร์ม

เปิดโฟลเดอร์ใน Text Editor หรือ VS Code แก้ไฟล์ บันทึก แล้ว Refresh ไม่มีขั้นตอน Build แนะนำสำรอง ZIP ก่อนแก้กฎน้ำหนักหรือเงิน

| ต้องการแก้ | ไฟล์/จุดที่แก้ | ตัวอย่าง/สิ่งที่ต้องตรวจ |
| --- | --- | --- |
| ชื่อและคำอธิบายเว็บ | assets/js/config.js ที่ name และ description; ข้อความใน HTML | แก้ title, meta description, Hero และ Footer ของ HTML ที่เกี่ยวข้องด้วย |
| สีทั้งเว็บ | assets/css/tokens.css | --primary, --primary-dark, --text, --background, --soft, --border, --amber, --red, --blue; ตรวจ contrast และ focus |
| ฟอนต์ ระยะ มุม | tokens.css / base.css / pages.css | --font, --radius; Responsive Rules ท้าย pages.css |
| Hero | assets/images/cage-hero.webp และ index.html | แทนไฟล์หรือแก้ src, width, height, alt; แก้ที่มา/สิทธิใน assets/IMAGE_CREDITS.md |
| ภาพปลา | assets/images/grouper.webp, seabass.webp; demo-data.js | แก้ products[].image และ alt ใน pages/marketplace.js และ order.js ไม่อ้างภาพสร้างว่าเป็นภาพชุมชนจริง |
| ภาพร้านและแพ็ก | restaurant.webp / packing.webp; dashboard.html / delivery.html | แก้ alt และขนาดใน HTML และที่มาภาพ |
| หน้ากระชัง/แบบฟอร์ม | cages.html, cage-detail.html; assets/js/pages/cages.js, cage-detail.js | โครงสร้างอยู่ HTML การ์ดและการส่งข้อมูลอยู่ Page Logic; เปลี่ยน name ต้องแก้การรับค่าด้วย |
| ค่าน้ำ | record-water.html / pages/record-water.js | ค่าว่างเป็น null เลข0เป็นค่าที่วัดได้ รักษาหน่วยและเวลาไทย |
| ราคา ปริมาณ ร้าน Scenario | assets/js/demo-data.js | priceSatang:34000=340บาท, liveKg, offerKg, users และ seed(scenario,clock); พร้อมเสนอขายไม่ใช่น้ำหนักทั้งหมด |
| อายุข้อมูลเดโม | config.js ที่ freshnessHours | แยกแต่ละตัวแปร ค่าเวลาเป็นค่าทดสอบ ไม่ใช่คำแนะนำฟาร์ม |
| กฎประเมิน | risk-engine.js / config.ruleVersion | evaluateCageRisk เป็น Pure Function ตรวจกรณีขาดDO, ศูนย์, เก่า, อาการเร่งด่วน+ข้อมูลขาด, เวลาเดียวไม่มีแนวโน้ม และเหตุเดิมยังเปิด |
| น้ำหนักและเงิน | calculations.js / domain.js | เงินเป็นสตางค์ น้ำหนักสามตำแหน่ง ห้าม Hardcode ยอดแยกใน HTML |
| เปลี่ยนชื่อ HTML | ไฟล์นั้นและลิงก์ใน HTML/JS ทั้งชุด | แก้ href, data-page, Page Logic script, Navigation ใน app-shell.js, URL แจ้งเตือนและชุดทดสอบ/คู่มือ |
| บทบาทและชื่อบัญชี | demo-data.js / app-shell.js | ID ต้องตรง ownerId, buyerId, actorId ที่อ้างถึง |

## Seed ไม่ทับ State เดิม

แก้ demo-data.js แล้วข้อมูลเดิมจะยังอยู่ตามเดิม นี่เป็นพฤติกรรมตั้งใจ
หากต้องการดูค่าตั้งต้นใหม่ ให้ส่งออก JSON สำรองใน guide.html แล้วเลือก Scenario หรือ Reset พร้อมยืนยัน
อย่าล้าง State อัตโนมัติทุกครั้งที่ Refresh หรือเปลี่ยนบทบาท การเปลี่ยน schemaVersion ต้องมีแผนจัดการข้อมูลเดิม รุ่นนี้จะแจ้งเมื่อโครงสร้างไม่ตรง

## ลำดับ scripts

Classic Scripts แบบ defer ใช้ window.SPARK:
config → utils → demo-data → calculations → risk-engine → store → domain → app-shell → pages/ชื่อหน้า.js
ไม่มี import/export, Bundler, CDN หรือ absolute /assets

ทุก Mutation เรียก SPARK.domain.dispatch() ไม่แก้ localStorage หรือ State ตรงจาก Page Logic
reduce เป็น Pure Function สำหรับทดสอบ ก่อน commit ตรวจ revision และเขียนสำเร็จก่อน UI แสดงผล

## แก้แล้วตรวจ

1. เปิด HTTP Server แล้วกดเดโมสองเส้นทางตาม DEMO_GUIDE_TH.md
2. เปิด tests/test-runner.html ให้ทุกกรณีผ่าน
3. เปิด tests/responsive-check.html ดูฟอร์ม ชื่อร้านยาว ทั้งแนวตั้ง/กว้าง
4. ถ้ามี Node: node tests/run-node.js; ถ้ามี Python: python3 tests/check-files.py
5. ตรวจ Back, Refresh, Deep Link ID ถูก/ผิด และภาพไม่แตก รวมปุ่มซ้ำไม่เพิ่มน้ำหนักหรือเงิน
