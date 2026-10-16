// Mute-aware sound effects. Audio starts muted like the original
// (audio_enable_on_startup: false).
import { Assets, SoundName } from "./assets";

export class Sound {
  muted = true;
  /**
   * Which screen family is showing: "bgm" (menu), "bet" (BGM + announcer),
   * or "race" (crowd bed only). Honored by resume().
   */
  musicMode: "bgm" | "bet" | "race" = "bgm";

  constructor(private assets: Assets) {}

  private el(name: SoundName): HTMLAudioElement | undefined {
    return this.assets.sounds.get(name);
  }

  play(name: SoundName): void {
    if (this.muted) return;
    const a = this.el(name);
    if (!a) return;
    try {
      a.muted = false;
      a.currentTime = 0;
      void a.play();
    } catch {
      /* autoplay policy */
    }
  }

  click(): void {
    this.play("click.mp3");
  }

  chip(): void {
    this.play("chip.mp3");
  }

  /**
   * Race bed: gate burst + crowd + hoofbeats. On first play the full file
   * (including the starting-gate explosion) runs once. On loop restart it
   * seeks past the gate burst so only the hoofbeat/crowd bed repeats — the
   * explosion never re-fires mid-race.
   */
  raceBed(on: boolean, restart = false): void {
    const a = this.el("start_race.mp3");
    if (!a) return;
    const GATE_BURST_LEN = 2.5;
    try {
      a.loop = true;
      a.volume = 0.85;
      a.muted = this.muted || !on;
      if (on && !this.muted) {
        if (restart) {
          a.currentTime = 0;
          void a.play();
        } else if (a.ended || a.currentTime >= a.duration - 0.1) {
          a.currentTime = GATE_BURST_LEN;
          void a.play();
        }
      } else if (!a.paused) {
        a.pause();
      }
    } catch {
      /* autoplay policy */
    }
  }

  /** One-shot announcer voice-over for the race intro. */
  announcer(): void {
    if (this.muted) return;
    const a = this.el("race_intro.mp3");
    if (!a) return;
    try {
      a.loop = false;
      a.volume = 1;
      a.muted = false;
      a.currentTime = 0;
      void a.play();
    } catch {
      /* autoplay policy */
    }
  }

  stopAnnouncer(): void {
    const a = this.el("race_intro.mp3");
    if (a && !a.paused) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
  }

  /** Single entry point for the mute button: silences everything when
   *  muting, and restarts only what belongs to the current screen when
   *  unmuting (so unmuting mid-race brings back the crowd bed, never BGM). */
  setMuted(m: boolean): void {
    this.muted = m;
    if (m) {
      this.soundtrack(false);
      this.raceBed(false);
      this.stopAnnouncer();
    } else {
      this.resume();
    }
  }

  /** Re-assert whatever should be audible now (call on user taps). */
  resume(): void {
    if (this.muted) return;
    if (this.musicMode === "race") {
      this.raceBed(true);
      return;
    }
    this.soundtrack(true);
    if (this.musicMode !== "bet") return;
    // Heal a never-started betting announcer (its enter() play may have
    // predated the first user gesture). Never restarts mid/late playback.
    const a = this.el("race_intro.mp3");
    if (a && a.paused && !a.ended && a.currentTime < 1) {
      try {
        a.loop = false;
        a.volume = 1;
        a.muted = false;
        void a.play();
      } catch {
        /* autoplay policy */
      }
    }
  }

  /** Hard guarantee: BGM can never overlap the race bed. Cheap; the race
   *  screen calls it every frame. */
  enforceRaceSilence(): void {
    const a = this.el("soundtrack.mp3");
    if (a && !a.paused) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }
  }

  photo(): void {
    this.play("photo.mp3");
  }

  soundtrack(on: boolean): void {
    const a = this.el("soundtrack.mp3");
    if (!a) return;
    try {
      a.loop = true;
      a.muted = this.muted || !on;
      if (on && !this.muted && a.paused) void a.play();
      if (!on && !a.paused) a.pause();
    } catch {
      /* ignore */
    }
  }
}
