import {
  chooseCelebrationSegment,
  CelebrationSegment,
} from "./celebrationSegment";
let context: AudioContext | null = null;
function getContext() {
  if (!context || context.state === "closed") {
    const Constructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Constructor) throw new Error("Web Audio nije dostupan.");
    context = new Constructor();
  }
  return context;
}
// Called synchronously from genuine game interactions; no autoplay-policy flags
// or browser settings are changed. Keep this context for the whole game.
export function unlockVictoryAudio(): Promise<boolean> {
  try {
    const ctx = getContext();
    if (ctx.state === "running") return Promise.resolve(true);
    return ctx
      .resume()
      .then(() => ctx.state === "running")
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}
export function installVictoryAudioUnlock() {
  const unlock = () => {
    void unlockVictoryAudio();
  };
  const events = ["pointerup", "touchend", "keydown", "click"];
  events.forEach((event) =>
    window.addEventListener(event, unlock, { capture: true, passive: true }),
  );
  return () =>
    events.forEach((event) => window.removeEventListener(event, unlock, true));
}
export type VictoryPlayback = {
  play: () => Promise<void>;
  pause: () => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
  segment: CelebrationSegment;
};
export async function createVictoryPlayback(
  blob: Blob,
  volume: number,
  onEnded: () => void,
): Promise<VictoryPlayback> {
  const ctx = getContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  const segment = chooseCelebrationSegment(
    decoded.getChannelData(0),
    decoded.sampleRate,
  );
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  let source: AudioBufferSourceNode | null = null,
    played = 0,
    started = 0,
    disposed = false;
  let target = Math.max(0, Math.min(1, volume));
  function stopSource() {
    const previous = source;
    source = null;
    if (previous) {
      previous.onended = null;
      try {
        previous.stop();
      } catch {}
      previous.disconnect();
    }
  }
  async function play() {
    if (disposed || source) return;
    if (ctx.state !== "running") {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          ctx.resume(),
          new Promise((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new DOMException(
                    "Dodir za zvuk je potreban.",
                    "NotAllowedError",
                  ),
                ),
              1200,
            );
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }
    if (ctx.state !== "running")
      throw new DOMException("Dodir za zvuk je potreban.", "NotAllowedError");
    if (disposed || source) return;
    if (played >= segment.duration - 0.02) played = 0;
    const remaining = segment.duration - played;
    const node = ctx.createBufferSource();
    node.buffer = decoded;
    node.connect(gain);
    source = node;
    started = ctx.currentTime;
    gain.gain.cancelScheduledValues(started);
    gain.gain.setValueAtTime(0, started);
    gain.gain.linearRampToValueAtTime(
      target,
      started + Math.min(0.6, remaining / 3),
    );
    gain.gain.setValueAtTime(
      target,
      started + Math.max(remaining - 1.1, remaining / 2),
    );
    gain.gain.linearRampToValueAtTime(0, started + remaining);
    node.onended = () => {
      if (source !== node || disposed) return;
      source = null;
      played = segment.duration;
      node.disconnect();
      onEnded();
    };
    node.start(started, segment.start + played, remaining);
  }
  return {
    play,
    pause() {
      if (source) {
        played = Math.min(segment.duration, played + ctx.currentTime - started);
        stopSource();
      }
    },
    setVolume(value) {
      target = Math.max(0, Math.min(1, value));
      if (source) {
        const now = ctx.currentTime,
          left = Math.max(0, segment.duration - played - (now - started));
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(
          target,
          now + Math.min(0.15, left / 3),
        );
        gain.gain.setValueAtTime(target, now + Math.max(left - 1.1, left / 2));
        gain.gain.linearRampToValueAtTime(0, now + left);
      }
    },
    dispose() {
      disposed = true;
      stopSource();
      gain.disconnect();
    },
    segment,
  };
}

// Shares the context unlocked by joining/voting, including on mobile Safari.
export async function createQuestionPlayback(
  blob: Blob, startedAt: number, endsAt: number, onEnded: () => void,
) {
  const ctx = getContext();
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  const gain = ctx.createGain();
  gain.gain.value = 0.85;
  gain.connect(ctx.destination);
  let source: AudioBufferSourceNode | null = null;
  let disposed = false;
  const pause = () => {
    if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); source = null; }
  };
  return {
    async play() {
      if (disposed || source) return;
      if (ctx.state !== "running") {
        // Never leave a suspended resume promise hanging after backgrounding.
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const ready = await Promise.race([unlockVictoryAudio(), new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 1200); })]);
          if (!ready) throw new Error("Dodirni za zvuk.");
        } finally { if (timeout) clearTimeout(timeout); }
      }
      if (disposed) return;
      const offset = Math.max(0, (Date.now() - startedAt) / 1000);
      const duration = Math.min(buffer.duration - offset, (endsAt - Date.now()) / 1000);
      if (duration <= 0) { onEnded(); return; }
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(gain);
      source = node;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(0.85, ctx.currentTime);
      gain.gain.setValueAtTime(0.85, ctx.currentTime + Math.max(0, duration - 0.25));
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      node.onended = () => { if (source === node) { source = null; node.disconnect(); onEnded(); } };
      node.start(0, offset, duration);
    },
    pause,
    dispose() { disposed = true; pause(); gain.disconnect(); },
  };
}
