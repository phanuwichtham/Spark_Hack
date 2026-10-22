window.SPARK = window.SPARK || {};
// เปลี่ยนชื่อ สี และอายุข้อมูลสำหรับเดโมได้โดยไม่แตะธุรกรรม
SPARK.config = {
  name: 'ปลาศาลาหุม',
  description: 'ช่วยดูแลปลา วางแผนจับ และเชื่อมผู้ซื้อ',
  storageKey: 'spark-fish-demo-v1', schemaVersion: 1, ruleVersion: 'DEMO-1.0',
  freshnessHours: { do: 4, temperature: 6, salinity: 12, ph: 12 },
  units: { do: 'mg/L', temperature: '°C', salinity: 'ppt', ph: 'pH' },
  coldCapacityKg: 70,
  roleNames: {farmer:'ผู้เลี้ยงปลา', buyer:'ร้านอาหาร', coordinator:'ผู้ประสานกลุ่ม'}
};
