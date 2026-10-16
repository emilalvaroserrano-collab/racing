// Pari-mutuel pool ("hindi matatalo ang bangka").
//
// One WIN pool per race: every bettor's stake on every horse goes into a
// single pot. At lock (race start) the house takes its cut off the top and
// the rest is split pro-rata among whoever backed the winner:
//
//   dividend = (totalPool × (1 − HOUSE_TAKE)) / poolOnWinner
//   winner payout = stake × dividend
//
// Simulated crowd money seeds and trickles into the pool so estimated
// multipliers move live while betting is open. Crowd winnings leave the
// system (paid to the fictional crowd); only the player's share + the
// house take are real wallet movements.
import { HOUSE_TAKE } from "./constants";

export interface PoolSnapshot {
  total: number;
  take: number;
  net: number;
  onHorse: number[];
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

export class Pool {
  crowd: number[] = new Array(8).fill(0);
  player: number[] = new Array(8).fill(0);
  private snap: PoolSnapshot | null = null;

  constructor(strength: number[]) {
    // Favorites (high strength) attract bigger crowd pools → shorter price.
    for (let i = 0; i < 8; i++) {
      const v = 60 + (strength[i] ?? 0.5) * 220 + rnd(0, 120);
      this.crowd[i] = Math.max(20, Math.round(v));
    }
  }

  addPlayer(trap: number, amount: number): void {
    this.snap = null;
    this.player[trap] = Math.round((this.player[trap] + amount) * 100) / 100;
  }

  resetPlayer(): void {
    this.snap = null;
    this.player = new Array(8).fill(0);
  }

  onHorse(i: number): number {
    return this.crowd[i] + this.player[i];
  }

  total(): number {
    let s = 0;
    for (let i = 0; i < 8; i++) s += this.onHorse(i);
    return Math.round(s * 100) / 100;
  }

  net(): number {
    return Math.round(this.total() * (1 - HOUSE_TAKE) * 100) / 100;
  }

  /** Live estimated multiplier for a horse (0 when nothing is on it). */
  est(i: number): number {
    const o = this.onHorse(i);
    if (o <= 0) return 0;
    return Math.round((this.net() / o) * 100) / 100;
  }

  /** Simulated punters keep betting while the window is open. */
  trickle(strength: number[]): void {
    if (this.snap) return;
    const w = strength.map((s) => 0.2 + s);
    let sum = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    let pick = 0;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    this.crowd[pick] += Math.round(rnd(5, 50));
  }

  /** Lock at race start. Returns the final numbers (house take included). */
  lock(): PoolSnapshot {
    const onHorse = Array.from({ length: 8 }, (_, i) => this.onHorse(i));
    const total = Math.round(onHorse.reduce((a, b) => a + b, 0) * 100) / 100;
    const take = Math.round(total * HOUSE_TAKE * 100) / 100;
    const net = Math.round((total - take) * 100) / 100;
    this.snap = { total, take, net, onHorse };
    return this.snap;
  }

  /** Final dividend for the winner (0 when nobody backed it). */
  dividend(winner: number): number {
    const s = this.snap ?? this.lock();
    const o = s.onHorse[winner];
    if (o <= 0) return 0;
    return Math.round((s.net / o) * 100) / 100;
  }
}
