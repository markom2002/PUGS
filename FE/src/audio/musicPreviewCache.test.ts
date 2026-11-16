import {
  rememberMusicPreview,
  cachedMusicPreview,
  clearMusicPreviews,
} from "./musicPreviewCache";
afterEach(clearMusicPreviews);
test("earlier music previews can be reused for victory only in the same player session", () => {
  const song = new Blob(["preview"]);
  rememberMusicPreview("123456", "player-one", 25, song);
  expect(cachedMusicPreview("123456", "player-one", 25)).toBe(song);
  expect(cachedMusicPreview("123456", "player-two", 25)).toBeUndefined();
  clearMusicPreviews();
  expect(cachedMusicPreview("123456", "player-one", 25)).toBeUndefined();
});
