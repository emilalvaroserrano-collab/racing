export type ServerState = {
  raceNumber: number;
  phase: "betting" | "racing" | "results";
  countdown: number;
  bets: { phone: string; kind: string; a: number; b: number; amount: number }[];
  horsesWithBets: number[];
  poolTotal: number;
  results: unknown;
};

type Handler = (state: ServerState) => void;

export class Network {
  private ws: WebSocket | null = null;
  private handlers: Handler[] = [];
  private raceStartHandlers: (() => void)[] = [];
  state: ServerState | null = null;
  phone: string | null = null;

  connect(): void {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.DEV
      ? "localhost:3001"
      : location.host;
    this.ws = new WebSocket(`${proto}://${host}`);

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "state" || msg.type === "init") {
          this.state = msg as ServerState;
          this.handlers.forEach((h) => h(this.state!));
        }
        if (msg.type === "race_start") {
          this.raceStartHandlers.forEach((h) => h());
        }
      } catch {}
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 2000);
    };
  }

  onState(h: Handler): void {
    this.handlers.push(h);
  }

  onRaceStart(h: () => void): void {
    this.raceStartHandlers.push(h);
  }

  send(msg: object): void {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  auth(phone: string): void {
    this.phone = phone;
    this.send({ type: "auth", phone });
  }

  placeBet(kind: string, a: number, b: number, amount: number): void {
    this.send({ type: "bet", kind, a, b, amount });
  }

  clearBets(): void {
    this.send({ type: "clear_bets" });
  }
}
