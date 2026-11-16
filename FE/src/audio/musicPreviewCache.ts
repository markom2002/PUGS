// Short-lived playback data only: never persisted or added to the PWA cache.
const previews = new Map<string, Blob>();
const key = (code: string, token: string, index: number) =>
  `${code}:${token}:${index}`;
export function rememberMusicPreview(
  code: string,
  token: string,
  index: number,
  blob: Blob,
) {
  if (index < 25 || index > 29 || blob.size > 3 * 1024 * 1024) return;
  const id = key(code, token, index);
  previews.delete(id);
  previews.set(id, blob);
  while (previews.size > 5) previews.delete(previews.keys().next().value!);
}
export function cachedMusicPreview(code: string, token: string, index: number) {
  return previews.get(key(code, token, index));
}
export function clearMusicPreviews() {
  previews.clear();
}
