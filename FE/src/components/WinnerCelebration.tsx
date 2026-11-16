import React, { useEffect, useRef, useState } from "react";
import "./WinnerCelebration.css";
import {
  createVictoryPlayback,
  unlockVictoryAudio,
  VictoryPlayback,
} from "../audio/victoryAudio";
import { cachedMusicPreview } from "../audio/musicPreviewCache";
export type Victory = {
  winnerNames: string[];
  score: number;
  song: {
    index: number;
    title: string;
    artist: string | null;
    responseMs: number;
    player: string;
  } | null;
};
type Props = {
  victory: Victory;
  players: {
    name: string;
    score: number | null;
    rank?: number;
    correct: number | null;
  }[];
  me: string;
  host: boolean;
  code: string;
  token: string;
  onAgain: () => void;
};
const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
export default function WinnerCelebration({
  victory,
  players,
  me,
  host,
  code,
  token,
  onAgain,
}: Props) {
  const [sound, setSound] = useState<
    "loading" | "blocked" | "playing" | "paused" | "ended" | "error"
  >("loading");
  const [volume, setVolume] = useState(0.35);
  const audio = useRef<VictoryPlayback | null>(null);
  const desiredVolume = useRef(0.35);
  const songIndex = victory.song?.index;
  useEffect(() => {
    if (songIndex == null) return;
    let disposed = false;
    let playback: VictoryPlayback | null = null;
    const controller = new AbortController();
    setSound("loading");
    const cached = cachedMusicPreview(code, token, songIndex);
    const load = cached
      ? Promise.resolve(cached)
      : fetch(`${API}/api/arena/rooms/${code}/victory-audio`, {
          headers: { "X-Player-Token": token },
          signal: controller.signal,
        }).then((r) => {
          if (!r.ok) throw new Error("audio");
          return r.blob();
        });
    load
      .then(async (blob) => {
        if (disposed) return;
        playback = await createVictoryPlayback(
          blob,
          desiredVolume.current,
          () => {
            if (!disposed) setSound("ended");
          },
        );
        if (disposed) {
          playback.dispose();
          return;
        }
        audio.current = playback;
        try {
          await playback.play();
          if (!disposed) setSound("playing");
        } catch {
          if (!disposed) setSound("blocked");
        }
      })
      .catch(() => {
        if (!disposed) setSound("error");
      });
    return () => {
      disposed = true;
      controller.abort();
      playback?.dispose();
      audio.current = null;
    };
  }, [code, token, songIndex]);
  function toggle() {
    const player = audio.current;
    if (!player) return;
    if (sound === "playing") {
      player.pause();
      setSound("paused");
    } else {
      void unlockVictoryAudio();
      player
        .play()
        .then(() => setSound("playing"))
        .catch(() => setSound("blocked"));
    }
  }
  const tied = victory.winnerNames.length > 1;
  const mine = players.find((p) => p.name === me);
  return (
    <section className="winner-celebration" aria-label="Proglašenje pobjednika">
      <div className="celebration-glow" aria-hidden="true" />
      <div className="celebration-rays" aria-hidden="true" />
      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 64 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: ["#d2ff65", "#ab8cff", "#ffcc76", "#fb93c2"][i % 4],
              animationDelay: `${(i % 16) * 0.18}s`,
              animationDuration: `${3 + (i % 5) * 0.4}s`,
              width: i % 3 === 0 ? 6 : 9,
              height: i % 3 === 0 ? 6 : 15,
            }}
          />
        ))}
      </div>
      <div className="celebration-content">
        <span className="winner-kicker">
          {tied
            ? "DIJELITE VRH. DIJELITE SLAVLJE."
            : "ZNANJE IMA SVOG ŠAMPIONA."}
        </span>
        <div className="winner-crown" aria-hidden="true">
          ♛<span>✧</span>
          <span>✧</span>
        </div>
        <p className="winner-announcement">
          {tied ? "POBJEDNICI PARTIJE" : "POBJEDNIK PARTIJE"}
        </p>
        <h2 className="winner-name">{victory.winnerNames.join(" & ")}</h2>
        <div className="winner-score">
          {victory.score.toLocaleString("sr-Latn")}
          <span>POENA</span>
        </div>
        <p className="winner-message">
          {victory.winnerNames.includes(me)
            ? "Tvoja partija. Tvoj trenutak. Uživaj u aplauzu."
            : "Kapa dolje šampionu. Ovo se zove dobra partija."}
        </p>
        <div className="celebration-podium">
          {players.slice(0, 3).map((p, i) => (
            <div
              key={p.name}
              className={`podium-place place-${p.rank ?? i + 1}`}
            >
              <span>
                {p.rank ?? i + 1}
                <small>MJESTO</small>
              </span>
              <strong>{p.name}</strong>
              <b>
                {p.score ?? 0} <small>poena</small>
              </b>
              <em>{p.correct ?? 0}/30 tačnih</em>
            </div>
          ))}
        </div>
        {victory.song ? (
          <div className="victory-song">
            <div
              className={
                sound === "playing" ? "victory-vinyl spinning" : "victory-vinyl"
              }
              aria-hidden="true"
            >
              ♫
            </div>
            <div className="victory-song-info">
              <span>POBJEDNIČKI SOUNDTRACK · SLAVLJENIČKI DIO</span>
              <strong>{victory.song.title}</strong>
              <small>
                {victory.song.artist} · {victory.song.player} pogodio/la za{" "}
                {(victory.song.responseMs / 1000).toFixed(2)} s
              </small>
            </div>
            <div className="victory-audio-controls">
              <button
                className="arena-secondary"
                onClick={toggle}
                disabled={sound === "loading" || sound === "error"}
              >
                {sound === "loading"
                  ? "Učitavanje…"
                  : sound === "error"
                    ? "Zvuk nije dostupan"
                    : sound === "playing"
                      ? "Ⅱ Pauziraj"
                      : sound === "ended"
                        ? "↻ Ponovi"
                        : "▶ Pusti slavlje"}
              </button>
              <label>
                Jačina zvuka
                <input
                  aria-label="Jačina pobjedničke muzike"
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    desiredVolume.current = v;
                    audio.current?.setVolume(v);
                  }}
                />
              </label>
            </div>
            {sound === "blocked" && (
              <p className="victory-sound-note">
                Dodirni „Pusti slavlje” da ponovo uključiš zvuk na ovom uređaju.
              </p>
            )}
            {sound === "error" && (
              <p className="victory-sound-note">
                Muzički servis trenutno nije dostupan. Slavlje se nastavlja bez
                zvuka.
              </p>
            )}
          </div>
        ) : (
          <p className="victory-no-song">
            Nema zabilježenog tačnog muzičkog pogotka pobjednika — podijum je
            svejedno zaslužen.
          </p>
        )}
        <p className="victory-personal">
          {host
            ? "Vodio/la si odličnu kviz večer."
            : `Tvoj učinak: ${mine?.score ?? 0} poena · ${mine?.correct ?? 0}/30 tačnih odgovora.`}
        </p>
        <button className="arena-primary victory-again" onClick={onAgain}>
          Još jedna runda slave ↗
        </button>
      </div>
    </section>
  );
}
