export const DEFAULT_IDLE_TIMEOUT_MS = 60_000;

export type ActiveReadingTimerOptions = {
  now?: number;
  idleTimeoutMs?: number;
  isVisible?: boolean;
  isPaused?: boolean;
  isAudioPlaying?: boolean;
};

/**
 * Pure state machine tracking active reading milliseconds.
 * Counts only while the document is visible, not paused by a modal/state,
 * and either within the idle timeout window or during active audiobook playback.
 */
export class ActiveReadingTimerEngine {
  private readonly idleTimeoutMs: number;
  private visible: boolean;
  private paused: boolean;
  private isAudioPlaying: boolean;
  private accumulatedMs = 0;
  private lastActivityAt: number;
  private lastTickAt: number;

  constructor(options: ActiveReadingTimerOptions = {}) {
    const now = options.now ?? Date.now();
    this.idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.visible = options.isVisible ?? true;
    this.paused = options.isPaused ?? false;
    this.isAudioPlaying = options.isAudioPlaying ?? false;
    this.lastActivityAt = now;
    this.lastTickAt = now;
  }

  private computePendingMs(now: number): number {
    if (!this.visible || this.paused) return 0;
    if (this.isAudioPlaying) {
      return Math.max(0, now - this.lastTickAt);
    }
    const activeWindowEnd = this.lastActivityAt + this.idleTimeoutMs;
    const effectiveEnd = Math.min(now, activeWindowEnd);
    return Math.max(0, effectiveEnd - this.lastTickAt);
  }

  private flush(now: number): void {
    this.accumulatedMs += this.computePendingMs(now);
    if (this.visible && !this.paused && this.isAudioPlaying) {
      this.lastActivityAt = Math.max(this.lastActivityAt, now);
    }
    this.lastTickAt = Math.max(this.lastTickAt, now);
  }

  recordActivity(now: number): void {
    this.flush(now);
    this.lastActivityAt = Math.max(this.lastActivityAt, now);
    this.lastTickAt = Math.max(this.lastTickAt, now);
  }

  setVisible(visible: boolean, now: number): void {
    this.flush(now);
    const becameVisible = !this.visible && visible;
    this.visible = visible;
    if (becameVisible) {
      this.lastActivityAt = Math.max(this.lastActivityAt, now);
      this.lastTickAt = Math.max(this.lastTickAt, now);
    }
  }

  setPaused(paused: boolean, now: number): void {
    this.flush(now);
    const resumed = this.paused && !paused;
    this.paused = paused;
    if (resumed) {
      this.lastActivityAt = Math.max(this.lastActivityAt, now);
      this.lastTickAt = Math.max(this.lastTickAt, now);
    }
  }

  setAudioPlaying(playing: boolean, now: number): void {
    this.flush(now);
    const toggled = this.isAudioPlaying !== playing;
    this.isAudioPlaying = playing;
    if (toggled) {
      this.lastActivityAt = Math.max(this.lastActivityAt, now);
      this.lastTickAt = Math.max(this.lastTickAt, now);
    }
  }

  getActiveMs(now: number): number {
    return this.accumulatedMs + this.computePendingMs(now);
  }

  getActiveSeconds(now: number): number {
    return Math.floor(this.getActiveMs(now) / 1000);
  }

  reset(now: number): void {
    this.accumulatedMs = 0;
    this.lastActivityAt = now;
    this.lastTickAt = now;
  }
}
