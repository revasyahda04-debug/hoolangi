export class GameAudio {
  private ctx: AudioContext | null = null;

  private ensureContext(): AudioContext | null {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  tone(frequency: number, duration = 0.12, gainValue = 0.05, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime + delay;
    const end = start + duration;
    oscillator.start(start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.stop(end);
  }

  correct(): void {
    this.tone(660, 0.1, 0.055);
    this.tone(880, 0.16, 0.045, 0.11);
  }

  wrong(): void {
    this.tone(220, 0.18, 0.035);
  }

  win(): void {
    this.tone(523, 0.12, 0.05);
    this.tone(659, 0.12, 0.05, 0.12);
    this.tone(784, 0.22, 0.05, 0.24);
  }
}
