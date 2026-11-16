import { chooseCelebrationSegment } from "./celebrationSegment";
function clip(seconds: number, rate = 100) {
  return new Float32Array(seconds * rate);
}
test("prefers a sustained energetic passage over a quiet opening", () => {
  const data = clip(30);
  data.fill(0.02);
  data.fill(0.4, 900, 2800);
  const part = chooseCelebrationSegment(data, 100);
  expect(part.duration).toBe(18);
  expect(part.start).toBeGreaterThanOrEqual(8.5);
  expect(part.start).toBeLessThanOrEqual(10.5);
});
test("isolated loud transients do not beat a sustained musical passage", () => {
  const data = clip(40);
  data.fill(0.01);
  data.fill(0.9, 0, 25);
  data.fill(0.25, 1800, 3800);
  const part = chooseCelebrationSegment(data, 100);
  expect(part.start).toBeGreaterThanOrEqual(17.5);
  expect(part.start + part.duration).toBeLessThanOrEqual(40);
});
test("short previews, silent previews and invalid input are handled safely", () => {
  expect(chooseCelebrationSegment(clip(7), 100)).toEqual({
    start: 0,
    duration: 7,
  });
  expect(chooseCelebrationSegment(clip(30), 100)).toEqual({
    start: 0,
    duration: 18,
  });
  expect(() => chooseCelebrationSegment(clip(0), 100)).toThrow();
});
