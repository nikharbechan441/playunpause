let audioCtx = null;
let resumeInFlight = false;
let lastResumeAttemptMs = 0;
let lastTickOscMs = -Infinity;
let lastChimeOscMs = -Infinity;

const MIN_OSC_COALESCE_MS = 18;
const MIN_RESUME_RETRY_MS = 100;

function nowTimestampMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function disconnectAudioNodes(osc, gain) {
  try {
    osc.disconnect();
  } catch {
    // Ignore disconnect errors on already-released nodes
  }
  try {
    gain.disconnect();
  } catch {
    // Ignore disconnect errors on already-released nodes
  }
}

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (audioCtx && audioCtx.state === 'closed') {
    audioCtx = null;
  }
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended' && !resumeInFlight) {
    const nowMs = nowTimestampMs();
    if (nowMs - lastResumeAttemptMs >= MIN_RESUME_RETRY_MS) {
      lastResumeAttemptMs = nowMs;
      resumeInFlight = true;
      try {
        const res = audioCtx.resume();
        if (res && typeof res.finally === 'function') {
          res.catch(() => {}).finally(() => {
            resumeInFlight = false;
          });
        } else {
          resumeInFlight = false;
        }
      } catch {
        resumeInFlight = false;
      }
    }
  }
  return audioCtx;
}

export function triggerHaptic(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore unsupported devices
  }
}

export function playSwitchTick(soundEnabled = true, pitchHz = 680) {
  triggerHaptic(8);
  if (!soundEnabled) return;
  const callMs = nowTimestampMs();
  if (callMs - lastTickOscMs < MIN_OSC_COALESCE_MS) return;
  const ctx = getCtx();
  if (!ctx || ctx.state === 'closed') return;
  lastTickOscMs = callMs;

  const safePitch =
    Number.isFinite(pitchHz) && pitchHz > 0 ? Math.min(8000, Math.max(60, pitchHz)) : 680;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(safePitch, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.028);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => disconnectAudioNodes(osc, gain);
    osc.start(now);
    osc.stop(now + 0.032);
  } catch {
    // Audio blocked before gesture
  }
}

export function playKeypadBeep(soundEnabled = true, digit = '5') {
  const freqMap = {
    '1': 697,
    '2': 740,
    '3': 784,
    '4': 830,
    '5': 880,
    '6': 932,
    '7': 987,
    '8': 1046,
    '9': 1108,
    '0': 659,
  };
  playSwitchTick(soundEnabled, freqMap[String(digit)] || 820);
}

export function playUnlockChime(soundEnabled = true) {
  triggerHaptic([12, 30, 16]);
  if (!soundEnabled) return;
  const callMs = nowTimestampMs();
  if (callMs - lastChimeOscMs < MIN_OSC_COALESCE_MS) return;
  const ctx = getCtx();
  if (!ctx || ctx.state === 'closed') return;
  lastChimeOscMs = callMs;

  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.055;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => disconnectAudioNodes(osc, gain);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  } catch {
    // Ignore
  }
}
