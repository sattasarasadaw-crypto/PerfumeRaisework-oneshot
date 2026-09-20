# SCOPE.md — ขอบเขตโครงงานสำหรับ Module 2 (การบ้านที่ 1–4)

> ใช้คำตอบชุดนี้ต่อเนื่องทั้ง 4 สัปดาห์ของ Module 2 (การบ้านที่ 1: Memory · 2 · 3 · 4)
> เลือกเปลี่ยนได้ถึงสิ้นสัปดาห์ที่ 6 เท่านั้น หลังจากนั้นถือว่าล็อก

## ส่วนที่เลือกทำ: "สูตรน้ำหอมที่ส่งตรวจ" (Formula Review)

ตัดมาจากภาพรวมทั้งระบบใน [`NEW/`](../NEW/) (191 FR / 66 NFR) — เลือกทำเฉพาะวงจร
**สร้างสูตร → เก็บลงฐานข้อมูล → ส่งตรวจ → มีคนอนุมัติ/ตีกลับ** ให้ครบก่อน
ส่วนที่เหลือ (Analyze/Generate mode เต็มรูป, uncertainty engine, safety vault ฯลฯ) พักไว้ใน Backlog Sprint 2

### ประโยคเดียวที่สรุปขอบเขต

> ระบบของฉันเก็บ **สูตรน้ำหอม (Formula)** ที่ **นักปรุงน้ำหอม** สร้างขึ้น
> แต่ละสูตรเลือก **ประเภทน้ำหอม (Eau de Parfum / Eau de Toilette / Extrait de Parfum)** ได้
> และมีสถานะ **ร่าง (draft) → ส่งตรวจแล้ว (submitted) → อนุมัติ/ตีกลับ (approved / rejected)**
> โดย **ผู้ตรวจสอบ QC/Regulatory** เป็นคนกดเปลี่ยน

### ตารางขอบเขต (เทียบกับ LeaveEasy)

| | 🔧 LeaveEasy (ในคาบ) | 👤 ของฉัน (Formula Review) |
|---|---|---|
| 📁 โฟลเดอร์หลัก | `leaveRequests` | `formulas` |
| 📁 โฟลเดอร์ประเภท | `leaveTypes` | `fragranceTypes` (EDP / EDT / Extrait) |
| 📁 โฟลเดอร์ย่อย | `approvals` | `ingredients` (รายการวัตถุดิบ + %IFRA เฉพาะของสูตรนั้น) |
| ✏️ ช่องบอกว่าเป็นของใคร | `requesterId` · `requesterName` | `perfumerId` · `perfumerName` |
| 🔀 สถานะทั้งหมด | รอพิจารณา · อนุมัติ · ไม่อนุมัติ | `draft` · `submitted` · `approved` · `rejected` |
| 👤 คนที่สร้างรายการ | พนักงาน | นักปรุงน้ำหอม (Perfumer) |
| 👤 คนที่เปลี่ยนสถานะ | หัวหน้า | ผู้ตรวจสอบ QC/Regulatory (QC Reviewer) |
| 📝 ช่องข้อความยาวที่ AI จะอ่าน | `reason` | `brief` (โจทย์กลิ่น/ลูกค้าต้องการอะไร) |
| 🤖 งานที่ AI ช่วย (การบ้านสัปดาห์ที่ 8) | จัดประเภทการลาให้อัตโนมัติ | ตรวจ IFRA เบื้องต้นจากรายการวัตถุดิบ + brief แล้ว flag ความเสี่ยง |

### เช็ก 6 องค์ประกอบที่ Module 2 ต้องใช้

| # | ต้องมี | ของฉันคือ | ครบ |
|---|---|---|---|
| 1 | โฟลเดอร์หลักที่เพิ่มเรื่อย ๆ | `formulas` | ✅ |
| 2 | ช่องบอกว่าเป็นของใคร (กันข้อมูลรั่ว) | `perfumerId` | ✅ |
| 3 | สถานะที่เปลี่ยนได้ (มี U ของ CRUD) | `status: draft→submitted→approved/rejected` | ✅ |
| 4 | โฟลเดอร์ประเภทให้เลือก (ฝึก denormalize) | `fragranceTypes` | ✅ |
| 5 | โฟลเดอร์ย่อยผูกกับรายการนั้นโดยเฉพาะ | `ingredients` (sub-collection ใต้ formula แต่ละใบ) | ✅ |
| 6 | ช่องข้อความยาวให้ AI อ่าน | `brief` | ✅ |

### หน้าจอ (3–4 หน้าตามขอบเขตที่พอดี)

1. **รายการสูตร** (`/formulas`) — list พร้อม status badge
2. **สร้างสูตรใหม่** — ฟอร์ม + รายการวัตถุดิบ/% (ต่อยอดจาก prototype เดิมที่ [`docs/02-design/01-prototypes/20260818-01-v1/index.html`](docs/02-design/01-prototypes/20260818-01-v1/index.html))
3. **รายละเอียดสูตร** — แสดง ingredients, brief, สถานะ, ปุ่มอนุมัติ/ตีกลับสำหรับบทบาท QC
4. (ถ้าเหลือเวลา) จัดการ `fragranceTypes`

### บทบาทผู้ใช้ (2 พอ)

- **นักปรุงน้ำหอม (Perfumer)** — สร้าง/แก้ไขสูตรตอนยังเป็น draft
- **ผู้ตรวจสอบ QC/Regulatory (QC Reviewer)** — กดอนุมัติ/ตีกลับ

### อ้างอิงกลับ NEW spec

- Formulation Engine (Generate/Modify Mode): [`NEW/docs/01-requirements/01-spec/20260830-02-formulation-engine-generate-modify-mode.md`](../NEW/docs/01-requirements/01-spec/20260830-02-formulation-engine-generate-modify-mode.md)
- Regulatory Compliance (IFRA): [`NEW/docs/01-requirements/01-spec/20260829-07-regulatory-compliance.md`](../NEW/docs/01-requirements/01-spec/20260829-07-regulatory-compliance.md)

> ตารางนี้คือ MVP ที่ตัดเล็กลงมากจากภาพรวมใน NEW เพื่อให้ทำได้จบใน 4 สัปดาห์ตามที่การบ้านกำหนด
> ส่วนที่ยังไม่ทำ (uncertainty engine, safety vault, sourcing/cost ฯลฯ) ให้บันทึกไว้ใน BACKLOG.md แทนการลงมือทำ
