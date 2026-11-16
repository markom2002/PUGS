import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
const API = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
export default function RoomInvite({ code }: { code: string }) {
  const [connection, setConnection] = useState<{
    publicUrl?: string | null;
    lanUrls?: string[];
  }>({});
  const [mode, setMode] = useState<"local" | "internet">(() =>
    window.location.protocol === "https:" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? "internet"
      : "local",
  );
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch(`${API}/api/arena/connection`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { publicUrl?: string | null; lanUrls?: string[] }) => {
        if (active) {
          setConnection(data);
          if (data.publicUrl) setMode("internet");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  const remoteOrigin =
    window.location.protocol === "https:" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? window.location.origin
      : null;
  const internet = connection.publicUrl || remoteOrigin;
  const origin =
    mode === "internet" && internet
      ? internet
      : ["localhost", "127.0.0.1"].includes(window.location.hostname)
        ? connection.lanUrls?.[0] || window.location.origin
        : window.location.origin;
  const link = `${origin}/arena?code=${code}`;
  useEffect(() => {
    setCopied(false);
    setNote("");
  }, [link]);
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field = document.createElement("textarea");
        field.value = link;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand("copy");
        field.remove();
        if (!ok) throw new Error();
      }
      setCopied(true);
    } catch {
      setNote("Označi link ispod i kopiraj ga ručno.");
    }
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ulazi u Skočko Arenu",
          text: `Ekipa te čeka! PIN: ${code}`,
          url: link,
        });
      } else await copy();
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copy();
    }
  }
  return (
    <section className="room-invite-panel">
      <div className="invite-card">
        <div>
          <span className="eyebrow">TVOJA EKIPA ULAZI OVDJE</span>
          <strong>
            {code.slice(0, 3)} {code.slice(3)}
          </strong>
          <div className="invite-actions">
            <button className="text-button" onClick={copy}>
              {copied ? "✓ Link kopiran" : "Kopiraj pozivnicu ↗"}
            </button>
            <button className="text-button" onClick={share}>
              Podijeli ↗
            </button>
          </div>
        </div>
        <QRCodeSVG
          value={link}
          size={112}
          bgColor="#fff"
          fgColor="#101320"
          title="Skeniraj da uđeš u partiju"
        />
      </div>
      <div className="invite-mode">
        <button
          disabled={
            !["localhost", "127.0.0.1"].includes(window.location.hostname) &&
            connection.lanUrls?.length === 0 &&
            Boolean(remoteOrigin)
          }
          aria-pressed={mode === "local"}
          className={mode === "local" ? "active" : ""}
          onClick={() => setMode("local")}
        >
          Ista Wi-Fi mreža
        </button>
        <button
          aria-pressed={mode === "internet"}
          disabled={!internet}
          className={mode === "internet" ? "active" : ""}
          onClick={() => setMode("internet")}
        >
          Preko interneta
        </button>
      </div>
      <label className="invite-link-label">
        Pozivnica za ekipu
        <input
          aria-label="Link pozivnice"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <p>
        {mode === "internet"
          ? "Link radi dok je server dostupan. Svako može biti na svojoj mreži."
          : "Za ovaj link budite na istoj Wi-Fi mreži."}
        {!internet &&
          " Internet pozivnica će se pojaviti kada se uključi internet igra."}
      </p>
      {note && <p role="status">{note}</p>}
    </section>
  );
}
