# ACL.md — สิทธิ์การเข้าถึงของ Formula Review (Module 2 HW2)

> ขอบเขต/นิยามฟีเจอร์อ้างอิงจาก [`SCOPE.md`](SCOPE.md) — ระบบมี 2 บทบาท: **Perfumer** และ **QC Reviewer**
> โค้ดจริงอยู่ที่ [`Submission-RAISE-M2-HW1/prototype/`](Submission-RAISE-M2-HW1/prototype/) — enforce จริงด้วย [`firestore.rules`](Submission-RAISE-M2-HW1/prototype/firestore.rules)

## ตารางสิทธิ์

| บทบาท | สิทธิ์ที่ทำได้ (Permissions) | ข้อจำกัด (Restrictions) |
|---|---|---|
| **Perfumer** (`role: "perfumer"` — บทบาทเริ่มต้นของทุกบัญชีที่สมัครใหม่) | สร้างสูตรใหม่ (`status: "draft"`, `perfumerId` = uid ของตัวเอง) พร้อมรายการวัตถุดิบ (`ingredients`) · ดู/แก้ไข/ลบสูตรของตัวเองได้ขณะยังเป็น `draft` · ส่งสูตรของตัวเองเข้าตรวจ (`draft` → `submitted`) | **ห้ามเห็นสูตรของ Perfumer คนอื่น** (แม้จะ query ตรงๆ ก็ถูก Firestore Security Rules ปฏิเสธ) · ห้ามเปลี่ยนสถานะเป็น `approved`/`rejected` เอง (ต้องให้ QC Reviewer เท่านั้น) · แก้ไข/ลบไม่ได้อีกเมื่อสถานะเป็น `submitted`/`approved`/`rejected` แล้ว · ห้ามเปลี่ยน `perfumerId` ของสูตร (โอนความเป็นเจ้าของ) |
| **QC Reviewer** (`role: "qc_reviewer"` — ผู้ดูแลระบบต้องแก้ค่านี้ให้ทีหลังใน Firebase Console เท่านั้น ไม่มีทางสมัครเองให้ได้บทบาทนี้) | ดูสูตรได้**ทุกสูตรของทุกคน** ไม่ว่าสถานะใด (เพื่อเข้าไปตรวจ) · เปลี่ยนสถานะสูตรที่เป็น `submitted` ให้เป็น `approved` หรือ `rejected` | แก้ไขไม่ได้แม้แต่ฟิลด์เดียวนอกจาก `status` (ชื่อสูตร/วัตถุดิบ/brief ฯลฯ แก้ไม่ได้) · เปลี่ยนสถานะได้เฉพาะสูตรที่เป็น `submitted` แล้วเท่านั้น (แตะ `draft` ไม่ได้ ต้องรอ Perfumer ส่งตรวจก่อน) · สร้าง/ลบสูตรหรือวัตถุดิบไม่ได้เลย

## ทำไม Perfumer อนุมัติสูตรตัวเองไม่ได้

`users/{uid}.role` เขียนได้เฉพาะเจ้าของ uid เท่านั้น (self-service) แต่ฟิลด์ `role` เองถูกล็อกไม่ให้เปลี่ยนค่าตอน `update` (ดู `firestore.rules` กติกาของ `match /users/{uid}`) — ดังนั้น Perfumer ไม่มีทางแก้ `role` ของตัวเองเป็น `qc_reviewer` เพื่อไปอนุมัติสูตรตัวเองได้ ต้องให้ผู้คุมข้อมูล (คุณ) เข้าไปแก้ค่านี้ตรงใน Firebase Console เท่านั้น

## วิธีทดสอบ (ตามที่โจทย์ w7-homework.html กำหนด)

1. สมัครบัญชีทดสอบ 2 บัญชีผ่าน `public/signup.html` (ทั้งคู่จะได้ `role: "perfumer"` โดยอัตโนมัติ)
2. เข้า Firebase Console → Firestore Database → collection `users` → เปิดเอกสารของบัญชีที่สอง → แก้ `role` เป็น `"qc_reviewer"`
3. Login ด้วยบัญชีแรก (Perfumer): สร้างสูตร → กด "ส่งตรวจ" → ยืนยันว่ามองไม่เห็นสูตรของบัญชีอื่น และกดอนุมัติเองไม่ได้ (ไม่มีปุ่มให้กด)
4. Login ด้วยบัญชีที่สอง (QC Reviewer): ยืนยันว่าเห็นสูตรของบัญชีแรกที่ส่งตรวจแล้ว และกด "อนุมัติ"/"ตีกลับ" ได้
5. เปิดหน้าเว็บแบบไม่ login (หรือ Incognito) แล้วลองเข้าถึงข้อมูล — ต้องเจอ `permission-denied` (ใช้เป็นภาพ Checkpoint 3)
