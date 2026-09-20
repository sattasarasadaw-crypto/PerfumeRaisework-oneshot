// ai-key.js — หาคีย์ OpenRouter ตอน "กดปุ่ม AI" โดยไม่ฝังคีย์ลงไฟล์ที่ commit หรือ deploy ได้
//
// ทำไมต้องมีไฟล์นี้:
// repo รุ่นก่อนหน้าให้ปุ่ม AI `import` คีย์จาก ./config.local.js ตรง ๆ และปล่อยให้ไฟล์นั้น
// ถูก deploy ขึ้น Firebase Hosting ด้วย ผลคือใครก็ได้เปิด https://<โดเมน>/config.local.js
// แล้วก๊อปคีย์ไปใช้ได้ทันที — คีย์ไม่เคยขึ้น GitHub ก็จริง แต่ "หลุดทางเว็บ" อยู่ดี
//
// 🔑 บทเรียน: `.gitignore` กันได้แค่ GitHub — ไม่ได้กันการ deploy
//    ต้องกันที่ `firebase.json` → `hosting.ignore` อีกชั้นเสมอ (ดู CLAUDE.md)
//
// ลำดับการหาคีย์:
//   1) sessionStorage — คีย์ที่ผู้ใช้วางเองในแท็บนี้ (หายเมื่อปิดแท็บ)
//   2) ./config.local.js — มีเฉพาะตอนรันในเครื่องตัวเอง บนเว็บจริงไฟล์นี้ไม่ถูก deploy
//      import จึงล้มเหลว ซึ่งเป็นพฤติกรรมที่ถูกต้อง ไม่ใช่ error
//   3) ถามผู้ใช้ให้วางคีย์ของตัวเอง
//
// ⚠️ นี่ยังไม่ใช่ทางแก้ที่ถูกต้องที่สุด — คีย์ยังไปโผล่ในเบราว์เซอร์ของผู้ใช้อยู่ดี
//    ทางแก้จริงคือย้ายการเรียก AI ไปฝั่งเซิร์ฟเวอร์ที่ผู้ใช้แตะไม่ได้ (ดู BACKLOG.md ข้อ 1.1)

const SESSION_KEY = "openrouter_api_key";

const PROMPT_TEXT =
  "ใส่คีย์ OpenRouter เพื่อใช้ปุ่ม AI\n\n" +
  "• คีย์จะถูกเก็บไว้แค่ในแท็บนี้ (sessionStorage) และหายไปเมื่อปิดแท็บ\n" +
  "• ระบบไม่เคยบันทึกคีย์ลงฐานข้อมูล และไม่มีคีย์ฝังอยู่ในเว็บนี้\n" +
  "• กด Cancel ได้ถ้าไม่ต้องการใช้ปุ่ม AI — ฟังก์ชันอื่นทั้งหมดยังใช้ได้ตามปกติ";

/** คืนค่าคีย์ OpenRouter หรือ null ถ้าผู้ใช้ไม่ให้คีย์ */
export async function getOpenRouterKey() {
  try {
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) return fromSession;
  } catch {
    // sessionStorage ถูกปิด (โหมดส่วนตัวบางเบราว์เซอร์) — ข้ามไปถามผู้ใช้แทน
  }

  // มีเฉพาะตอนรันในเครื่อง — บนเว็บจริงไฟล์นี้ไม่ถูก deploy จึง import ไม่สำเร็จโดยตั้งใจ
  try {
    const mod = await import("./config.local.js");
    const localKey = (mod.OPENROUTER_API_KEY || "").trim();
    if (localKey && localKey.startsWith("sk-")) return localKey;
  } catch {
    // ไม่มีไฟล์คีย์ในเครื่อง = พฤติกรรมปกติของเว็บที่ deploy แล้ว ไม่ใช่ข้อผิดพลาด
  }

  const pasted = (window.prompt(PROMPT_TEXT) || "").trim();
  if (!pasted) return null;

  try {
    sessionStorage.setItem(SESSION_KEY, pasted);
  } catch {
    // เก็บไม่ได้ก็ยังใช้คีย์รอบนี้ได้ แค่ต้องวางใหม่ในครั้งถัดไป
  }
  return pasted;
}

/** ลืมคีย์ที่เก็บไว้ในแท็บนี้ (เรียกเมื่อ OpenRouter ตอบว่าคีย์ใช้ไม่ได้ จะได้ขอใหม่รอบหน้า) */
export function forgetOpenRouterKey() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}
