import "./style.css";
import { Game } from "./game/engine";
import { Auth } from "./game/auth";
import { LoadingScreen } from "./game/screens/loading";

const canvas = document.getElementById("game") as HTMLCanvasElement | null;
if (!canvas) throw new Error("#game canvas missing");

const game = new Game(canvas);
void Auth.init().then(() => {
  game.show(new LoadingScreen(game));
});
game.run();

// Exposed for automated QA/debugging.
(window as unknown as { __game: Game }).__game = game;
(window as unknown as Record<string, unknown>).__game = game;
