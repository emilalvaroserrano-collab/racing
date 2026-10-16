"""Build contact sheets of downloaded sprites for visual inspection."""
from PIL import Image
import os

PUB = "/Users/masterdee/horse-racing-clone/public/sprites"
OUT = "/Users/masterdee/horse-racing-clone/docs/design-references/thumbs"


def load(path, max_w=None):
    im = Image.open(os.path.join(PUB, path)).convert("RGBA")
    if max_w and im.width > max_w:
        im = im.resize((max_w, int(im.height * max_w / im.width)), Image.LANCZOS)
    return im


def sheet(items, cols, bg=(30, 30, 30, 255), pad=8):
    """items: list of (label, image). Label rendered ON TOP of each image."""
    from PIL import ImageDraw
    # per-row heights so short rows stay tight
    rows_items = [items[i : i + cols] for i in range(0, len(items), cols)]
    row_h = []
    for row in rows_items:
        row_h.append(max(im.height for _, im in row) + 20)
    W = max(sum(im.width for _, im in row) + pad * (len(row) + 1) for row in rows_items)
    H = sum(row_h) + pad * (len(rows_items) + 1)
    canvas = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(canvas)
    y = pad
    for r, row in enumerate(rows_items):
        x = pad
        for label, im in row:
            d.text((x + 2, y), f"{label} {im.width}x{im.height}", fill=(255, 255, 0))
            canvas.alpha_composite(im, (x, y + 18))
            x += im.width + pad
        y += row_h[r] + pad
    return canvas


os.makedirs(OUT, exist_ok=True)

ui = [
    ("audio_icon", load("audio_icon.png")),
    ("but_fullscreen", load("but_fullscreen.png")),
    ("but_exit", load("but_exit.png")),
    ("but_credits", load("but_credits.png")),
    ("but_play", load("but_play.png")),
    ("but_home", load("but_home.png")),
    ("but_restart", load("but_restart.png")),
    ("but_no", load("but_no.png")),
    ("but_yes", load("but_yes.png")),
    ("but_skip", load("but_skip.png")),
    ("but_start", load("but_start.png")),
    ("but_clear_bet", load("but_clear_bet.png")),
    ("but_start_race", load("but_start_race.png")),
    ("arrow_left", load("arrow_left.png")),
    ("arrow_right", load("arrow_right.png")),
    ("bet_place", load("bet_place.png")),
    ("odd_bg", load("odd_bg.png")),
    ("money_panel", load("money_panel.png")),
    ("fiche_panel", load("fiche_panel.png")),
    ("fiche_0", load("fiche_0.png")),
    ("fiche_3", load("fiche_3.png")),
    ("fiche_highlight", load("fiche_highlight.png")),
    ("bibs", load("bibs.png")),
    ("bib_gui_0", load("bib_gui_0.png")),
    ("progress_bar", load("progress_bar.png")),
    ("logo_ctl", load("logo_ctl.png")),
    ("logo_menu", load("logo_menu.png", 400)),
    ("panel_arrival", load("panel_arrival.png")),
    ("200x200", load("200x200.jpg")),
]
sheet(ui, 6).save(os.path.join(OUT, "sheet-ui.png"))

horses = []
for n in range(1, 9):
    horses.append((f"horse_{n}_a", load(f"horse_{n}_a.png", 300)))
sheet(horses, 4).save(os.path.join(OUT, "sheet-horses-a.png"))

horses_b = []
for n in range(1, 9):
    horses_b.append((f"horse_{n}_b", load(f"horse_{n}_b.png", 300)))
sheet(horses_b, 4).save(os.path.join(OUT, "sheet-horses-b.png"))

big = [
    ("simple_bet_panel", load("simple_bet_panel.png", 460)),
    ("forecast_panel", load("forecast_panel.png", 460)),
    ("rank_panel", load("rank_panel.png", 460)),
    ("win_panel", load("win_panel.png", 460)),
    ("lose_panel", load("lose_panel.png", 460)),
    ("msg_box", load("msg_box.png", 460)),
    ("bg_bet_panel", load("bg_bet_panel.jpg", 460)),
    ("cage_0", load("cage_0.png", 300)),
    ("cage_8", load("cage_8.png", 300)),
    ("gate_0", load("cage_gates/gate_0.png", 300)),
    ("fill_bar", load("fill_bar.png")),
]
sheet(big, 3).save(os.path.join(OUT, "sheet-big.png"))

track = [
    (f"bg_track_{i}", load(f"bg_track/bg_track_{i}.jpg", 400))
    for i in [0, 10, 25, 40, 60, 80, 100, 120, 140, 160, 180, 187]
    if os.path.exists(os.path.join(PUB, f"bg_track/bg_track_{i}.jpg"))
]
sheet(track, 4).save(os.path.join(OUT, "sheet-track.png"))
print("done")
