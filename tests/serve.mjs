// serve.mjs — เสิร์ฟโฟลเดอร์ public/ ในเครื่อง สำหรับให้ชุดทดสอบยิงใส่
//
// ทำไมไม่ยิงเว็บจริงอย่างเดียว:
// repo นี้ถูกสร้างใหม่ทั้งชุดจาก spec.md และ **ยังไม่ได้ deploy ทับของเดิม**
// ถ้าเทสต์ยิงไปที่ URL จริง มันจะไปทดสอบโค้ดของ repo เก่า ไม่ใช่โค้ดในนี้
// เซิร์ฟเวอร์ตัวนี้จึงทำให้ชุดทดสอบวัด "โค้ดใน repo นี้" ได้ตรง ๆ
// (Firestore/Auth ยังเป็นของจริงบนคลาวด์ — localhost เป็น authorized domain ของ Firebase Auth อยู่แล้ว)
//
// 🔑 จุดสำคัญ: เซิร์ฟเวอร์นี้ **เคารพ `hosting.ignore` ใน firebase.json**
//    ไฟล์ไหนที่ Firebase จะไม่ deploy เซิร์ฟเวอร์นี้ก็ตอบ 404 เหมือนกัน
//    เทสต์ T6 (คีย์ต้องไม่หลุด) จึงวัดได้จริงว่า "รายการ ignore ถูกตั้งไว้ถูกต้องไหม"
//    ไม่ใช่แค่บังเอิญว่าเครื่องนี้ไม่มีไฟล์คีย์อยู่

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..");
const publicDir = path.join(repoRoot, "public");
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** อ่านรายการไฟล์ที่ firebase.json สั่งไม่ให้ deploy */
function hostingIgnoreList() {
  const cfg = JSON.parse(fs.readFileSync(path.join(repoRoot, "firebase.json"), "utf8"));
  return (cfg.hosting?.ignore ?? []).map((p) => p.replace(/^\*\*\//, ""));
}

const IGNORED = new Set(hostingIgnoreList());

function isIgnored(relPath) {
  const base = path.basename(relPath);
  // `**/.*` — ไฟล์ซ่อน
  if (base.startsWith(".")) return true;
  return IGNORED.has(base) || IGNORED.has(relPath);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");

  // กันออกนอกโฟลเดอร์ public/
  const filePath = path.join(publicDir, rel);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  if (isIgnored(rel)) {
    // เลียนแบบ Firebase Hosting: ไฟล์ที่อยู่ใน ignore ไม่เคยถูก deploy จึงไม่มีอยู่จริง
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found (hosting.ignore)");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" }).end(data);
  });
});

server.listen(PORT, () => {
  console.log(`เสิร์ฟ public/ ที่ http://localhost:${PORT}`);
  console.log(`ไฟล์ที่ไม่เสิร์ฟตาม firebase.json: ${[...IGNORED].join(", ")}`);
});
