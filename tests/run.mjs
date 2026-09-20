// run.mjs — รันชุดทดสอบ แล้วสร้าง test-results.md จาก "ผลจริง" ที่ Playwright รายงานมา
//
// ทำไมต้องสร้างรายงานอัตโนมัติ:
// การบ้านห้ามเขียนรายงานให้สวยกว่าผลจริง — ถ้ารายงานถูกสร้างจาก report.json โดยตรง
// ก็ไม่มีทางที่ตัวเลขในรายงานจะไม่ตรงกับผลที่รันจริง
//
// ใช้: npm test          (รันทั้งหมดแล้วเขียนรายงาน)
//      npm run test:ui   (เปิดโหมดดูด้วยตา ไม่เขียนรายงาน)

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..");   // repo นี้วาง tests/ ไว้ที่ root เลย
const reportJson = path.join(repoRoot, "test-results", "report.json");
const outFile = path.join(repoRoot, "test-results.md");

const run = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (!fs.existsSync(reportJson)) {
  console.error("\n❌ ไม่พบ test-results/report.json — ชุดทดสอบไม่ได้เริ่มรัน จึงยังไม่เขียนรายงาน");
  process.exit(run.status ?? 1);
}

const report = JSON.parse(fs.readFileSync(reportJson, "utf8"));

/** ไล่เก็บทุก test ออกมาเป็นรายการแบน ๆ */
function collect(suites, trail = []) {
  const out = [];
  for (const s of suites ?? []) {
    const name = [...trail, s.title].filter(Boolean);
    for (const spec of s.specs ?? []) {
      const result = spec.tests?.[0]?.results?.[0];
      out.push({
        group: name[name.length - 1] ?? "",
        title: spec.title,
        status: spec.tests?.[0]?.status ?? result?.status ?? "unknown",
        durationMs: result?.duration ?? 0,
        error: (result?.error?.message ?? "").replace(/\[\d+m/g, "").trim(),
      });
    }
    out.push(...collect(s.suites, name));
  }
  return out;
}

const tests = collect(report.suites);
const startedAt = new Date(report.stats?.startTime ?? Date.now());
const icon = { expected: "✅ ผ่าน", unexpected: "❌ ไม่ผ่าน", skipped: "⏭️ ข้าม", flaky: "⚠️ ไม่นิ่ง" };

const passed = tests.filter((t) => t.status === "expected").length;
const failed = tests.filter((t) => t.status === "unexpected").length;
const skipped = tests.filter((t) => t.status === "skipped").length;

const fmtBangkok = (d) =>
  new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(d);

const lines = [];
lines.push("# test-results.md — รายงานผลการทดสอบระบบ Formula Review");
lines.push("");
lines.push("> ⚙️ **ไฟล์นี้ถูกสร้างอัตโนมัติจากผลการรันจริง** โดย `tests/run.mjs` อ่านจาก");
lines.push("> `test-results/report.json` — ห้ามแก้ด้วยมือ");
lines.push("> สร้างใหม่ได้ด้วย `npm test` ที่ root ของ repo นี้");
lines.push("");
lines.push(`- **รันเมื่อ:** ${fmtBangkok(startedAt)} (เวลาไทย)`);
lines.push(`- **ทดสอบกับ:** ${process.env.BASE_URL || "https://sattasarasada-perfume.web.app"} (เว็บจริงที่ deploy แล้ว)`);
lines.push(`- **เครื่องมือ:** Playwright ${report.config?.version ?? ""} · Chromium`);
lines.push(`- **สรุป:** ✅ ผ่าน ${passed} · ❌ ไม่ผ่าน ${failed} · ⏭️ ข้าม ${skipped} (ทั้งหมด ${tests.length})`);
lines.push("");
lines.push("## ผลรายข้อ");
lines.push("");
lines.push("| # | กลุ่ม | ทดสอบอะไร | ผล | ใช้เวลา |");
lines.push("|---|---|---|---|---|");
tests.forEach((t, i) => {
  lines.push(
    `| ${i + 1} | ${t.group} | ${t.title} | ${icon[t.status] ?? t.status} | ${(t.durationMs / 1000).toFixed(1)}s |`
  );
});
lines.push("");

const failures = tests.filter((t) => t.status === "unexpected" || t.status === "flaky");
if (failures.length) {
  lines.push("## ❌ ข้อที่ไม่ผ่าน — ติดตรงไหน");
  lines.push("");
  for (const f of failures) {
    lines.push(`### ${f.title}`);
    lines.push("");
    lines.push("```");
    lines.push(f.error.split("\n").slice(0, 12).join("\n") || "(ไม่มีข้อความ error)");
    lines.push("```");
    lines.push("");
  }
  lines.push("> ข้อที่ไม่ผ่านถูกบันทึกต่อไว้ใน `BACKLOG.md` แล้ว");
  lines.push("");
}

const skippedTests = tests.filter((t) => t.status === "skipped");
if (skippedTests.length) {
  lines.push("## ⏭️ ข้อที่ถูกข้าม — เพราะอะไร");
  lines.push("");
  lines.push("เทสต์ที่ต้องเข้าสู่ระบบจะถูกข้ามอัตโนมัติเมื่อยังไม่ได้ตั้งค่าบัญชีทดสอบ");
  lines.push("(ตั้งใจออกแบบแบบนี้เพื่อไม่ให้มีอีเมล/รหัสผ่านอยู่ในไฟล์ที่ commit ได้)");
  lines.push("");
  lines.push("วิธีทำให้รันครบ — ที่ root ของ repo นี้:");
  lines.push("");
  lines.push("```bash");
  lines.push("cp tests/test-accounts.example.json tests/test-accounts.local.json");
  lines.push("# แก้ไฟล์ .local.json ใส่บัญชี perfumer 2 บัญชี แล้วรันใหม่");
  lines.push("npm test");
  lines.push("```");
  lines.push("");
}

lines.push("## เทสต์แต่ละข้อตรงกับข้อไหนของการบ้าน");
lines.push("");
lines.push("| ข้อการบ้าน (สัปดาห์ที่ 9 ส่วน B) | เทสต์ในชุดนี้ |");
lines.push("|---|---|");
lines.push("| ① เส้นทางหลัก — สร้างสูตรแล้วเห็นในรายการ | T1 |");
lines.push("| ② ปุ่มเปลี่ยนสถานะ — ส่งตรวจแล้วสถานะเปลี่ยน | T2 |");
lines.push("| ③ กรอกไม่ครบแล้วต้องไม่บันทึก | T3 |");
lines.push("| ④ 🔒 ไม่ล็อกอินแล้วอ่านข้อมูลไม่ได้ | T4a, T4b |");
lines.push("| ⑤ 🔒 บัญชีที่สองเปิดข้อมูลของบัญชีแรกไม่ได้ | T5a, T5b, T5c |");
lines.push("| (เพิ่มเอง) 🔒 คีย์ AI ต้องไม่หลุดขึ้นเว็บสาธารณะ | T6a, T6b |");
lines.push("");

fs.writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(`\n📊 เขียนรายงานแล้วที่ ${path.relative(process.cwd(), outFile)}`);
console.log(`   ✅ ${passed} · ❌ ${failed} · ⏭️ ${skipped}`);

process.exit(failed > 0 ? 1 : 0);
