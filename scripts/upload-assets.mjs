// Upload public/sprites and public/sounds to the public game-assets bucket.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..", "public");
const groups = ["sprites", "sounds"];

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.isFile() && !ent.name.startsWith(".")) out.push(p);
  }
  return out;
}

const mime = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const bucketRes = await fetch(`${URL}/storage/v1/bucket`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ id: "game-assets", name: "game-assets", public: true }),
});
if (!bucketRes.ok && bucketRes.status !== 409) {
  const text = await bucketRes.text();
  if (!text.includes("already exists")) {
    console.error("bucket", bucketRes.status, text.slice(0, 240));
    process.exit(1);
  }
}

const files = [];
for (const g of groups) files.push(...(await walk(path.join(root, g))));

let ok = 0;
let fail = 0;
async function upload(file) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  const type = mime[path.extname(file).toLowerCase()] || "application/octet-stream";
  const body = await readFile(file);
  const res = await fetch(`${URL}/storage/v1/object/game-assets/${rel}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": type,
      "x-upsert": "true",
      "cache-control": "public, max-age=3600",
    },
    body,
  });
  if (!res.ok) {
    fail++;
    const text = await res.text();
    console.error("fail", rel, res.status, text.slice(0, 160));
    return;
  }
  ok++;
  if (ok % 25 === 0) console.log(`uploaded ${ok}/${files.length}`);
}

const queue = files.slice();
async function worker() {
  for (;;) {
    const file = queue.pop();
    if (!file) return;
    await upload(file);
  }
}
await Promise.all(Array.from({ length: 8 }, () => worker()));
console.log(`done ok=${ok} fail=${fail} total=${files.length}`);
if (fail) process.exit(1);
