// seed.js — ใส่ข้อมูลตัวอย่างลง Firestore เพื่อสาธิต UI
//
// ⚠️ อ่านก่อนรัน — สคริปต์นี้รันไม่ผ่านถ้า firestore.rules ชุดจริงถูก deploy อยู่ และนั่นถูกต้องแล้ว
//
//   - `fragranceTypes` ตั้งใจให้ `allow write: if false` (spec.md หัวข้อ 4 + 6)
//     client เขียนไม่ได้เลย ไม่ว่าจะ login หรือไม่
//   - `formulas` ต้องสร้างโดยบัญชีที่เป็น perfumer จริง และ `perfumerId` ต้องเท่ากับ uid ของคนสร้าง
//     สคริปต์นี้ไม่ได้ login จึงถูกปฏิเสธตั้งแต่ข้อแรก
//
//   วิธีใช้จริงมี 2 ทาง:
//     (ก) ใส่ข้อมูลทาง Firebase Console ด้วยมือ (วิธีที่ใช้จริงกับโปรเจกต์นี้)
//     (ข) ตั้ง rules เป็นโหมดทดสอบชั่วคราว → `npm run seed` → deploy rules ชุดจริงกลับทันที
//         🔴 ห้ามลืมขั้นตอนสุดท้าย — ระหว่างนั้นข้อมูลทุกคนเปิดโล่ง
//
// ⚠️ ข้อมูลทั้งหมดในไฟล์นี้เป็น "ข้อมูลสมมติเพื่อสาธิต UI" ไม่ใช่ข้อมูลจริงของบุคคลหรือสูตรจริงใด ๆ
//    `perfumerId` ที่ใช้เป็น id สมมติ ไม่ใช่ Auth UID จริง — สูตรที่ seed ไว้จึงใช้สาธิตได้แค่
//    มุมมอง QC Reviewer (ที่เห็นทุกสูตร) ไม่ใช่มุมมอง Perfumer เจ้าของสูตร

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc, Timestamp } from "firebase/firestore";

// Firebase client config — เป็น public config ตามการออกแบบของ Firebase
// ความปลอดภัยจริงมาจาก firestore.rules ไม่ใช่การซ่อนค่าเหล่านี้
const firebaseConfig = {
  apiKey: "AIzaSyAU--OrJfjajnO5SEod9rjoM4-CRUiDg3E",
  authDomain: "sattasarasada-perfume.firebaseapp.com",
  projectId: "sattasarasada-perfume",
  storageBucket: "sattasarasada-perfume.firebasestorage.app",
  messagingSenderId: "263330698195",
  appId: "1:263330698195:web:d57653b9e847fc492e9526",
};

const db = getFirestore(initializeApp(firebaseConfig));

// ตาราง lookup ประเภทน้ำหอม — ใช้ id ที่อ่านออกเพื่อให้อ้างอิงง่าย
const FRAGRANCE_TYPES = [
  { id: "edp", name: "Eau de Parfum", concentrationRange: "15–20%" },
  { id: "edt", name: "Eau de Toilette", concentrationRange: "5–15%" },
  { id: "extrait", name: "Extrait de Parfum", concentrationRange: "20–40%" },
];

// สูตรตัวอย่าง 5 ใบ ครอบคลุมสถานะครบทั้ง 4 ค่าตาม spec.md หัวข้อ 4
const FORMULAS = [
  {
    name: "Citrus Dawn",
    fragranceTypeId: "edt",
    fragranceTypeName: "Eau de Toilette",
    brief: "ลูกค้าต้องการกลิ่นสดชื่นตอนเช้า เปิดตัวด้วยส้มแล้วจบนุ่มด้วยไม้อ่อน ๆ",
    status: "draft",
    ingredients: [
      { materialName: "Bergamot Oil", percent: 8 },
      { materialName: "Lemon Oil", percent: 5 },
      { materialName: "Cedarwood", percent: 3 },
    ],
  },
  {
    name: "Rosa Elegante",
    fragranceTypeId: "edp",
    fragranceTypeName: "Eau de Parfum",
    brief: "กลิ่นกุหลาบคลาสสิกสำหรับงานกลางคืน ต้องติดทนอย่างน้อย 6 ชั่วโมง",
    status: "submitted",
    ingredients: [
      { materialName: "Rose Absolute", percent: 12 },
      { materialName: "Geraniol", percent: 4 },
      { materialName: "Patchouli", percent: 6 },
    ],
  },
  {
    name: "Vanilla Whisper",
    fragranceTypeId: "edp",
    fragranceTypeName: "Eau de Parfum",
    brief: "กลิ่นวานิลลาอบอุ่น กลุ่มลูกค้าวัยทำงาน ไม่ต้องการความหวานจัดเกินไป",
    status: "approved",
    ingredients: [
      { materialName: "Vanillin", percent: 7 },
      { materialName: "Tonka Bean", percent: 5 },
      { materialName: "Sandalwood", percent: 8 },
    ],
  },
  {
    name: "Citral Overdose",
    fragranceTypeId: "edt",
    fragranceTypeName: "Eau de Toilette",
    brief: "อยากได้กลิ่นมะนาวจัดจ้านที่สุดเท่าที่จะทำได้ เน้นความแรงเป็นหลัก",
    status: "rejected",
    ingredients: [
      { materialName: "Citral", percent: 9 },
      { materialName: "Lemongrass Oil", percent: 11 },
    ],
  },
  {
    name: "Oud Nocturne",
    fragranceTypeId: "extrait",
    fragranceTypeName: "Extrait de Parfum",
    brief: "น้ำหอมระดับพรีเมียม กลิ่นไม้กฤษณาเข้มข้น สำหรับตลาดตะวันออกกลาง",
    status: "submitted",
    ingredients: [
      { materialName: "Oud Accord", percent: 18 },
      { materialName: "Saffron", percent: 2 },
      { materialName: "Amber", percent: 10 },
    ],
  },
];

const FAKE_PERFUMER_ID = "seed-demo-perfumer";
const FAKE_PERFUMER_NAME = "นักปรุงตัวอย่าง (ข้อมูลสมมติ)";

async function seed() {
  console.log("กำลังใส่ข้อมูลตัวอย่างลง Firestore...\n");

  for (const type of FRAGRANCE_TYPES) {
    const { id, ...data } = type;
    await setDoc(doc(db, "fragranceTypes", id), data);
    console.log(`  fragranceTypes/${id} — ${data.name}`);
  }

  console.log("");

  for (const formula of FORMULAS) {
    const { ingredients, ...formulaData } = formula;
    const ref = await addDoc(collection(db, "formulas"), {
      ...formulaData,
      perfumerId: FAKE_PERFUMER_ID,
      perfumerName: FAKE_PERFUMER_NAME,
      aiIfraNote: "",
      aiSuggestion: "",
      createdAt: Timestamp.now(),
    });

    for (const ing of ingredients) {
      await addDoc(collection(ref, "ingredients"), ing);
    }
    console.log(`  formulas/${ref.id} — ${formula.name} (${formula.status}, ${ingredients.length} วัตถุดิบ)`);
  }

  console.log(`\nเสร็จแล้ว: ${FRAGRANCE_TYPES.length} ประเภท · ${FORMULAS.length} สูตร`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nใส่ข้อมูลไม่สำเร็จ:", err.message);
    if (String(err.code).includes("permission-denied")) {
      console.error(
        "\n👉 เป็นพฤติกรรมที่ถูกต้องของ firestore.rules ชุดจริง — อ่านหมายเหตุหัวไฟล์นี้ก่อนทำต่อ"
      );
    }
    process.exit(1);
  });
