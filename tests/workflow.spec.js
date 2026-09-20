// workflow.spec.js — เทสต์เส้นทางหลักของระบบ (ข้อ 1, 2, 3 ของการบ้านสัปดาห์ที่ 9)
//
// 🚫 ห้ามแก้โค้ดของระบบเพื่อให้เทสต์ผ่าน — ถ้าไม่ผ่านให้แยกก่อนว่าโค้ดผิดหรือเทสต์เขียนผิด
//
// เทสต์ชุดนี้ยืนยัน "พฤติกรรมตามสเปค" ไม่ใช่รายละเอียดหน้าตา
// เช่น T1 ไม่ได้บังคับว่าบันทึกเสร็จแล้วต้องเด้งไปหน้าไหน (spec.md ไม่ได้ระบุไว้)
// แต่บังคับว่าสูตรต้องไปโผล่ในรายการของเจ้าของจริง ๆ

import { test, expect } from "@playwright/test";
import { loadAccounts, signIn, countFormulasOf, loginViaUi, SETUP_HINT } from "./helpers.js";

const accounts = loadAccounts();

// ข้อความบน badge ที่ผู้ใช้เห็น (ค่าในฐานข้อมูลยังเป็น draft/submitted ตาม spec.md หัวข้อ 4)
const BADGE = {
  draft: "ร่าง",
  submitted: "ส่งตรวจแล้ว",
};

/** รอให้ตัวเลือกประเภทน้ำหอมโหลดเสร็จจาก Firestore */
async function waitForFragranceTypes(page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#fragranceType");
      return el && [...el.options].some((o) => o.value !== "");
    },
    null,
    { timeout: 20_000 }
  );
}

test.describe.serial("เส้นทางหลัก: สร้างสูตร → เห็นในรายการ → ส่งตรวจ", () => {
  test.skip(!accounts, SETUP_HINT);

  // ชื่อไม่ซ้ำกันทุกครั้งที่รัน จะได้ไม่ชนกับข้อมูลเดิมในฐานข้อมูล
  const formulaName = `สูตรทดสอบอัตโนมัติ ${new Date().toISOString().slice(0, 19)}`;

  test("T1: นักปรุงสร้างสูตรใหม่แล้วต้องเห็นสูตรนั้นในรายการของตัวเอง", async ({ page }) => {
    await loginViaUi(page, accounts.perfumerA);

    // ปุ่ม "สร้างสูตรใหม่" ซ่อนอยู่จนกว่าจะโหลด role เสร็จ และโชว์เฉพาะ Perfumer
    const newBtn = page.locator("#newFormulaBtn");
    await expect(newBtn, "บัญชี A ต้องเป็น perfumer จึงจะเห็นปุ่มสร้างสูตรใหม่").toBeVisible({ timeout: 20_000 });
    await newBtn.click();
    await page.waitForURL("**/formula-new.html");
    await waitForFragranceTypes(page);

    await page.fill("#name", formulaName);
    await page.selectOption("#fragranceType", { index: 1 });
    await page.fill("#brief", "โจทย์สมมติสำหรับชุดทดสอบอัตโนมัติ ไม่ใช่ข้อมูลลูกค้าจริง");

    await page.click("#addIngredientBtn");
    await page.fill(".material-name", "Bergamot Oil");
    await page.fill(".material-percent", "5");

    await page.click('#formulaForm button[type="submit"]');

    // สเปคไม่ได้ระบุว่าบันทึกเสร็จต้องไปหน้าไหน — ขอแค่ออกจากฟอร์มได้สำเร็จ
    await page.waitForURL((url) => !url.pathname.endsWith("formula-new.html"), { timeout: 20_000 });

    // สิ่งที่สเปคบังคับจริง: สูตรต้องไปโผล่ในรายการของเจ้าของ พร้อมสถานะร่าง
    await page.goto("/index.html");
    const row = page.locator("tbody tr", { hasText: formulaName });
    await expect(row, "สูตรที่เพิ่งสร้างต้องอยู่ในรายการของเจ้าของ").toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(BADGE.draft);
  });

  test("T2: กดปุ่มส่งตรวจแล้วสถานะต้องเปลี่ยนจาก draft เป็น submitted", async ({ page }) => {
    await loginViaUi(page, accounts.perfumerA);

    const row = page.locator("tbody tr", { hasText: formulaName });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();
    await page.waitForURL("**/formula-detail.html?id=*");

    const badge = page.locator(".status-badge");
    await expect(badge).toHaveText(BADGE.draft);

    await page.click("#submitBtn");
    await expect(badge, "สถานะต้องกลายเป็น submitted หลังกดส่งตรวจ").toHaveText(BADGE.submitted, {
      timeout: 20_000,
    });

    // ปุ่มส่งตรวจต้องหายไปแล้ว — สเปคหัวข้อ 3: ปุ่มโผล่เฉพาะตอนสถานะ draft
    await expect(page.locator("#submitBtn")).toHaveCount(0);
  });

  test("T3: กรอกฟอร์มไม่ครบแล้วต้องไม่บันทึกลงฐานข้อมูล", async ({ page, request }) => {
    const a = await signIn(request, accounts.perfumerA);
    const countBefore = await countFormulasOf(request, a.uid, a.idToken);

    await loginViaUi(page, accounts.perfumerA);
    await page.goto("/formula-new.html");
    await waitForFragranceTypes(page);

    // กรอกแค่ชื่อ เว้นโจทย์กลิ่นและวัตถุดิบไว้
    await page.fill("#name", "สูตรที่กรอกไม่ครบ ไม่ควรถูกบันทึก");
    await page.click('#formulaForm button[type="submit"]');

    // ต้องยังอยู่หน้าฟอร์ม (บันทึกสำเร็จเมื่อไรจะออกจากหน้านี้)
    await page.waitForTimeout(2000);
    expect(page.url(), "กรอกไม่ครบแล้วต้องไม่ถูกพาออกจากฟอร์ม").toContain("formula-new.html");

    // ยืนยันจากฝั่งฐานข้อมูลว่าไม่มีเอกสารใหม่เกิดขึ้นจริง — นี่คือข้อที่สเปคบังคับ
    const countAfter = await countFormulasOf(request, a.uid, a.idToken);
    expect(countAfter, "ไม่ควรมีสูตรใหม่ถูกสร้างขึ้นจากฟอร์มที่กรอกไม่ครบ").toBe(countBefore);
  });
});
