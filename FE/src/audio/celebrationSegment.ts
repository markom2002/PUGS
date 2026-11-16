export type CelebrationSegment = { start: number; duration: number };
// Pick sustained musical energy, not an isolated loud transient. This is a
// highlight within the supplied preview, not semantic chorus detection.
export function chooseCelebrationSegment(
  samples: Float32Array,
  sampleRate: number,
): CelebrationSegment {
  const duration = samples.length / sampleRate;
  if (!Number.isFinite(duration) || duration <= 0 || sampleRate <= 0)
    throw new Error("Empty music preview");
  const length = Math.min(18, duration);
  if (duration <= 18) return { start: 0, duration: length };
  const hop = Math.max(1, Math.floor(sampleRate * 0.25));
  const energy: number[] = [];
  for (let from = 0; from < samples.length; from += hop) {
    let sum = 0,
      count = 0;
    for (let i = from; i < Math.min(samples.length, from + hop); i += 8) {
      sum += samples[i] * samples[i];
      count++;
    }
    energy.push(Math.sqrt(sum / Math.max(1, count)));
  }
  const windowFrames = Math.ceil(length / 0.25);
  let start = 0,
    best = -1;
  for (let i = 0; i + windowFrames <= energy.length; i++) {
    const values = energy.slice(i, i + windowFrames);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const floor = [...values].sort((a, b) => a - b)[
      Math.floor(values.length * 0.25)
    ];
    const score = average * 0.65 + floor * 0.35;
    if (score > best + 1e-7) {
      best = score;
      start = i * 0.25;
    }
  }
  // Move a fraction of a second toward a stronger phrase/beat entry when useful.
  const frame = Math.round(start / 0.25);
  let onset = frame,
    rise = 0.015;
  for (
    let i = Math.max(1, frame - 2);
    i <= Math.min(energy.length - 1, frame + 2);
    i++
  ) {
    const delta = energy[i] - energy[i - 1];
    if (delta > rise) {
      rise = delta;
      onset = i;
    }
  }
  start = Math.max(0, Math.min(duration - length, onset * 0.25));
  return { start, duration: length };
}
