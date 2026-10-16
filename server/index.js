import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { RaceManager } from "./raceManager.js";
import * as db from "./db.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const TICK_MS = 100;

const rm = new RaceManager();

app.use(express.json());
app.use(express.static("../public"));

const clients = new Map();

wss.on("connection", (ws) => {
  const id = crypto.randomUUID();
  clients.set(id, { ws, phone: null, bets: [] });

  ws.send(JSON.stringify({ type: "init", raceNumber: rm.raceNumber, state: rm.state(), clients: clients.size }));

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw);
      void handleMessage(id, msg);
    } catch {}
  });

  ws.on("close", () => {
    const c = clients.get(id);
    if (c?.phone) rm.removeBets(c.phone);
    clients.delete(id);
    broadcastState();
    db.saveState(rm.state());
  });
});

async function handleMessage(id, msg) {
  const c = clients.get(id);
  if (!c) return;

  switch (msg.type) {
    case "auth":
      c.phone = msg.phone;
      ws_send(c, { type: "auth_ok", phone: msg.phone });
      broadcastState();
      break;

    case "bet": {
      if (!c.phone) return;
      const result = rm.placeBet(c.phone, msg.kind, msg.a, msg.b, msg.amount);
      ws_send(c, { type: "bet_result", ok: result.ok, reason: result.reason });
      if (result.ok) db.recordBet(rm.state(), { phone: c.phone, kind: msg.kind, a: msg.a, b: msg.b, amount: msg.amount });
      broadcastState();
      db.saveState(rm.state());
      break;
    }

    case "clear_bets":
      if (!c.phone) return;
      rm.removeBets(c.phone);
      broadcastState();
      db.saveState(rm.state());
      break;

    case "next_race":
      rm.nextRace();
      await db.ensureRace(rm);
      broadcastState();
      db.saveState(rm.state());
      break;
  }
}

function ws_send(c, obj) {
  if (c.ws.readyState === 1) c.ws.send(JSON.stringify(obj));
}

function broadcastState() {
  const s = rm.state();
  for (const c of clients.values()) ws_send(c, { type: "state", ...s });
}

const saved = await db.loadState();
if (saved) rm.hydrate(saved);
await db.ensureRace(rm);

setInterval(() => {
  const started = rm.tick(TICK_MS / 1000);
  if (started) {
    for (const c of clients.values()) ws_send(c, { type: "race_start", raceNumber: rm.raceNumber });
    db.saveState(rm.state());
  }
  broadcastState();
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Horse racing server on :${PORT}${db.enabled() ? " (supabase)" : ""}`);
});
