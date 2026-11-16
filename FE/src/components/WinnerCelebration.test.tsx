import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WinnerCelebration from "./WinnerCelebration";
import {
  createVictoryPlayback,
  unlockVictoryAudio,
} from "../audio/victoryAudio";
import { cachedMusicPreview } from "../audio/musicPreviewCache";
jest.mock("../audio/victoryAudio", () => ({
  createVictoryPlayback: jest.fn(),
  unlockVictoryAudio: jest.fn(),
}));
jest.mock("../audio/musicPreviewCache", () => ({
  cachedMusicPreview: jest.fn(),
}));
const base = {
  players: [
    { name: "Ana", score: 950, rank: 1, correct: 12 },
    { name: "Boris", score: 800, rank: 2, correct: 10 },
  ],
  me: "Ana",
  host: false,
  code: "123456",
  token: "secret",
  onAgain: jest.fn(),
};
const victory = {
  winnerNames: ["Ana"],
  score: 950,
  song: {
    index: 27,
    title: "Pobjednička pjesma",
    artist: "Izvođač",
    responseMs: 2000,
    player: "Ana",
  },
};
const playback = {
  play: jest.fn(),
  pause: jest.fn(),
  setVolume: jest.fn(),
  dispose: jest.fn(),
  segment: { start: 8, duration: 18 },
};
beforeEach(() => {
  jest.clearAllMocks();
  (cachedMusicPreview as jest.Mock).mockReturnValue(undefined);
  playback.play.mockReset().mockResolvedValue(undefined);
  (createVictoryPlayback as jest.Mock).mockReset().mockResolvedValue(playback);
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, blob: async () => new Blob(["audio"]) });
});
test("announces the winner and handles a game without correct music guesses", () => {
  render(
    <WinnerCelebration
      {...base}
      victory={{ winnerNames: ["Ana"], score: 950, song: null }}
    />,
  );
  expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
  expect(
    screen.getByText(/Nema zabilježenog tačnog muzičkog pogotka/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Još jedna runda/ }));
  expect(base.onAgain).toHaveBeenCalled();
  expect(createVictoryPlayback).not.toHaveBeenCalled();
});
test("victory starts itself and reuses an earlier question preview without waiting for a network request", async () => {
  const blob = new Blob(["loaded-in-game"]);
  (cachedMusicPreview as jest.Mock).mockReturnValue(blob);
  const view = render(<WinnerCelebration {...base} victory={victory} />);
  expect(
    await screen.findByRole("button", { name: /Pauziraj/ }),
  ).toBeInTheDocument();
  expect(playback.play).toHaveBeenCalledTimes(1);
  expect(global.fetch).not.toHaveBeenCalled();
  expect(createVictoryPlayback).toHaveBeenCalledWith(
    blob,
    0.35,
    expect.any(Function),
  );
  view.unmount();
  expect(playback.dispose).toHaveBeenCalled();
});
test("a browser that still needs a gesture retains a working recovery button", async () => {
  playback.play
    .mockRejectedValueOnce(new Error("Autoplay blocked"))
    .mockResolvedValue(undefined);
  const view = render(<WinnerCelebration {...base} victory={victory} />);
  expect(
    await screen.findByText(/Dodirni „Pusti slavlje”/),
  ).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/victory-audio"),
    expect.objectContaining({ headers: { "X-Player-Token": "secret" } }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Pusti slavlje/ }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Pauziraj/ }),
    ).toBeInTheDocument(),
  );
  expect(unlockVictoryAudio).toHaveBeenCalled();
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0.1" } });
  expect(playback.setVolume).toHaveBeenCalledWith(0.1);
  view.unmount();
  expect(playback.dispose).toHaveBeenCalled();
});
test("equal winners are announced together", () => {
  render(
    <WinnerCelebration
      {...base}
      victory={{ winnerNames: ["Ana", "Boris"], score: 950, song: null }}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Ana & Boris" }),
  ).toBeInTheDocument();
});
