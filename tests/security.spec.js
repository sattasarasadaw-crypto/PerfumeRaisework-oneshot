// security.spec.js — เทสต์ความปลอดภัย (ข้อ 4, 5 ของการบ้าน + ข้อ 6 เรื่องคีย์ AI)
//
// 🚫 ห้ามผ่อนเงื่อนไขในไฟล์นี้เพื่อให้เทสต์ผ่าน
//    ถ้าข้อ 4 หรือ 5 ไม่ผ่าน = ข้อมูลผู้ใช้รั่วจริง ต้องกลับไปแก้ firestore.rules
//    ถ้าข้อ 6 ไม่ผ่าน = คีย์ AI ถูกเสิร์ฟออกไปจริง ต้องแก้ firebase.json แล้ว deploy ใหม่

import { test, expect } from "@playwright/test";
import {
  loadAccounts,
  signIn,
  readDoc,
  listCollection,
  findFormulaIdOf,
  createDraftFormula,
  loginViaUi,
  SETUP_HINT,
  BASE_URL,
} from "./helpers.js";

const accounts = loadAccounts();

test.describe("🔒 T4 — ไม่ล็อกอินแล้วต้องอ่านข้อมูลไม่ได้", () => {
  test("T4a: เปิดหน้ารายการสูตรทั้งที่ยังไม่ล็อกอิน ต้องถูกเด้งไปหน้า login", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForURL("**/login.html", { timeout: 20_000 });
    expect(page.url()).toContain("login.html");
  });

  test("T4b: ยิง Firestore ตรง ๆ โดยไม่มี token ต้องถูกปฏิเสธ (ไม่ใช่แค่ UI ซ่อนไว้)", async ({ request }) => {
    const res = await listCollection(request, "formulas", null);
    expect(res.status(), "ต้องไม่ใช่ 200 — 200 แปลว่าใครก็อ่านสูตรทุกใบได้โดยไม่ต้องล็อกอิน").not.toBe(200);
    expect([401, 403]).toContain(res.status());
    expect(await res.text()).toMatch(/PERMISSION_DENIED|UNAUTHENTICATED|Missing or insufficient permissions/i);
  });
});

test.describe("🔒 T5 — บัญชีที่สองต้องเปิดข้อมูลของบัญชีแรกไม่ได้", () => {
  test.skip(!accounts, SETUP_HINT);

  let formulaIdOfA;
  let formulaNameOfA;
  let tokenB;

  test.beforeAll(async ({ request }) => {
    const a = await signIn(request, accounts.perfumerA);
    const b = await signIn(request, accounts.perfumerB);
    tokenB = b.idToken;

    // บัญชี B ต้องเป็น perfumer เท่านั้น — ถ้าเป็น qc_reviewer จะเห็นทุกสูตรตามสิทธิ์ที่ถูกต้อง
    // แล้วเทสต์นี้จะวัดอะไรไม่ได้เลย
    const roleRes = await readDoc(request, `users/${b.uid}`, b.idToken);
    const roleBody = await roleRes.json();
    const roleB = roleBody?.fields?.role?.stringValue;
    expect(
      roleB,
      "บัญชีทดสอบที่สอง (perfumerB) ต้องมี role เป็น perfumer ไม่ใช่ qc_reviewer มิฉะนั้นเทสต์นี้วัดการรั่วไม่ได้"
    ).toBe("perfumer");

    formulaNameOfA = `สูตรทดสอบสิทธิ์ ${Date.now()}`;
    formulaIdOfA =
      (await findFormulaIdOf(request, a.uid, a.idToken)) ??
      (await createDraftFormula(request, {
        uid: a.uid,
        idToken: a.idToken,
        perfumerName: "ผู้ใช้ทดสอบ A",
        name: formulaNameOfA,
      }));
    expect(formulaIdOfA, "ต้องมีสูตรของบัญชี A อย่างน้อย 1 ใบเพื่อใช้ทดสอบ").toBeTruthy();
  });

  test("T5a: บัญชี B ยิง Firestore อ่านสูตรของบัญชี A ตรง ๆ ต้องถูกปฏิเสธ", async ({ request }) => {
    const res = await readDoc(request, `formulas/${formulaIdOfA}`, tokenB);
    expect(res.status(), "200 แปลว่าบัญชีอื่นอ่านสูตรของคนอื่นได้ = ข้อมูลรั่ว").not.toBe(200);
    expect([401, 403]).toContain(res.status());
  });

  test("T5b: บัญชี B ยิง sub-collection ingredients ของสูตรบัญชี A ต้องถูกปฏิเสธด้วย", async ({ request }) => {
    const res = await listCollection(request, `formulas/${formulaIdOfA}/ingredients`, tokenB);
    expect(res.status(), "วัตถุดิบต้องสืบสิทธิ์จากเอกสารแม่ ไม่ใช่เปิดอ่านได้อิสระ").not.toBe(200);
  });

  test("T5c: บัญชี B เปิดหน้ารายละเอียดสูตรของบัญชี A ผ่าน URL ตรง ต้องไม่เห็นข้อมูล", async ({ page }) => {
    await loginViaUi(page, accounts.perfumerB);
    await page.goto(`/formula-detail.html?id=${formulaIdOfA}`);

    // สเปคไม่ได้บังคับข้อความ — สิ่งที่บังคับคือ "ต้องไม่เห็นข้อมูลของคนอื่น"
    const content = page.locator("#contentArea");
    await expect(content.locator(".error-message"), "ต้องขึ้นข้อความแจ้งว่าเปิดไม่ได้").toBeVisible({
      timeout: 20_000,
    });
    await expect(content, "ห้ามมีวัตถุดิบของสูตรคนอื่นโผล่ออกมา").not.toContainText("Bergamot");
    await expect(page.locator(".status-badge"), "ห้ามแสดงสถานะสูตรของคนอื่น").toHaveCount(0);
  });
});

test.describe("🔒 T6 — คีย์ AI ต้องไม่ถูกเสิร์ฟออกไปให้ใครโหลดได้", () => {
  // เทสต์นี้เพิ่มเองหลังพบว่า repo รุ่นก่อนหน้าเสิร์ฟ /config.local.js แบบ public จริง
  // และคายคีย์ OpenRouter ของหลักสูตรออกมาทั้งดุ้น (ดู BACKLOG.md ข้อ 1)
  //
  // ตอนรันในเครื่อง tests/serve.mjs เลียนแบบ `hosting.ignore` ของ firebase.json
  // เทสต์นี้จึงวัดว่า "รายการ ignore ถูกตั้งไว้ถูกต้องไหม" ไม่ใช่แค่บังเอิญไม่มีไฟล์คีย์อยู่
  const KEY_PREFIX = ["sk", "or", "v1"].join("-") + "-";

  test("T6a: ไฟล์คีย์ต้องไม่ถูกเสิร์ฟ", async ({ request }) => {
    for (const p of ["/config.local.js", "/config.local.example.js"]) {
      const res = await request.get(`${BASE_URL}${p}`, { failOnStatusCode: false });
      expect(res.status(), `${p} ต้องไม่มีอยู่บนเว็บ`).toBe(404);
    }
  });

  test("T6b: ไฟล์ทุกไฟล์ที่เสิร์ฟอยู่ต้องไม่มีคำนำหน้าคีย์ OpenRouter อยู่ข้างใน", async ({ request }) => {
    const served = [
      "/index.html",
      "/login.html",
      "/signup.html",
      "/formula-new.html",
      "/formula-detail.html",
      "/firebase-config.js",
      "/ai-key.js",
    ];
    for (const p of served) {
      const res = await request.get(`${BASE_URL}${p}`, { failOnStatusCode: false });
      expect(res.status(), `${p} ต้องเปิดได้`).toBe(200);
      expect(await res.text(), `พบคีย์ AI ฝังอยู่ใน ${p}`).not.toContain(KEY_PREFIX);
    }
  });
});
