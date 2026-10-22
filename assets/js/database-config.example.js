// แก้ไฟล์นี้ไฟล์เดียวเพื่อเปิดฐานข้อมูลกลาง (ดู DEPLOY_GITHUB_DATABASE_TH.md)
// URL และ publishable key เป็นค่าฝั่ง browser ไม่ใช่ secret
// ห้ามใส่ service_role / sb_secret_ / รหัสผ่านฐานข้อมูลเด็ดขาด
SPARK.databaseConfig = {
  enabled: false,
  url: '', // https://YOUR_PROJECT.supabase.co
  publishableKey: '', // sb_publishable_... หรือ legacy anon key เท่านั้น
  workspace: 'spark-team',
  pollMilliseconds: 12000
};
