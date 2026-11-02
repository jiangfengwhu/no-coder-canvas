let audioCtx: AudioContext | null = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playStampPlace() {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
}

export function playStampPop() {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio errors
  }
}

export function playTreasureFound() {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;

    // Play a little chord
    const playNote = (freq: number, startDelay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, t + startDelay);
      gain.gain.linearRampToValueAtTime(0.15, t + startDelay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + startDelay + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + startDelay);
      osc.stop(t + startDelay + 0.5);
    };

    playNote(523.25, 0);      // C5
    playNote(659.25, 0.1);    // E5
    playNote(783.99, 0.2);    // G5
    playNote(1046.50, 0.35);  // C6

  } catch (e) {
    // Ignore
  }
}

export function playMagicSparkle() {
  try {
    const ctx = getContext();
    const t = ctx.currentTime;

    const playChime = (freq: number, startDelay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, t + startDelay);
      gain.gain.linearRampToValueAtTime(0.05, t + startDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + startDelay + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + startDelay);
      osc.stop(t + startDelay + 0.3);
    };

    playChime(1046.50, 0);      // C6
    playChime(1318.51, 0.05);   // E6
    playChime(1567.98, 0.1);    // G6
  } catch (e) {
    // Ignore
  }
}

const STROKE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
// C pentatonic scale frequencies
const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

export function playBounce(velocityMag: number, color?: string) {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let baseFreq = 200 + Math.min(velocityMag, 1500) * 0.5;
    let waveType: OscillatorType = 'sine';
    let decayTime = 0.2;

    if (color) {
      const colorIndex = STROKE_COLORS.indexOf(color);
      if (colorIndex !== -1) {
        baseFreq = PENTATONIC_SCALE[colorIndex % PENTATONIC_SCALE.length];
        waveType = 'triangle';
        decayTime = 0.4;
      }
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    if (!color) {
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.1);
    }

    // Volume based on speed
    const vol = Math.max(0.02, Math.min(0.2, velocityMag / 3000));

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + decayTime);
  } catch (e) {
    // Ignore
  }
}
