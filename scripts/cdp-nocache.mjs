// Disable browser cache via CDP, then reload the page (used to capture the loading screen)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const tmp = "/var/folders/sv/1pxvrr157032h2nxlfrxxzw80000gn/T";
const dirs = readdirSync(tmp).filter((d) => d.startsWith("agent-browser-chrome"));
let port = "";
for (const d of dirs) {
  try {
    const p = readFileSync(join(tmp, d, "DevToolsActivePort"), "utf8")
      .split("\n")[0]
      .trim();
    const list = await (await fetch(`http://127.0.0.1:${p}/json/list`)).json();
    if (list.some((t) => t.type === "page")) {
      port = p;
      break;
    }
  } catch {
    /* try next */
  }
}
if (!port) {
  console.error("no debug port found");
  process.exit(1);
}

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find((t) => t.type === "page" && t.url.includes("horse_racing"));
if (!page) {
  console.error("page target not found", list.map((t) => t.url));
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};

await new Promise((r) => (ws.onopen = r));
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.enable");
send("Page.reload", { ignoreCache: true }).catch(() => {});
console.log("reloading with cache disabled; staying alive for 120s");
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 120000);
