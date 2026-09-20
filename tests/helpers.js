// helpers.js — ตัวช่วยที่ใช้ร่วมกันของชุดทดสอบ
//
// 🔒 กติกาเรื่องความลับ:
//   - ไม่มีอีเมล/รหัสผ่านบัญชีทดสอบอยู่ในไฟล์นี้หรือไฟล์ใดที่ commit ได้
//     ทั้งหมดอ่านจาก tests/test-accounts.local.json ซึ่งถูกกันไว้ใน .gitignore
//   - firebaseApiKey อ่านมาจาก public/firebase-config.js โดยตรง (ไม่ก๊อปมาวางซ้ำ)
//     ค่านี้เป็น Firebase client config ที่เป็น public ตามการออกแบบของ Firebase เอง
//     ความปลอดภัยจริงมาจาก firestore.rules ไม่ใช่การซ่อนค่านี้

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE = path.join(here, "test-accounts.local.json");
const FIREBASE_CONFIG_FILE = path.join(here, "..", "public", "firebase-config.js");

export const PROJECT_ID = "sattasarasada-perfume";
// ค่าเริ่มต้นคือเซิร์ฟเวอร์ในเครื่อง (tests/serve.mjs) เพราะ repo นี้ยังไม่ได้ deploy ทับของเดิม
// ตั้ง BASE_URL เพื่อยิงเว็บที่ deploy แล้วแทนได้
export const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4173}`;

/** ดึง apiKey ออกมาจาก public/firebase-config.js เพื่อไม่ให้มีค่าซ้ำสองที่ */
export function firebaseApiKey() {
  const src = fs.readFileSync(FIREBASE_CONFIG_FILE, "utf8");
  const m = src.match(/apiKey:\s*"([^"]+)"/);
  if (!m) throw new Error("หา apiKey ใน public/firebase-config.js ไม่เจอ");
  return m[1];
}

/**
 * อ่านบัญชีทดสอบ 2 บัญชีจากไฟล์ที่ .gitignore กันไว้
 * คืน null ถ้ายังไม่ได้ตั้งค่า — เทสต์ที่ต้อง login จะ skip พร้อมข้อความบอกวิธีตั้งค่า
 */
export function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) return null;
  const raw = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
  const ok = (a) => a && typeof a.email === "string" && a.email.includes("@") && a.password;
  if (!ok(raw.perfumerA) || !ok(raw.perfumerB)) return null;
  return raw;
}

export const SETUP_HINT =
  "ยังไม่ได้ตั้งค่าบัญชีทดสอบ — คัดลอก tests/test-accounts.example.json " +
  "เป็น tests/test-accounts.local.json แล้วใส่บัญชี perfumer 2 บัญชี (ไฟล์นี้ถูกกันไว้ใน .gitignore)";

/** เข้าสู่ระบบผ่าน Firebase Auth REST — คืน { idToken, uid } */
export async function signIn(request, { email, password }) {
  const res = await request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey()}`,
    { data: { email, password, returnSecureToken: true } }
  );
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`login ไม่สำเร็จสำหรับ ${email} (HTTP ${res.status()}): ${body}`);
  }
  const body = await res.json();
  return { idToken: body.idToken, uid: body.localId };
}

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** อ่านเอกสารเดียวผ่าน Firestore REST — ส่ง idToken = null เพื่อจำลอง "ไม่ได้ login" */
export function readDoc(request, docPath, idToken) {
  return request.get(`${FS_BASE}/${docPath}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    failOnStatusCode: false,
  });
}

/** อ่านทั้ง collection ผ่าน Firestore REST */
export function listCollection(request, collection, idToken) {
  return request.get(`${FS_BASE}/${collection}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    failOnStatusCode: false,
  });
}

/** หา formula ของ uid ที่ระบุ 1 ใบ — คืน id หรือ null */
export async function findFormulaIdOf(request, uid, idToken) {
  const res = await request.post(`${FS_BASE}:runQuery`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      structuredQuery: {
        from: [{ collectionId: "formulas" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "perfumerId" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
        limit: 1,
      },
    },
    failOnStatusCode: false,
  });
  if (!res.ok()) return null;
  const rows = await res.json();
  const doc = rows.find((r) => r.document)?.document;
  return doc ? doc.name.split("/").pop() : null;
}

/** นับจำนวน formula ทั้งหมดของ uid ที่ระบุ (ใช้ยืนยันว่าไม่มีเอกสารใหม่เกิดขึ้น) */
export async function countFormulasOf(request, uid, idToken) {
  const res = await request.post(`${FS_BASE}:runQuery`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      structuredQuery: {
        from: [{ collectionId: "formulas" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "perfumerId" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
      },
    },
    failOnStatusCode: false,
  });
  if (!res.ok()) throw new Error(`นับจำนวนสูตรไม่สำเร็จ: ${await res.text()}`);
  const rows = await res.json();
  return rows.filter((r) => r.document).length;
}

/** สร้าง formula ฉบับร่างให้บัญชีที่ระบุ (ใช้เป็น fixture ตอนบัญชีนั้นยังไม่มีสูตรเลย) */
export async function createDraftFormula(request, { uid, idToken, perfumerName, name }) {
  const res = await request.post(`${FS_BASE}/formulas`, {
    headers: { Authorization: `Bearer ${idToken}` },
    data: {
      fields: {
        name: { stringValue: name },
        perfumerId: { stringValue: uid },
        perfumerName: { stringValue: perfumerName },
        fragranceTypeId: { stringValue: "test-fixture" },
        fragranceTypeName: { stringValue: "Eau de Parfum" },
        brief: { stringValue: "ข้อมูลสมมติที่ชุดทดสอบสร้างขึ้น" },
        status: { stringValue: "draft" },
        aiIfraNote: { stringValue: "" },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    },
    failOnStatusCode: false,
  });
  if (!res.ok()) throw new Error(`สร้างสูตรตั้งต้นไม่สำเร็จ: ${await res.text()}`);
  const body = await res.json();
  return body.name.split("/").pop();
}

/** เข้าสู่ระบบผ่านหน้าจอจริง (ไม่ใช่ REST) เพื่อทดสอบ flow แบบที่ผู้ใช้เจอ */
export async function loginViaUi(page, { email, password }) {
  await page.goto("/login.html");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('#loginForm button[type="submit"]');
  await page.waitForURL("**/index.html", { timeout: 20_000 });
}
