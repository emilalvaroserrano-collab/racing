// Admin (bangka) panel: DOM overlay for creating players, loading balance,
// and watching the house take. Accounts live in Supabase.
import { CURRENCY } from "../constants";
import { Game } from "../engine";
import { Auth } from "../auth";

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export class AdminPanel {
  private static game: Game | null = null;
  private static bound = false;

  static open(game: Game): void {
    this.game = game;
    el("admin-overlay")?.classList.remove("hidden");
    if (!this.bound) {
      this.bound = true;
      el("ad-create")?.addEventListener("click", () => void this.create());
      el("ad-close")?.addEventListener("click", () => this.close());
      el("ad-users")?.addEventListener("click", (e) => void this.onTable(e));
    }
    this.refresh();
  }

  static close(): void {
    el("admin-overlay")?.classList.add("hidden");
    this.game = null;
  }

  static isOpen(): boolean {
    return !(el("admin-overlay")?.classList.contains("hidden") ?? true);
  }

  private static refresh(): void {
    const house = el("ad-house");
    if (house) {
      house.textContent = `🏦 HOUSE TAKE (10%): ${CURRENCY}${Auth.house().toFixed(2)}`;
    }
    const tb = el("ad-users");
    if (!tb) return;
    tb.innerHTML = Auth.users()
      .map(
        (u) => `<tr>
          <td>${esc(u.phone)}${u.role === "admin" ? " 👑" : ""}</td>
          <td>${u.role}</td>
          <td>${CURRENCY}${u.balance.toFixed(2)}</td>
          <td><span class="loadrow">
            <input data-load-for="${esc(u.phone)}" inputmode="decimal" placeholder="+₱" />
            <button data-load="${esc(u.phone)}">LOAD</button>
          </span></td>
        </tr>`,
      )
      .join("");
  }

  private static async create(): Promise<void> {
    const err = el("ad-err");
    const phone = el<HTMLInputElement>("ad-phone")?.value ?? "";
    const pass = el<HTMLInputElement>("ad-pass")?.value ?? "";
    const balRaw = el<HTMLInputElement>("ad-bal")?.value ?? "";
    const bal = balRaw.trim() === "" ? 0 : Number(balRaw);
    try {
      if (err) err.textContent = "";
      await Auth.createUser(phone, pass, bal, "player");
      const p = el<HTMLInputElement>("ad-phone");
      const pw = el<HTMLInputElement>("ad-pass");
      const b = el<HTMLInputElement>("ad-bal");
      if (p) p.value = "";
      if (pw) pw.value = "";
      if (b) b.value = "";
      this.refresh();
    } catch (e) {
      if (err) err.textContent = e instanceof Error ? e.message : "Create failed.";
    }
  }

  private static async onTable(e: Event): Promise<void> {
    const btn = (e.target as HTMLElement).closest("[data-load]") as HTMLElement | null;
    if (!btn) return;
    const phone = btn.getAttribute("data-load") ?? "";
    const err = el("ad-err");
    const inp = document.querySelector<HTMLInputElement>(`[data-load-for="${phone}"]`);
    const amt = Number(inp?.value ?? "");
    try {
      if (err) err.textContent = "";
      if (!Number.isFinite(amt) || amt === 0) throw new Error("Enter a load amount (use - to deduct).");
      Auth.adjustBalance(phone, amt);
      // Live-refresh the wallet if that player is currently logged in here.
      if (this.game && this.game.state.phone === phone) this.game.state.loadWallet();
      this.refresh();
    } catch (ex) {
      if (err) err.textContent = ex instanceof Error ? ex.message : "Load failed.";
    }
  }
}
