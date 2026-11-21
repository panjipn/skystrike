// Tiny synthesized sound effects via WebAudio — no audio files needed,
// which keeps the booth build fully self-contained and offline-friendly.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}
export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, duration: number, type: OscillatorType, gain = 0.12, slideTo?: number): void {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio is a garnish, never a blocker */
  }
}

export const sfx = {
  pop: () => tone(620, 0.09, "square", 0.08, 980),
  gold: () => { tone(880, 0.1, "triangle", 0.12); setTimeout(() => tone(1318, 0.14, "triangle", 0.12), 60); },
  bomb: () => tone(160, 0.28, "sawtooth", 0.14, 55),
  miss: () => tone(220, 0.06, "sine", 0.05),
  start: () => { tone(523, 0.09, "triangle", 0.1); setTimeout(() => tone(784, 0.12, "triangle", 0.1), 90); },
  end: () => { tone(784, 0.12, "triangle", 0.1); setTimeout(() => tone(1046, 0.2, "triangle", 0.12), 110); },
};
