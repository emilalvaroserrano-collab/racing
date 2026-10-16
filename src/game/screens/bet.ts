// Bet screen: server-driven centralized betting with race number.
// Bets go to the WebSocket server; countdown auto-starts when 2+ horses
// have bets from any players. No manual start button.
import {
  BetKind,
  CHIP_VALUES,
  CURRENCY,
  FONT_DIGI,
  FONT_IMPACT,
  FONT_MOTOR,
  Odds,
  TRAPS,
  fmtMoney,
  fmtOdds,
} from "../constants";
import { Game, Screen } from "../engine";
import { HORSE_A_FRAMES, THUMB_FRAME } from "../horseFrames";
import { drawCentered, drawStateHalf, text } from "../ui";
import { renderMsgDialog } from "./dialogs";
import { MenuScreen } from "./menu";
import { RaceScreen } from "./race";

const PANEL = { x: 51, y: 170, w: 943, h: 508 };

const L_TRAP = { x0: 71, x1: 184 };
const L_COLS = [239.5, 350.5, 462.5];
const R_TRAP = { x0: 519, x1: 632 };
const R_COLS = [687.5, 798.5, 910.5];
const ROWS = [256, 374, 492, 610];
const HEADERS = ["TRAP", "WINS", "PLACE", "SHOW"];

const FC_COL_X0 = [20, 244, 468, 692];
const FC_ROW_Y0 = 13;
const FC_ROW_PITCH = 37;

const RIGHT_X = 1036;
const RIGHT_W = 146;

export class BetScreen implements Screen {
  private warn: string | null = null;
  private raceNumber = 0;
  private phase: string = "betting";
  private countdown = 0;
  private poolTotal = 0;
  private horsesWithBets: number[] = [];
  private myBets: { kind: string; a: number; b: number; amount: number }[] = [];
  private selectedChip = 0;
  private betPage = 0;

  constructor(private game: Game) {
    this.game.net.onState((s) => {
      this.raceNumber = s.raceNumber;
      this.phase = s.phase;
      this.countdown = s.countdown;
      this.poolTotal = s.poolTotal;
      this.horsesWithBets = s.horsesWithBets;
      this.myBets = s.bets.filter((b) => b.phone === this.game.net.phone);
      if (s.phase === "racing") {
        this.game.show(new RaceScreen(this.game));
      }
    });
  }

  enter(): void {
    this.game.sound.musicMode = "bet";
    this.game.sound.soundtrack(true);
    this.game.sound.announcer();
    this.warn = null;
  }
  exit(): void {
    this.game.sound.soundtrack(false);
    this.game.sound.stopAnnouncer();
  }
  update(): void {}

  private backedCount(): number {
    return this.horsesWithBets.length;
  }

  private corners(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const B = g.buttons;
    const mk = (x: number, kind: "fs" | "au" | "x") => {
      const b = {
        x, y: 48, w: 55, h: 56,
        onTap: () => {
          if (kind === "fs") {
            g.sound.click();
            g.fullscreen(!document.fullscreenElement);
          } else if (kind === "au") {
            g.sound.click();
            g.sound.setMuted(!g.sound.muted);
            g.state.muted = g.sound.muted;
          } else {
            g.sound.click();
            g.show(new MenuScreen(g));
          }
        },
      };
      B.add(b);
      const s = B.isPressed(b) ? 0.92 : 1;
      const cx = b.x + 27.5;
      const cy = b.y + 28;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      if (kind === "fs") drawStateHalf(ctx, g.assets, "but_fullscreen", document.fullscreenElement ? 1 : 0, b.x, b.y);
      else if (kind === "au") drawStateHalf(ctx, g.assets, "audio_icon", g.sound.muted ? 1 : 0, b.x, b.y);
      else ctx.drawImage(g.assets.img("but_exit"), b.x, b.y, b.w, b.h);
      ctx.restore();
    };
    mk(1113, "fs");
    mk(1169, "au");
    mk(1225, "x");
  }

  private rightColumn(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const B = g.buttons;
    const A = g.assets;

    const cb = {
      x: RIGHT_X, y: 272, w: RIGHT_W, h: 38,
      onTap: () => {
        if (this.myBets.length > 0) {
          g.sound.click();
          g.net.clearBets();
        }
      },
    };
    B.add(cb);
    {
      const s = B.isPressed(cb) ? 0.95 : 1;
      ctx.save();
      ctx.translate(RIGHT_X + RIGHT_W / 2, 291);
      ctx.scale(s, s);
      ctx.translate(-(RIGHT_X + RIGHT_W / 2), -291);
      ctx.drawImage(A.img("but_clear_bet"), RIGHT_X, 272, RIGHT_W, 38);
      text(ctx, "CLEAR BET", RIGHT_X + RIGHT_W / 2, 292, { font: FONT_IMPACT, size: 26, color: "#ffffff" });
      ctx.restore();
    }

    text(ctx, `MIN BET: 1${CURRENCY}`, RIGHT_X + RIGHT_W / 2, 324, { font: FONT_DIGI, size: 19, color: "#ffe14d" });
    text(ctx, `MAX BET: 100${CURRENCY}`, RIGHT_X + RIGHT_W / 2, 345, { font: FONT_DIGI, size: 19, color: "#ffe14d" });

    const myTotal = this.myBets.reduce((s, b) => s + b.amount, 0);
    const readout = (y: number, label: string, value: string) => {
      ctx.drawImage(A.img("money_panel"), RIGHT_X, y, RIGHT_W, 49);
      text(ctx, label, RIGHT_X + 14, y + 9, { font: FONT_MOTOR, size: 13, color: "#9fd0ff", align: "left" });
      text(ctx, value, RIGHT_X + RIGHT_W / 2, y + 30, { font: FONT_DIGI, size: 32, color: "#ffe14d" });
    };
    readout(361, "BET", `${CURRENCY}${myTotal}`);
    readout(422, "MONEY", `${CURRENCY}${g.state.money}`);
    text(ctx, `POOL ${CURRENCY}${this.poolTotal}`, RIGHT_X + RIGHT_W / 2, 478, {
      font: FONT_DIGI, size: 16, color: "#9fd0ff",
    });

    ctx.drawImage(A.img("fiche_panel"), RIGHT_X, 483, RIGHT_W, 97);
    CHIP_VALUES.forEach((v, i) => {
      const cx = RIGHT_X + 23 + (i % 3) * 50;
      const cy = 507 + Math.floor(i / 3) * 46;
      const b = {
        x: cx - 22, y: cy - 22, w: 44, h: 44,
        onTap: () => {
          g.sound.click();
          this.selectedChip = i;
        },
      };
      B.add(b);
      if (this.selectedChip === i) drawCentered(ctx, A.img("fiche_highlight"), cx, cy, 59, 59);
      drawCentered(ctx, A.img(`fiche_${i}`), cx, cy, 43, 44);
      text(ctx, String(v), cx, cy + 1, { font: FONT_IMPACT, size: 21, color: "#ffffff" });
    });

    // Race number + countdown status
    text(ctx, `RACE ${this.raceNumber}`, RIGHT_X + RIGHT_W / 2, 588, {
      font: FONT_DIGI, size: 18, color: "#9fd0ff",
    });
    if (this.phase === "betting") {
      if (this.backedCount() < 2) {
        text(ctx, "BACK 2+ HORSES", RIGHT_X + RIGHT_W / 2, 612, {
          font: FONT_DIGI, size: 14, color: "#9fd0ff",
        });
      } else {
        const s = Math.ceil(this.countdown);
        text(ctx, `LOCK ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, RIGHT_X + RIGHT_W / 2, 612, {
          font: FONT_DIGI, size: 16, color: "#ffe14d",
        });
      }
    }
  }

  private badge(ctx: CanvasRenderingContext2D, trap: number, cx: number, cy: number, size: number): void {
    const sx = (trap % 4) * 72;
    const sy = Math.floor(trap / 4) * 72;
    ctx.drawImage(this.game.assets.img("bibs"), sx, sy, 72, 72, cx - size / 2, cy - size / 2, size, size);
  }

  private myAmount(kind: BetKind, a: number, b = -1): number {
    return this.myBets
      .filter((bet) => bet.kind === kind && bet.a === a && (b < 0 || bet.b === b))
      .reduce((s, bet) => s + bet.amount, 0);
  }

  private betCellButton(kind: BetKind, a: number, b: number, x: number, y: number, w: number, h: number): void {
    this.game.buttons.add({
      x: x - w / 2, y: y - h / 2, w, h,
      onTap: () => {
        const amt = CHIP_VALUES[this.selectedChip];
        this.game.net.placeBet(kind, a, b, amt);
        this.game.sound.chip();
      },
    });
  }

  private simpleRow(ctx: CanvasRenderingContext2D, trap: number, y: number, trapBox: { x0: number; x1: number }, cols: number[], kinds: BetKind[], odds: Odds): void {
    const g = this.game;
    const A = g.assets;
    const tCx = (trapBox.x0 + trapBox.x1) / 2;

    const hs = A.img(`horse_${trap + 1}_a`);
    const [fx, fy, fw, fh] = HORSE_A_FRAMES[trap + 1][THUMB_FRAME];
    const tw = 120;
    const th = (tw / fw) * fh;
    ctx.drawImage(hs, fx, fy, fw, fh, tCx - tw / 2, y - 52, tw, th);
    this.badge(ctx, trap, trapBox.x0 + 20, y - 30, 36);
    text(ctx, TRAPS[trap].name, tCx, y + 66, { font: FONT_MOTOR, size: 17, color: "#ffffff" });

    cols.forEach((cx, i) => {
      const kind = kinds[i];
      const amt = this.myAmount(kind, trap);
      if (amt <= 0) drawCentered(ctx, A.img("bet_place"), cx, y - 18, 68, 53);
      else {
        drawCentered(ctx, A.img("fiche_0"), cx, y - 18, 43, 44);
        text(ctx, fmtMoney(amt), cx, y + 12, { font: FONT_IMPACT, size: 20, color: "#ffffff" });
      }
      if (kind === "win") {
        const e = this.poolTotal > 0 ? (this.poolTotal * 0.9) / Math.max(1, this.myAmount("win", trap)) : 0;
        text(ctx, e > 1 ? `x${e.toFixed(2)}` : "-", cx, y + 43, {
          font: FONT_IMPACT, size: 26, color: "#ffe14d",
        });
      } else {
        const o = kind === "place" ? odds.place[trap] : odds.show[trap];
        text(ctx, fmtOdds(o), cx, y + 43, { font: FONT_IMPACT, size: 30, color: "#ffffff" });
      }
      this.betCellButton(kind, trap, -1, cx, y - 10, 76, 100);
    });
  }

  private simplePage(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const A = g.assets;
    ctx.drawImage(A.img("simple_bet_panel"), PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    HEADERS.forEach((h, i) => {
      const xs = [127.5, L_COLS[0], L_COLS[1], L_COLS[2]];
      text(ctx, h, xs[i], PANEL.y + 22, { font: FONT_IMPACT, size: 30, color: "#ffffff", spacing: 2 });
    });
    HEADERS.forEach((h, i) => {
      const xs = [575.5, R_COLS[0], R_COLS[1], R_COLS[2]];
      text(ctx, h, xs[i], PANEL.y + 22, { font: FONT_IMPACT, size: 30, color: "#ffffff", spacing: 2 });
    });
    const kinds: BetKind[] = ["win", "place", "show"];
    for (let r = 0; r < 4; r++) {
      this.simpleRow(ctx, r, ROWS[r], L_TRAP, L_COLS, kinds, g.state.odds);
      this.simpleRow(ctx, r + 4, ROWS[r], R_TRAP, R_COLS, kinds, g.state.odds);
    }
  }

  private forecastPage(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const A = g.assets;
    ctx.drawImage(A.img("forecast_panel"), PANEL.x, PANEL.y, PANEL.w, 509);
    for (let c = 0; c < 4; c++) {
      const x0 = PANEL.x + FC_COL_X0[c];
      for (let r = 0; r < 14; r++) {
        const a = r < 7 ? c : c + 4;
        const b = orderIndex(a, r % 7);
        const y = PANEL.y + FC_ROW_Y0 + r * FC_ROW_PITCH;
        this.badge(ctx, a, x0 + 31, y, 30);
        text(ctx, "x", x0 + 57, y, { font: FONT_IMPACT, size: 19, color: "#ffffff" });
        this.badge(ctx, b, x0 + 81, y, 30);
        const o = g.state.odds.forecast[a][b];
        drawCentered(ctx, A.img("odd_bg"), x0 + 131, y, 92, 36);
        text(ctx, fmtOdds(o), x0 + 131, y - 1, { font: FONT_IMPACT, size: 24, color: "#ffffff" });
        const amt = this.myAmount("forecast", a, b);
        if (amt <= 0) drawCentered(ctx, A.img("bet_place"), x0 + 189, y, 52, 41);
        else {
          drawCentered(ctx, A.img("fiche_0"), x0 + 189, y - 8, 34, 35);
          text(ctx, fmtMoney(amt), x0 + 189, y + 14, { font: FONT_IMPACT, size: 15, color: "#ffffff" });
        }
        this.betCellButton("forecast", a, b, x0 + 112, y, 210, 35);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const A = g.assets;
    ctx.drawImage(A.img("bg_bet_panel"), 0, 0, 1280, 876);

    g.buttons.clear();
    if (this.betPage === 0) this.simplePage(ctx);
    else this.forecastPage(ctx);

    const prev = {
      x: 36, y: 358, w: 33, h: 135,
      onTap: () => {
        g.sound.click();
        this.betPage = this.betPage === 0 ? 1 : 0;
      },
    };
    const next = {
      x: 1096, y: 358, w: 33, h: 135,
      onTap: () => {
        g.sound.click();
        this.betPage = this.betPage === 0 ? 1 : 0;
      },
    };
    g.buttons.add(prev);
    g.buttons.add(next);
    ctx.drawImage(A.img("arrow_left"), prev.x, prev.y, 33, 135);
    ctx.drawImage(A.img("arrow_right"), next.x, next.y, 33, 135);

    this.rightColumn(ctx);
    this.corners(ctx);

    if (this.warn) {
      const w = this.warn;
      renderMsgDialog(ctx, g, g.buttons, w, () => {
        this.warn = null;
      });
    }
  }

  pointerDown(): void {}
  pointerUp(): void {}
}

function orderIndex(a: number, k: number): number {
  let n = -1;
  for (let i = 0; i < 8; i++) {
    if (i === a) continue;
    n++;
    if (n === k) return i;
  }
  return (a + 1) % 8;
}
