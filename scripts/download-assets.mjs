// Downloads every asset observed on the target page into public/, preserving
// the original path structure. Also probes bg_track_0..187 so the full
// parallax panorama is present even if the session never reached those frames.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = "https://showcase.codethislab.com/games/horse_racing/";
const OUT = new URL("../public/", import.meta.url).pathname;
const LIST = new URL("../docs/research/resource-urls.json", import.meta.url).pathname;

let urls = JSON.parse(readFileSync(LIST, "utf8"));
if (typeof urls[0] === "string" && urls[0].startsWith('["')) urls = JSON.parse(urls[0]);

for (let i = 0; i <= 187; i++) urls.push(`${BASE}sprites/bg_track/bg_track_${i}.jpg`);

const seen = new Set();
const queue = [];
for (const u of urls) {
  if (!u.startsWith(BASE)) continue;
  if (seen.has(u)) continue;
  const rel = u.slice(BASE.length).split("?")[0];
  // Skip third-party/game runtime JS — we are reimplementing the game, not copying it.
  if (rel.startsWith("js/")) continue;
  seen.add(u);
  queue.push([u, join(OUT, rel)]);
}
queue.push([`${BASE}favicon.ico`, join(OUT, "favicon.ico")]);
queue.push([
  `${BASE}css/motorwerkoblique-webfont.woff`,
  join(OUT, "css/motorwerkoblique-webfont.woff"),
]);
queue.push([`${BASE}css/impact-webfont.woff`, join(OUT, "css/impact-webfont.woff")]);
queue.push([`${BASE}css/ds-digib-webfont.woff`, join(OUT, "css/ds-digib-webfont.woff")]);

let ok = 0;
let fail = 0;
const failures = [];

async function worker() {
  while (queue.length) {
    const [url, dest] = queue.shift();
    if (!dest) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, buf);
      ok++;
    } catch (e) {
      fail++;
      failures.push(`${url} -> ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 6 }, worker));
console.log(`downloaded ${ok}, failed ${fail}`);
if (failures.length) {
  writeFileSync(new URL("../docs/research/asset-failures.txt", import.meta.url).pathname, failures.join("\n"));
  console.log(failures.slice(0, 10).join("\n"));
}
