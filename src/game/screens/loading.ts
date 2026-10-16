// Loading screen: black bg, game icon, % text. Faithful to the original
// (no progress bar is drawn by the original loader).
import { DESIGN_W, FONT_IMPACT } from "../constants";
import { Game, Screen } from "../engine";
import { Auth } from "../auth";
import { drawCentered, text } from "../ui";
import { LoginScreen } from "./login";
import { MenuScreen } from "./menu";

export class LoadingScreen implements Screen {
  private started = false;
  private done = false;
  private shownAt = 0;

  constructor(private game: Game, private minMs = 600) {}

  enter(): void {
    this.shownAt = performance.now();
    if (!this.started) {
      this.started = true;
      void this.game.assets.loadAll().then(() => {
        this.done = true;
      });
      // Ensure display fonts are ready before first text render.
      void document.fonts?.ready;
    }
  }

  exit(): void {}

  update(): void {
    if (this.done && performance.now() - this.shownAt >= this.minMs) {
      // Resume session when possible, otherwise ask for phone login.
      const u = Auth.currentUser();
      if (u) {
        this.game.state.phone = u.phone;
        this.game.state.loadWallet();
        this.game.state.newRace();
        this.game.show(new MenuScreen(this.game));
      } else {
        this.game.show(new LoginScreen(this.game));
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pct = Math.floor(this.game.assets.progress * 100);
    try {
      drawCentered(ctx, this.game.assets.img("200x200"), DESIGN_W / 2, 283, 200, 200);
    } catch {
      /* not loaded yet */
    }
    text(ctx, `${pct}%`, DESIGN_W / 2, 571, {
      font: FONT_IMPACT,
      size: 30,
      color: "#ffffff",
    });
  }

  pointerDown(): void {}
  pointerUp(): void {}
}
