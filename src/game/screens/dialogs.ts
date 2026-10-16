// Modal dialogs: dim + shared blue panel box + content + close X.
// Panel box source rect in the 1216x832 panel bitmaps: (369, 260, 477, 295).
// Destination: (385, 210, 515, 393) — measured from the original.
import { FONT_IMPACT, FONT_MOTOR } from "../constants";
import { Game } from "../engine";
import { Buttons, drawCentered, text } from "../ui";

export const DLG_BOX = { x: 385, y: 210, w: 515, h: 393 };
export const DLG_CX = DLG_BOX.x + DLG_BOX.w / 2; // 642.5
const SRC_BOX = { x: 369, y: 260, w: 477, h: 295 };
const CLOSE = { x: 830, y: 272, w: 55, h: 56 };

export function drawDim(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, 1280, 876);
}

export function drawPanelBox(ctx: CanvasRenderingContext2D, game: Game, which: "msg" | "win" | "lose"): void {
  const img = game.assets.img(which === "msg" ? "msg_box" : which === "win" ? "win_panel" : "lose_panel");
  ctx.drawImage(
    img,
    SRC_BOX.x, SRC_BOX.y, SRC_BOX.w, SRC_BOX.h,
    DLG_BOX.x, DLG_BOX.y, DLG_BOX.w, DLG_BOX.h,
  );
}

function drawClose(ctx: CanvasRenderingContext2D, game: Game, buttons: Buttons, onClose: () => void): void {
  const img = game.assets.img("but_exit");
  const b = { x: CLOSE.x, y: CLOSE.y, w: CLOSE.w, h: CLOSE.h, onTap: () => { game.sound.click(); onClose(); } };
  buttons.add(b);
  const s = buttons.isPressed(b) ? 0.92 : 1;
  const cx = CLOSE.x + CLOSE.w / 2;
  const cy = CLOSE.y + CLOSE.h / 2;
  drawCentered(ctx, img, cx, cy, CLOSE.w * s, CLOSE.h * s);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  str: string,
  maxW: number,
  font: string,
  size: number,
): string[] {
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const words = str.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  ctx.restore();
  return lines;
}

/** Generic message dialog. onClose fires when the X is tapped. */
export function renderMsgDialog(
  ctx: CanvasRenderingContext2D,
  game: Game,
  buttons: Buttons,
  message: string,
  onClose: () => void,
): void {
  drawDim(ctx);
  drawPanelBox(ctx, game, "msg");
  const lines = wrapLines(ctx, message, DLG_BOX.w - 90, FONT_IMPACT, 40);
  const lh = 52;
  const y0 = DLG_CX + 0; // vertical anchor handled below
  void y0;
  const startY = DLG_BOX.y + DLG_BOX.h / 2 - ((lines.length - 1) * lh) / 2 + 6;
  lines.forEach((ln, i) => {
    text(ctx, ln, DLG_CX, startY + i * lh, { font: FONT_IMPACT, size: 40, color: "#ffffff" });
  });
  drawClose(ctx, game, buttons, onClose);
}

export function renderCreditsDialog(
  ctx: CanvasRenderingContext2D,
  game: Game,
  buttons: Buttons,
  onClose: () => void,
): void {
  drawDim(ctx);
  drawPanelBox(ctx, game, "msg");
  drawCentered(ctx, game.assets.img("logo_ctl"), DLG_CX, 330, 300, 61);
  text(ctx, "www.codethislab.com", DLG_CX, 480, {
    font: FONT_MOTOR,
    size: 34,
    color: "#ffffff",
  });
  drawClose(ctx, game, buttons, onClose);
}
