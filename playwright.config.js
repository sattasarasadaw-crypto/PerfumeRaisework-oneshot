import { defineConfig, devices } from "@playwright/test";

// repo นี้ถูกสร้างใหม่ทั้งชุดจาก spec.md และ **ยังไม่ได้ deploy ทับเว็บจริง**
// ค่าเริ่มต้นจึงทดสอบกับโค้ดใน repo นี้ผ่านเซิร์ฟเวอร์ในเครื่อง (tests/serve.mjs)
// ซึ่งเลียนแบบกติกา `hosting.ignore` ของ firebase.json ด้วย
//
// ถ้าอยากทดสอบกับเว็บที่ deploy แล้ว ให้ระบุ BASE_URL:
//   BASE_URL=https://sattasarasada-perfume.web.app npm test
const BASE_URL = process.env.BASE_URL;
const LOCAL_URL = `http://localhost:${process.env.PORT || 4173}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // รันทีละเทสต์ เพราะทุกเทสต์ใช้บัญชีจริงชุดเดียวกันบน Firebase project เดียวกัน
  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/report.json" }],
  ],

  use: {
    baseURL: BASE_URL || LOCAL_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  // ยิงเว็บจริงเมื่อไร ไม่ต้องปลุกเซิร์ฟเวอร์ในเครื่อง
  webServer: BASE_URL
    ? undefined
    : {
        command: "node tests/serve.mjs",
        url: LOCAL_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
