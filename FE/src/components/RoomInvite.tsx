import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {arenaFetch} from '../utils/arenaApi';
import {InviteConnection,inviteOrigin,remoteOrigin,loopbackHost} from '../utils/inviteAddress';
export default function RoomInvite({ code }: { code: string }) {
  const [connection, setConnection] = useState<InviteConnection>({});
  const [loading,setLoading]=useState(true);
  const manualMode=useRef(false);
  const [mode, setMode] = useState<"local" | "internet">(() =>
    window.location.protocol === "https:" &&
    !loopbackHost(window.location.hostname)
      ? "internet"
      : "local",
  );
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    let active = true;
    let timer:ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll=()=>arenaFetch('connection', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: InviteConnection) => {
        if (active) {
          setConnection(data);
          if(!manualMode.current)setMode(data.publicUrl||remoteOrigin(window.location)?'internet':'local');
        }
      })
      .catch(() => {if(active)setConnection({});})
      .finally(()=>{if(active){setLoading(false);timer=setTimeout(poll,15000);}});
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  const internet = remoteOrigin(window.location)||connection.publicUrl;
  const origin = inviteOrigin(window.location,connection,mode);
  const link = origin?`${origin}/arena?code=${code}`:'';
  useEffect(() => {
    setCopied(false);
    setNote("");
  }, [link]);
  async function copy() {
    if(!link)return;
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
    if(!link)return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ulazi u Live Quiz Arena",
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
            <button className="text-button" onClick={copy} disabled={!link}>
              {copied ? "✓ Link kopiran" : "Kopiraj pozivnicu ↗"}
            </button>
            <button className="text-button" onClick={share} disabled={!link}>
              Podijeli ↗
            </button>
          </div>
        </div>
        {link?<QRCodeSVG
          value={link}
          size={112}
          bgColor="#fff"
          fgColor="#101320"
          title="Skeniraj da uđeš u partiju"
        />:<p role="status">{loading?'Pripremam pozivnicu…':'Nema dostupne adrese za telefon.'}</p>}
      </div>
      <div className="invite-mode">
        <button
          disabled={
            !inviteOrigin(window.location,connection,'local')
          }
          aria-pressed={mode === "local"}
          className={mode === "local" ? "active" : ""}
          onClick={() => {manualMode.current=true;setMode("local");}}
        >
          Ista Wi-Fi mreža
        </button>
        <button
          aria-pressed={mode === "internet"}
          disabled={!internet}
          className={mode === "internet" ? "active" : ""}
          onClick={() => {manualMode.current=true;setMode("internet");}}
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
          placeholder={loading?'Pripremam adresu…':'Poveži računar na mrežu i ponovo pokreni aplikaciju.'}
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
