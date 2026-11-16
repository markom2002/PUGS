import {
  clearMatchSession,
  readMatchSession,
  rememberMatchSession,
} from "../utils/matchSession";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RoomInvite from "../components/RoomInvite";
import { installVictoryAudioUnlock } from "../audio/victoryAudio";
import {
  rememberMusicPreview,
  clearMusicPreviews,
} from "../audio/musicPreviewCache";
import "./css/Arena.css";
import { InstallButton } from "../components/Pwa";
import WinnerCelebration, { Victory } from "../components/WinnerCelebration";

const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
type Session = { code: string; token: string };
type Player = {
  name: string;
  host: boolean;
  score: number | null;
  correct: number | null;
  voted: boolean;
  answered: boolean;
  rank?: number;
  rankChange?: number;
  responseMs?: number | null;
  averageMs?: number | null;
  questionPoints?: number | null;
  fastest?: boolean;
};
type State = {
  code: string;
  phase: string;
  index: number;
  seconds: number;
  deadline: string;
  serverNow: string;
  isHost: boolean;
  me: string;
  votes: string[];
  selected: string[];
  categories: string[];
  musicCount: number;
  victory?: Victory | null;
  rankingLive?: boolean;
  answeredCount?: number;
  competitorCount?: number;
  music: { title: string; artist: string }[] | null;
  players: Player[];
  question: {
    text: string;
    category: string;
    audioUrl: string | null;
    initial: string | null;
  } | null;
  answer: string | null;
  artist: string | null;
  musicSourceUrl?: string | null;
  submitted: boolean;
  myAnswer: string | null;
  points: number | null;
};
export async function arenaRequest(
  path: string,
  session: Session | null,
  body?: unknown,
) {
  const response = await fetch(`${API}/api/arena/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(session ? { "X-Player-Token": session.token } : {}),
    },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "Zahtjev nije uspio. Pokušaj ponovo."),
      { status: response.status },
    );
  return data;
}
const icons = ["↗", "◈", "◎", "⚡", "◷", "⌘", "✳", "❋"];
export default function Arena() {
  const [params, setParams] = useSearchParams();
  useEffect(() => installVictoryAudioUnlock(), []);
  const invitation = params.has("code") ? params.get("code") || "" : null;
  const [session, setSession] = useState<Session | null>(() =>
    readMatchSession(invitation),
  );
  const restoring = useRef(Boolean(session));
  const previousInvitation = useRef(invitation);
  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState(params.has("code") ? "join" : "create");
  const [name, setName] = useState("");
  const [code, setCode] = useState(params.get("code") || "");
  const [seconds, setSeconds] = useState(20);
  const [votes, setVotes] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [remaining, setRemaining] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const offset = useRef(0);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!session) return;
    const ticket = generation.current;
    const next: State = await arenaRequest(`rooms/${session.code}`, session);
    if (ticket !== generation.current) return;
    if (next.phase === "finished") {
      clearMatchSession();
      if (restoring.current) {
        restoring.current = false;
        generation.current++;
        setSession(null);
        setState(null);
        setMode("create");
        setCode("");
        setName("");
        setVotes([]);
        setError(
          "Prethodna partija je završena. Za novi meč ponovo napravi sobu ili unesi novi PIN.",
        );
        return next;
      }
    }
    restoring.current = false;
    offset.current = Date.parse(next.serverNow) - Date.now();
    setState(next);
    setOnline(true);
    return next;
  }, [session]);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) {
          const status = (e as Error & { status?: number }).status;
          if (status === 401 || status === 400 || status === 404) {
            clearMatchSession();
            generation.current++;
            restoring.current = false;
            setSession(null);
            setState(null);
            setMode("join");
            setCode(session.code);
            setName("");
            setVotes([]);
            setError(
              "Soba je zatvorena ili je čekaonica osvježena. Ponovo se prijavi u sobu za novi meč.",
            );
            return;
          }
          setOnline(false);
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) timer = setTimeout(poll, 900);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      generation.current++;
    };
  }, [session, refresh]);
  useEffect(() => {
    if (previousInvitation.current === invitation) return;
    previousInvitation.current = invitation;
    clearMatchSession();
    generation.current++;
    restoring.current = false;
    setSession(null);
    setState(null);
    setMode(invitation === null ? "create" : "join");
    setCode(invitation || "");
    setName("");
    setVotes([]);
    setError("");
  }, [invitation]);
  useEffect(() => {
    setAnswer("");
    setAudioError("");
  }, [state?.index]);
  useEffect(() => {
    const tick = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(state?.deadline || "") - Date.now() - offset.current) /
              1000,
          ),
        ) || 0,
      );
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state?.deadline]);
  const index = state?.index;
  const phase = state?.phase;
  const hasAudio = Boolean(state?.question?.audioUrl);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    if (audioUrl.current) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = null;
    }
    if (session && hasAudio && phase === "question") {
      fetch(`${API}/api/arena/rooms/${session.code}/audio/${index}`, {
        headers: { "X-Player-Token": session.token },
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          rememberMusicPreview(session.code, session.token, index!, blob);
          audioUrl.current = URL.createObjectURL(blob);
          audioRef.current = new Audio(audioUrl.current);
        })
        .catch(() => {
          if (!cancelled)
            setAudioError(
              "Audio nije dostupan. Provjeri vezu ili format fajla.",
            );
        });
    }
    return () => {
      cancelled = true;
      controller.abort();
      audioRef.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, [session, index, phase, hasAudio]);
  // Stop every device on the shared 8-second clip boundary, even after reconnect.
  useEffect(() => {
    if (
      state &&
      hasAudio &&
      (phase !== "question" || remaining <= state.seconds - 8)
    ) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [remaining, state, hasAudio, phase]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    setName("");
    setVotes([]);
    setCode("");
    setMode(state?.isHost ? "create" : "join");
    restoring.current = false;
    previousInvitation.current = null;
    setParams({}, { replace: true });
    clearMusicPreviews();
    if (session && state?.phase === "lobby")
      void arenaRequest(`rooms/${session.code}/leave`, session, {}).catch(
        () => {},
      );
    generation.current++;
    clearMatchSession();
    setSession(null);
    setState(null);
    setError("");
  }
  async function enter(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const next = await arenaRequest(
        mode === "create" ? "rooms" : `rooms/${code}/join`,
        null,
        mode === "create" ? { name, seconds } : { name },
      );
      rememberMatchSession(next);
      previousInvitation.current = next.code;
      setParams({ code: next.code }, { replace: true });
      restoring.current = false;
      setSession(next);
    });
  }
  const rounds = [
    "Kaladont",
    ...(state?.selected.length
      ? state.selected
      : ["Vaš izbor", "Vaš izbor", "Vaš izbor", "Vaš izbor"]),
    "Muzičko finale",
  ];
  const round = state ? Math.max(0, Math.floor(state.index / 5)) : 0;
  const questionActive = state?.phase === "question";
  return (
    <main className="arena-shell">
      <div className="arena-topline">
        <Link to="/">
          <img src="/skocko.svg" alt="Skočko" width="38" height="44" />{" "}
          <span>/ ARENA</span>
        </Link>
        <div className="arena-header-actions">
          <InstallButton />
          <span className="live-label">
            <i className={online ? "" : "offline"} />
            {online ? "MULTIPLAYER UŽIVO" : "PONOVNO POVEZIVANJE"}
          </span>
        </div>
      </div>
      {error && (
        <div className="arena-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Zatvori poruku">
            ×
          </button>
        </div>
      )}
      {!session ? (
        <div className="arena-entry">
          <section>
            <span className="eyebrow">DOBRO DOŠLI U NOVU KVIZ VEČE</span>
            <h1>
              Znanje je dobro.
              <br />
              <em>Ekipa je bolja.</em>
            </h1>
            <p>
              Šest rundi. Trideset pitanja. Jedna ekipa koja misli da zna sve.
              Vrijeme je da to provjerimo.
            </p>
            <div className="entry-stats">
              <div>
                <strong>06</strong>rundi
              </div>
              <div>
                <strong>30</strong>pitanja
              </div>
              <div>
                <strong>20s</strong>za odgovor
              </div>
            </div>
            <div className="round-preview">
              <span>01 / KALADONT</span>
              <h3>
                Jedno slovo.
                <br />
                Lanac znanja.
              </h3>
              <div className="letter-chain">
                S<span>→</span>N<span>→</span>A<span>→</span>A
              </div>
              <p>Posljednje slovo tačnog odgovora otvara sljedeće pitanje.</p>
            </div>
          </section>
          <section className="arena-entry-card">
            <div className="mode-switch">
              <button
                className={mode === "create" ? "selected" : ""}
                onClick={() => setMode("create")}
              >
                Napravi sobu
              </button>
              <button
                className={mode === "join" ? "selected" : ""}
                onClick={() => setMode("join")}
              >
                Pridruži se
              </button>
            </div>
            <h2>
              {mode === "create"
                ? "Okupi svoju ekipu."
                : "Tvoja ekipa te čeka."}
            </h2>
            <p>Igrajte zajedno, svako sa svog uređaja.</p>
            <form onSubmit={enter}>
              <label>
                Tvoj nadimak
                <input
                  required
                  maxLength={24}
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kako te ekipa zove?"
                />
              </label>
              {mode === "join" ? (
                <label>
                  PIN sobe
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000 000"
                  />
                </label>
              ) : (
                <label>
                  Vrijeme za odgovor
                  <select
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value))}
                  >
                    <option value={20}>20 sekundi · opušten tempo</option>
                    <option value={15}>15 sekundi · izazov</option>
                    <option value={10}>10 sekundi · za najbrže</option>
                  </select>
                </label>
              )}
              <button className="arena-primary" disabled={busy}>
                {busy
                  ? "Povezivanje…"
                  : mode === "create"
                    ? "Kreiraj partiju ↗"
                    : "Ulazim u igru ↗"}
              </button>
            </form>
            <div className="entry-note">
              Bez registracije. Telefon ili računar. Do 32 igrača.
              <br />
              Pet domaćih hitova bira se automatski iz biblioteke.
            </div>
          </section>
        </div>
      ) : !state ? (
        <div className="arena-wait">
          <h2>Povezivanje sa sobom {session.code}…</h2>
          <button className="arena-secondary" onClick={leave}>
            Povratak
          </button>
        </div>
      ) : (
        <>
          <header className="room-heading">
            <div>
              <span className="eyebrow">
                {state.phase === "lobby"
                  ? "ČEKAONICA / OKUPLJANJE EKIPE"
                  : state.phase === "finished"
                    ? "TO JE BILA PARTIJA!"
                    : `RUNDA ${round + 1} OD 6`}
              </span>
              <h1>
                {state.phase === "lobby"
                  ? "Mjesto za tvoju ekipu."
                  : state.phase === "finished"
                    ? "Znanje ima pobjednika."
                    : rounds[round]}
              </h1>
            </div>
            <button className="arena-secondary" onClick={leave}>
              Napusti prikaz ↗
            </button>
          </header>
          <div className="arena-layout">
            <div className="arena-main">
              {state.phase === "lobby" ? (
                <>
                  <RoomInvite code={state.code} />
                  <section className="arena-panel">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">RUNDE 02—05</span>
                        <h2>Vaša igra. Vaše oblasti.</h2>
                      </div>
                      <span className="pill">{votes.length}/4</span>
                    </div>
                    <p>
                      Svako bira četiri oblasti. Četiri sa najviše glasova ulaze
                      u partiju; izjednačene bira žrijeb.
                    </p>
                    <div className="category-grid">
                      {state.categories.map((c, i) => (
                        <button
                          key={c}
                          aria-pressed={votes.includes(c)}
                          className={votes.includes(c) ? "chosen" : ""}
                          onClick={() =>
                            setVotes((v) =>
                              v.includes(c)
                                ? v.filter((x) => x !== c)
                                : v.length < 4
                                  ? [...v, c]
                                  : v,
                            )
                          }
                        >
                          <span>{icons[i]}</span>
                          {c}
                          <b>{votes.includes(c) ? "✓" : "+"}</b>
                        </button>
                      ))}
                    </div>
                    <button
                      className="arena-primary"
                      disabled={busy || votes.length !== 4}
                      onClick={() =>
                        action(async () => {
                          await arenaRequest(
                            `rooms/${state.code}/vote`,
                            session,
                            { categories: votes },
                          );
                          await refresh();
                        })
                      }
                    >
                      {state.votes.length === 4
                        ? "Ažuriraj izbor oblasti"
                        : "Potvrdi svoje četiri oblasti"}
                    </button>
                    {state.votes.length === 4 && (
                      <p className="success-text">
                        ✓ Sačuvano: {state.votes.join(" · ")}
                      </p>
                    )}
                  </section>
                  {state.isHost && (
                    <section className="arena-panel">
                      <span className="eyebrow">RUNDA 06 / DOMAĆA MUZIKA</span>
                      <div className="lobby-reset">
                        <div>
                          <strong>Novi meč, svježa ekipa.</strong>
                          <p>
                            U novu sobu svaki igrač ulazi ponovo. Ovim dugmetom
                            uklanjaš sve igrače iz ove čekaonice, osim domaćina.
                          </p>
                        </div>
                        <button
                          className="arena-secondary"
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              await arenaRequest(
                                `rooms/${state.code}/reset-lobby`,
                                session,
                                {},
                              );
                              setVotes([]);
                              await refresh();
                            })
                          }
                        >
                          Isprazni čekaonicu
                        </button>
                      </div>
                      <h2>Pet pjesama. Prepoznaj hit.</h2>
                      <p>
                        Aplikacija automatski bira pet domaćih hitova iz baze,
                        uz različite žanrove: narodna, kafanska, pop-folk,
                        pop/rock, rep i moderna muzika. Slušate originalne
                        izvođače preko Deezer preview isečaka. Nema dodavanja
                        fajlova — potrebna je internet veza.
                      </p>
                      <button
                        className="arena-primary"
                        disabled={
                          busy ||
                          state.players.length < 2 ||
                          state.players.some((p) => !p.voted)
                        }
                        onClick={() =>
                          action(async () => {
                            await arenaRequest(
                              `rooms/${state.code}/start`,
                              session,
                              {},
                            );
                            await refresh();
                          })
                        }
                      >
                        {busy ? "Pripremamo pjesme…" : "Pokreni partiju →"}
                      </button>
                      <p className="entry-note">
                        Start se otključava kada svi glasaju. Pjesme se
                        automatski biraju pri pokretanju.
                      </p>
                    </section>
                  )}
                </>
              ) : state.phase === "countdown" ? (
                <section className="question-card countdown">
                  <span className="eyebrow">SPREMNI? KREĆEMO!</span>
                  <strong>{remaining}</strong>
                  <h2>Prvo slovo otvara igru.</h2>
                  <p>{state.selected.join(" / ")}</p>
                </section>
              ) : state.phase === "finished" ? (
                <WinnerCelebration
                  victory={
                    state.victory || {
                      winnerNames: state.players
                        .filter((p) => p.score === state.players[0]?.score)
                        .map((p) => p.name),
                      score: state.players[0]?.score || 0,
                      song: null,
                    }
                  }
                  players={state.players}
                  me={state.me}
                  host={state.isHost}
                  code={state.code}
                  token={session.token}
                  onAgain={leave}
                />
              ) : (
                <section className="question-card" key={state.index}>
                  <div className="question-meta">
                    <span className="pill">{state.question?.category}</span>
                    <span>PITANJE {(state.index % 5) + 1} / 5</span>
                    <div
                      className={
                        remaining <= 5 && questionActive
                          ? "timer urgent"
                          : "timer"
                      }
                    >
                      {questionActive ? remaining : "✓"}
                      <small>{questionActive ? "sek" : "kraj"}</small>
                    </div>
                  </div>
                  <div className="timer-track">
                    <div
                      style={{
                        width: `${questionActive ? (remaining / state.seconds) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {state.question?.initial && (
                    <div className="initial-hint">
                      ODGOVOR POČINJE SLOVOM{" "}
                      <strong>{state.question.initial}</strong>
                    </div>
                  )}
                  <h2>{state.question?.text}</h2>
                  {hasAudio && (
                    <div className="audio-panel">
                      <div
                        className={playing ? "equalizer playing" : "equalizer"}
                      >
                        {Array.from({ length: 22 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              height: `${16 + ((i * 17) % 46)}px`,
                              animationDelay: `${i * 0.07}s`,
                            }}
                          />
                        ))}
                      </div>
                      {questionActive && remaining > state.seconds - 8 ? (
                        <button
                          className="arena-secondary"
                          disabled={playing}
                          onClick={() => {
                            const audio = audioRef.current;
                            if (!audio) {
                              setAudioError(
                                "Isečak se još učitava. Pokušaj ponovo.",
                              );
                              return;
                            }
                            audio.currentTime = Math.max(
                              0,
                              state.seconds - remaining,
                            );
                            audio
                              .play()
                              .then(() => {
                                setPlaying(true);
                                setAudioError("");
                              })
                              .catch(() =>
                                setAudioError(
                                  "Klikni ponovo da dozvoliš zvuk.",
                                ),
                              );
                          }}
                        >
                          {" "}
                          {playing ? "♫ Slušaj pažljivo…" : "▶ Pusti isečak"}
                        </button>
                      ) : (
                        <p>Isečak je završen.</p>
                      )}
                      {audioError && <p role="alert">{audioError}</p>}
                    </div>
                  )}
                  {questionActive && state.isHost ? (
                    <div className="answer-reveal">
                      <span>REŽIJA PARTIJE</span>
                      <h3>Ekipa je na potezu.</h3>
                      <p>
                        Vodiš igru van konkurencije. Tačan odgovor se otkriva po
                        isteku vremena.
                      </p>
                    </div>
                  ) : questionActive ? (
                    <form
                      className="answer-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        action(async () => {
                          await arenaRequest(
                            `rooms/${state.code}/answer`,
                            session,
                            { index: state.index, answer },
                          );
                          await refresh();
                        });
                      }}
                    >
                      <label htmlFor="arena-answer">
                        {state.submitted
                          ? "ODGOVOR JE ZAKLJUČAN"
                          : "TVOJ ODGOVOR"}
                      </label>
                      <div>
                        <input
                          id="arena-answer"
                          key={state.index}
                          autoFocus
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          maxLength={160}
                          required
                          disabled={
                            state.submitted || !online || remaining === 0
                          }
                          value={
                            state.submitted ? state.myAnswer || "" : answer
                          }
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Upiši odgovor…"
                        />
                        <button
                          className="arena-primary"
                          disabled={
                            busy ||
                            state.submitted ||
                            !answer.trim() ||
                            !online ||
                            remaining === 0
                          }
                        >
                          {state.submitted ? "✓ Poslato" : "Pošalji ↗"}
                        </button>
                      </div>
                      <p>
                        {state.submitted
                          ? "Sačekaj kraj tajmera za tačan odgovor."
                          : "Velika slova i dijakritici ne utiču na provjeru. Brzina donosi do 50 bonus poena."}
                      </p>
                    </form>
                  ) : (
                    <div
                      className={
                        state.points ? "answer-reveal correct" : "answer-reveal"
                      }
                    >
                      <span>
                        {state.points
                          ? `TAČNO! +${state.points} POENA`
                          : "TAČAN ODGOVOR"}
                      </span>
                      <h3>{state.answer}</h3>
                      {state.artist && <p>{state.artist}</p>}
                      {state.musicSourceUrl && (
                        <a
                          href={state.musicSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Originalna pjesma na Deezeru ↗
                        </a>
                      )}
                      <p>
                        Tvoj odgovor: {state.myAnswer || "Nije poslat"} ·
                        Sljedeće pitanje za {remaining}s
                      </p>
                    </div>
                  )}
                </section>
              )}
            </div>
            <aside className="arena-sidebar">
              <section className="arena-panel live-ranking">
                <div className="section-heading">
                  <h2>
                    {state.phase === "lobby"
                      ? "Ekipa"
                      : state.phase === "finished"
                        ? "Konačan poredak"
                        : "Poredak uživo"}
                  </h2>
                  <span
                    className={
                      online ? "ranking-live" : "ranking-live disconnected"
                    }
                  >
                    ● {online ? "LIVE" : "VEZA…"}
                  </span>
                </div>
                {state.phase !== "lobby" && state.phase !== "finished" && (
                  <>
                    <div className="ranking-summary">
                      <strong>
                        {state.answeredCount ??
                          state.players.filter((p) => !p.host && p.answered)
                            .length}
                        <small>
                          /
                          {state.competitorCount ??
                            state.players.filter((p) => !p.host).length}
                        </small>
                      </strong>
                      <span>igrača je odgovorilo</span>
                    </div>
                    <div className="ranking-progress">
                      <i
                        style={{
                          width: `${((state.answeredCount || 0) / Math.max(1, state.competitorCount || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="ranking-hint">
                      {state.rankingLive
                        ? "Poeni se osvježavaju uživo."
                        : "Zaključaj odgovor da pratiš poene ovog pitanja uživo."}
                    </p>
                  </>
                )}
                <div className="player-list">
                  {state.players.map((p) => (
                    <div
                      key={p.name}
                      className={`${p.name === state.me ? "me" : ""} ${p.fastest && p.answered ? "fastest-player" : ""}`}
                    >
                      <span className="ranking-position">
                        {p.host
                          ? "◇"
                          : state.phase === "lobby"
                            ? "·"
                            : String(p.rank ?? "—").padStart(2, "0")}
                      </span>
                      <div className="ranking-player-info">
                        <strong>
                          {p.name}
                          {p.name === state.me && <small> TI</small>}
                        </strong>
                        <small>
                          {p.host
                            ? "Domaćin · van konkurencije"
                            : state.phase === "lobby"
                              ? p.voted
                                ? "Izbor potvrđen"
                                : "Bira oblasti…"
                              : state.phase === "finished"
                                ? "Partija završena"
                                : p.answered
                                  ? `${p.responseMs != null ? (p.responseMs / 1000).toFixed(2) + " s" : "Poslato"}${p.fastest ? " · ⚡ najbrži" : ""}`
                                  : "Razmišlja…"}
                        </small>
                        {!p.host &&
                          state.phase !== "lobby" &&
                          p.averageMs != null && (
                            <small className="ranking-average">
                              Prosjek {(p.averageMs / 1000).toFixed(2)} s ·{" "}
                              {p.correct ?? 0} tačnih
                            </small>
                          )}
                      </div>
                      <div className="ranking-score">
                        <b>
                          {state.phase === "lobby"
                            ? p.voted
                              ? "✓"
                              : "·"
                            : p.host
                              ? "—"
                              : (p.score ?? 0)}
                        </b>
                        {state.phase !== "lobby" && !p.host && (
                          <>
                            <small>poena</small>
                            <span
                              className={`rank-movement ${(p.rankChange || 0) > 0 ? "up" : (p.rankChange || 0) < 0 ? "down" : ""}`}
                            >
                              {(p.rankChange || 0) > 0
                                ? `↑ ${p.rankChange}`
                                : (p.rankChange || 0) < 0
                                  ? `↓ ${Math.abs(p.rankChange!)}`
                                  : "—"}
                            </span>
                            {p.questionPoints != null &&
                              p.answered &&
                              state.phase !== "finished" && (
                                <span
                                  className={
                                    p.questionPoints > 0
                                      ? "ranking-gain"
                                      : "ranking-zero"
                                  }
                                >
                                  +{p.questionPoints}
                                </span>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {state.phase !== "lobby" && state.phase !== "finished" && (
                  <p className="ranking-footnote">
                    ⚡ Najbrži označava prvi poslat odgovor, bez obzira na
                    tačnost. Izjednačeni poeni dijele poziciju.
                  </p>
                )}
              </section>
              <section className="arena-panel round-list">
                <span className="eyebrow">PUT DO PODIJUMA</span>
                {rounds.map((r, i) => (
                  <div
                    className={
                      state.phase !== "lobby" && i === round ? "active" : ""
                    }
                    key={i}
                  >
                    <span>0{i + 1}</span>
                    <strong>{r}</strong>
                    <small>5 pitanja</small>
                  </div>
                ))}
              </section>
              <p className="sidebar-note">
                100 poena za tačan odgovor.
                <br />
                Do 50 bonus poena za brzinu.
                <br />
                Odgovori se provjeravaju na serveru.
              </p>
            </aside>
          </div>
        </>
      )}
      <footer className="arena-footer">
        <span>Skočko / IGRA ZA ZNATIŽELJNE.</span>
        <span>Dobro društvo. Dobra pitanja.</span>
      </footer>
    </main>
  );
}
