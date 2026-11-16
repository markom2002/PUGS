import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./Pwa.css";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const PwaContext = createContext({ open: () => {}, installed: false });
export function InstallButton({ className = "" }: { className?: string }) {
  const { open, installed } = useContext(PwaContext);
  return installed ? (
    <span className="app-installed">✓ APLIKACIJA</span>
  ) : (
    <button className={`install-button ${className}`} onClick={open}>
      <span aria-hidden="true">↓</span> Instaliraj
    </button>
  );
}
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [secureUrl, setSecureUrl] = useState("");
  useEffect(() => {
    if (typeof fetch !== "function") return;
    fetch("/api/arena/connection").then(r => r.json()).then(info => {
      if (typeof info.publicUrl === "string" && info.publicUrl.startsWith("https://")) setSecureUrl(info.publicUrl + window.location.pathname + window.location.search);
    }).catch(() => {});
  }, []);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDivElement | null>(null);
  const reload = useRef(false);
  useEffect(() => {
    const media = window.matchMedia?.("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        Boolean(
          media?.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone,
        ),
      );
    sync();
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      setHelp(false);
    };
    const up = () => setOnline(true),
      down = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    media?.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      media?.removeEventListener?.("change", sync);
    };
  }, []);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    )
      return;
    let active = true;
    const changed = () => {
      if (reload.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (!active) return;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              active &&
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker);
          });
        });
      })
      .catch(() => {});
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, []);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelp(false);
      if (e.key === "Tab") {
        const buttons =
          dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, [help]);
  async function install() {
    if (!prompt) return;
    setInstalling(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setHelp(false);
      else setMessage("Možeš instalirati kasnije iz menija browsera.");
      setPrompt(null);
    } catch {
      setMessage("Otvori meni browsera i izaberi instalaciju aplikacije.");
    } finally {
      setInstalling(false);
    }
  }
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    <PwaContext.Provider value={{ open: () => setHelp(true), installed }}>
      {children}
      {!online && (
        <div className="app-connection-banner" role="status">
          Nema internet veze. Partija se ne pauzira — vraćamo te čim se povežeš.
        </div>
      )}
      {waiting && (
        <div className="app-update-toast" role="status">
          <div>
            <strong>Nova verzija je spremna.</strong>
            <span>Ako igraš, sačekaj kraj partije.</span>
          </div>
          <button
            onClick={() => {
              reload.current = true;
              waiting.postMessage("SKIP_WAITING");
            }}
          >
            Osvježi
          </button>
          <button
            aria-label="Sakrij obavještenje"
            onClick={() => setWaiting(null)}
          >
            ×
          </button>
        </div>
      )}
      {help && (
        <div
          className="install-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelp(false);
          }}
        >
          <div
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            ref={dialog}
          >
            <button
              className="install-close"
              aria-label="Zatvori"
              onClick={() => setHelp(false)}
            >
              ×
            </button>
            <img src="/icons/app-192.png" alt="" />
            <span className="install-eyebrow">
              TVOJA EKIPA. JEDAN DODIR DALEKO.
            </span>
            <h2 id="install-title">Arena ide s tobom.</h2>
            <p>
              Dodaj Skočka na telefon ili laptop. Otvara se u svom prozoru,
              spreman za sljedeću partiju.
            </p>
            {!window.isSecureContext && secureUrl && (
              <a className="install-primary install-secure-link" href={secureUrl}>Otvori verziju za instalaciju ?</a>
            )}
            {prompt ? (
              <button
                className="install-primary"
                disabled={installing}
                onClick={install}
              >
                {installing
                  ? "Otvaramo instalaciju…"
                  : "Instaliraj Skočko Arenu ↗"}
              </button>
            ) : (
              <ol>
                {ios ? (
                  <>
                    <li>Otvori aplikaciju u Safariju.</li>
                    <li>
                      Dodirni <strong>Podijeli</strong>, pa{" "}
                      <strong>Dodaj na početni ekran</strong>.
                    </li>
                    <li>Potvrdi dodavanje i pokreni novu ikonicu.</li>
                  </>
                ) : (
                  <>
                    <li>Otvori link u Chrome-u ili Edge-u.</li>
                    <li>
                      U meniju browsera izaberi{" "}
                      <strong>Instaliraj aplikaciju</strong> ili{" "}
                      <strong>Dodaj na početni ekran</strong>.
                    </li>
                    <li>Pokreni Skočka kao zasebnu aplikaciju.</li>
                  </>
                )}
              </ol>
            )}
            {!window.isSecureContext && (
              <p className="install-notice">
                Na ovoj lokalnoj adresi možeš igrati u browseru. Za instalaciju
                na telefonu otvori HTTPS pozivnicu za internet igru. Nakon prelaska ponovo pritisni Instaliraj. Na novoj adresi ponovo unesi PIN i nadimak.
              </p>
            )}
            {message && <p role="status">{message}</p>}
            <div className="install-fineprint">
              Za partiju uživo i muziku potrebni su veza i dostupan server. Nema
              registracije.
            </div>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
