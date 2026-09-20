// config.local.example.js — แม่แบบ ให้คัดลอกเป็น config.local.js แล้วใส่คีย์ AI ของหลักสูตร
//
// 🔴 config.local.js ตัวจริงถูกกันไว้ 2 ชั้น ห้ามเอาออกจากชั้นใดชั้นหนึ่งเด็ดขาด:
//    1. .gitignore      — กันไม่ให้ขึ้น GitHub
//    2. firebase.json   — กันไม่ให้ขึ้นเว็บตอน deploy (hosting.ignore)
//
//    กันแค่ชั้นแรกไม่พอ — repo รุ่นก่อนหน้ากันไว้แค่ .gitignore แล้วคีย์หลุดทางเว็บจริง ๆ
//
// ไฟล์นี้ (ที่ลงท้าย -example) ไม่มีคีย์จริงจึง commit ได้ — ห้ามใส่คีย์จริงลงไฟล์นี้เด็ดขาด

export const OPENROUTER_API_KEY = "ใส่คีย์ของหลักสูตรตรงนี้";
