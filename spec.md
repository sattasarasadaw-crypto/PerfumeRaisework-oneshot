# spec.md — สเปคระบบ Formula Review (Module 2 Sprint 1 / MVP)

> 🎯 **ไฟล์นี้คือใบสั่งงานที่ผู้ช่วย AI ทั้ง 3 ตัวใช้สร้าง repo นี้ขึ้นมาทั้งชุดในคำสั่งเดียว**
> (การบ้านที่ 4 ส่วน A ข้อ 3 — "สั่งทีเดียวจบ") โค้ดทุกไฟล์ในนี้ถูกสร้างจากสเปคฉบับนี้
>
> ใบสั่งงานฉบับเดียวของระบบที่ทำจริงใน Module 2 (สัปดาห์ที่ 6–9)
> รวม [`SCOPE.md`](SCOPE.md) + สิ่งที่ทำจริงมาแล้ว 3 สัปดาห์ (การบ้านที่ 1 / 2 / 3) ไว้ในไฟล์เดียว
> เขียนขึ้นตาม [การบ้านที่ 4 ส่วน A](https://cnacha-mfu.github.io/raise2-module2/materials/week9/w9-homework.html)
>
> **ขอบเขตของไฟล์นี้:** อธิบายเฉพาะระบบเล็กที่ deploy จริงใน Module 2 เท่านั้น
> ไม่ใช่ระบบเต็ม 191 FR / 66 NFR ที่อยู่ในเอกสาร repo เดิม `PerfumeRaisework` (นั่นคือแผนระยะยาวของโครงการ)

**Live URL:** https://sattasarasada-perfume.web.app
**โค้ดจริง:** root ของ repo นี้
**Firebase project:** `sattasarasada-perfume`

---

## 1. ระบบนี้คืออะไร (หนึ่งย่อหน้า)

ระบบเก็บ **สูตรน้ำหอม (Formula)** ที่ **นักปรุงน้ำหอม (Perfumer)** สร้างขึ้น แต่ละสูตรเลือก
**ประเภทน้ำหอม** ได้ (Eau de Parfum / Eau de Toilette / Extrait de Parfum) มีรายการ **วัตถุดิบ + %**
และมี **โจทย์กลิ่น (brief)** เป็นข้อความยาว สูตรเดินผ่านสถานะ
**ร่าง → ส่งตรวจ → อนุมัติ/ตีกลับ** โดย **ผู้ตรวจสอบ QC/Regulatory (QC Reviewer)** เป็นคนกดเปลี่ยน
มีปุ่ม AI ช่วยตั้งข้อสังเกต IFRA เบื้องต้นและสรุปสูตรให้ QC อ่าน — **AI ไม่มีสิทธิ์เปลี่ยนสถานะเอง**

---

## 2. บทบาทผู้ใช้

| บทบาท | ค่าใน `users.role` | ได้มาอย่างไร | ทำอะไรได้ |
|---|---|---|---|
| นักปรุงน้ำหอม | `perfumer` | ค่าเริ่มต้นตอนสมัครสมาชิก | สร้าง/ดู/ส่งตรวจ/ลบ **เฉพาะสูตรของตัวเอง** และลบได้เฉพาะตอนยังเป็น `draft` |
| ผู้ตรวจสอบ QC | `qc_reviewer` | ผู้ดูแลแก้ค่าใน Firebase Console ด้วยมือเท่านั้น | เห็น **ทุกสูตร**, กดอนุมัติ/ตีกลับได้เฉพาะสูตรที่ `submitted`, สั่ง AI สรุปสูตรได้ |

**มีแค่ 2 บทบาทนี้เท่านั้น** — ไม่มี admin ไม่มี role อื่น
รายละเอียดสิทธิ์เต็ม: [`ACL.md`](ACL.md) · บังคับใช้จริงที่ [`firestore.rules`](firestore.rules)

> 🔒 **กติกาสำคัญ:** ผู้ใช้เปลี่ยน `role` ของตัวเองไม่ได้ (กัน Perfumer โปรโมทตัวเองเป็น QC
> แล้วอนุมัติสูตรตัวเอง) — บังคับใน rules ที่ `match /users/{uid}` บรรทัด `allow update`

---

## 3. หน้าจอ (5 หน้า)

| # | ไฟล์ | หน้าที่ | ใครเข้าได้ |
|---|---|---|---|
| 1 | `signup.html` | สมัครสมาชิก → เขียน `users/{uid}` ด้วย `role: "perfumer"` เสมอ | ทุกคน |
| 2 | `login.html` | เข้าสู่ระบบด้วยอีเมล/รหัสผ่าน | ทุกคน |
| 3 | `index.html` | รายการสูตร + สถานะ · Perfumer เห็นเฉพาะของตัวเอง, QC เห็นทุกสูตร · ปุ่มออกจากระบบ | ต้อง login |
| 4 | `formula-new.html` | ฟอร์มสร้างสูตร (ชื่อ, ประเภท, brief, วัตถุดิบหลายแถว) + ปุ่ม 🤖 ตรวจ IFRA เบื้องต้น | ต้อง login (ปุ่มสร้างโชว์เฉพาะ Perfumer) |
| 5 | `formula-detail.html` | รายละเอียดสูตร + วัตถุดิบ + ปุ่มตามบทบาท/สถานะ + ปุ่ม 🤖 สรุปให้ QC | ต้อง login และต้องมีสิทธิ์เห็นสูตรนั้น |

ทุกหน้าที่ต้อง login มีการ์ด `onAuthStateChanged` → ถ้ายังไม่ login เด้งไป `login.html`
ทุกหน้าใช้ `firebase-config.js` ร่วมกัน (ES module เดียว export `auth` / `db`)

### ปุ่มที่เปลี่ยนสถานะ (แสดงตามเงื่อนไข ไม่ได้แสดงตลอด)

| ปุ่ม | เงื่อนไขที่จะเห็นปุ่ม | ผลลัพธ์ |
|---|---|---|
| ส่งตรวจ (submit) | เป็นเจ้าของสูตร **และ** สถานะ = `draft` | `draft` → `submitted` |
| อนุมัติ (approve) | เป็น QC **และ** สถานะ = `submitted` | `submitted` → `approved` |
| ตีกลับ (reject) | เป็น QC **และ** สถานะ = `submitted` | `submitted` → `rejected` |
| ลบ | เป็นเจ้าของสูตร **และ** สถานะ = `draft` | ลบเอกสาร (มี `confirm()` ก่อน) |

---

## 4. โครงสร้างข้อมูล (Firestore)

```
formulas/{formulaId}
  ├── name              string   ชื่อสูตร
  ├── perfumerId        string   Auth UID ของเจ้าของ  ← ใช้กันข้อมูลรั่วข้ามบัญชี
  ├── perfumerName      string   ชื่อที่แสดง (denormalize ไว้อ่านเร็ว)
  ├── fragranceTypeId   string   อ้างไปที่ fragranceTypes/{id}
  ├── fragranceTypeName string   denormalize ไว้แสดงในตาราง
  ├── brief             string   โจทย์กลิ่น (ข้อความยาวที่ AI อ่าน)
  ├── status            string   draft | submitted | approved | rejected
  ├── aiIfraNote        string   ข้อสังเกต IFRA จาก AI ตอนสร้างสูตร (อาจเป็น "")
  ├── aiSuggestion      string   สรุปสูตรจาก AI สำหรับ QC (เขียนภายหลัง, อาจไม่มี)
  ├── createdAt         Timestamp
  │
  ├── ingredients/{id}          sub-collection — วัตถุดิบของสูตรนี้เท่านั้น
  │     ├── materialName string
  │     └── percent      number
  │
  └── aiLog/{id}                sub-collection — ประวัติการเรียก AI สรุป
        ├── input      string
        ├── output     string
        └── createdAt  Timestamp

fragranceTypes/{typeId}         lookup — seed ไว้ล่วงหน้า client เขียนไม่ได้
  ├── name               string  เช่น "Eau de Parfum"
  └── concentrationRange string  เช่น "15–20%"

users/{uid}
  ├── email       string
  ├── displayName string
  ├── role        string  perfumer | qc_reviewer
  └── createdAt   Timestamp
```

**สถานะของ `formulas.status` มีได้แค่ 4 ค่า:** `draft` · `submitted` · `approved` · `rejected`
**ค่า `users.role` มีได้แค่ 2 ค่า:** `perfumer` · `qc_reviewer`

---

## 5. ผู้ช่วย AI ในระบบ (การบ้านที่ 3 / สัปดาห์ที่ 8)

| ที่ | ปุ่ม | อ่านอะไร | เขียนอะไร |
|---|---|---|---|
| `formula-new.html` | 🤖 ให้ AI ตรวจ IFRA เบื้องต้น | `brief` + วัตถุดิบในฟอร์ม (ยังไม่บันทึก) | `formulas.aiIfraNote` ตอนกดบันทึกสูตร |
| `formula-detail.html` | 🤖 ให้ AI สรุปสูตรนี้ให้ QC อ่าน | เอกสาร `formulas/{id}` + sub-collection `ingredients` ทั้งหมด | `formulas.aiSuggestion` + เพิ่มเอกสารใน `aiLog/` |

โมเดลที่เรียก: `google/gemini-2.5-flash-lite` ผ่าน OpenRouter · ตัดที่ 15 วินาทีด้วย `AbortController`

**กติกาที่ AI ห้ามละเมิด** (มาจาก `CLAUDE.md` ของโครงการ):
- AI **ห้ามฟันธงว่าอนุมัติหรือตีกลับ** และ **ห้ามอ้างตัวเลขขีดจำกัด IFRA ราวกับเป็นผลตรวจทางการ**
- `status` เปลี่ยนได้จากปุ่มของมนุษย์เท่านั้น — ปุ่ม AI ไม่แตะ `status` เลย
  (บังคับที่ rules: QC เขียน `aiSuggestion` ได้ แต่เป็นคนละ rule กับสิทธิ์เปลี่ยน `status`)
- ทุกข้อความจาก AI ต้องมีป้ายกำกับว่าเป็นข้อสังเกตของ AI ไม่ใช่ผลตรวจ

### คีย์ AI เก็บที่ไหน

คีย์ OpenRouter **ไม่อยู่ในโค้ดและไม่อยู่บนเว็บที่ deploy** — `public/ai-key.js` หาคีย์ตามลำดับ
sessionStorage → `config.local.js` (มีเฉพาะในเครื่อง) → ถามผู้ใช้ให้วางคีย์
`config.local.js` ถูกกันทั้งใน `.gitignore` (ไม่ขึ้น GitHub) และใน `firebase.json` (ไม่ขึ้นเว็บ)

> ⚠️ ยังไม่ใช่ทางแก้สุดท้าย — คีย์ยังไปถึงเบราว์เซอร์ผู้ใช้อยู่ดี
> ทางแก้จริงคือย้ายไปฝั่งเซิร์ฟเวอร์ ดู [`BACKLOG.md`](BACKLOG.md) ข้อแรก

---

## 6. สิ่งที่ **ไม่ทำ** ใน Module นี้ (กันงานบานปลาย)

ตัดออกจากขอบเขตตั้งแต่ [`SCOPE.md`](SCOPE.md) — ถ้า AI สร้างของพวกนี้มาให้ถือว่า **ผิดสเปค ให้เอาออก**:

- ❌ Matrix Engine / Two-Engine Core เต็มรูป (Engine A ฟิสิกส์เคมี + Engine B NLP)
- ❌ คำนวณ Longevity / Sillage / Aroma Profile จริงจากฟิสิกส์เคมี
- ❌ ตรวจ IFRA จากฐานข้อมูลสารจริง + CAS Number + ตารางขีดจำกัดจริง (มีแค่ข้อสังเกตเชิงคุณภาพจาก AI)
- ❌ Uncertainty engine, Safety vault, Cost/ROI calculation
- ❌ จัดการ `fragranceTypes` ผ่าน UI (seed ทางสคริปต์เท่านั้น)
- ❌ แก้ไขสูตรหลังบันทึก / แก้ไขวัตถุดิบรายตัว (ไม่มี use case ใน MVP นี้)
- ❌ หน้าแอดมินจัดการผู้ใช้/บทบาท (เปลี่ยน role ทาง Firebase Console เท่านั้น)
- ❌ แจ้งเตือนทางอีเมล, export PDF, รายงานสถิติ
- ❌ รองรับหลายภาษา (ไทยอย่างเดียว)

---

## 7. เกณฑ์ว่า "เสร็จ" (ตรงกับเกณฑ์ผ่าน Module 2 ทั้ง 6 ข้อ)

| # | เกณฑ์ | หลักฐาน |
|---|---|---|
| ① | deploy ออนไลน์ + เก็บลง Firestore จริง | https://sattasarasada-perfume.web.app |
| ② | ข้อมูลไม่รั่ว — บัญชีที่สองเปิดของบัญชีแรกไม่ได้ | เทสต์ `security.spec.js` ข้อ 4–5 |
| ③ | ผู้ช่วย 3 ตัวระบุโมเดล + ไม่มีคีย์หลุด | [`.claude/agents/`](.claude/agents/) + [`test-results.md`](test-results.md) |
| ④ | ชุดทดสอบผ่าน ≥ 5 ตัว รวมเทสต์ความปลอดภัย | [`test-results.md`](test-results.md) |
| ⑤ | อธิบายระบบตัวเองได้ | ไฟล์นี้ + repo เดิม `PerfumeRaisework` + commit history |
| ⑥ | ของส่งมอบครบ 5 รายการเปิดดูได้จาก repo | [`README.md`](README.md) |
