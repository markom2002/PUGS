import React from "react";
import { Link } from "react-router-dom";
import { InstallButton } from "../components/Pwa";
import "./css/Home.css";
const Home: React.FC = () => (
  <main className="pugs-home">
    <section className="pugs-hero">
      <div className="hero-copy">
        <div className="hero-kicker">
          <i /> TVOJA NOVA OMILJENA KVIZ VEČER
        </div>
        <h1>
          Okupi ekipu.
          <br />
          Podigni ulog.
          <br />
          <span>Pokidaj kviz.</span>
        </h1>
        <p>
          Veliko znanje. Domaći hitovi. Mapa sveta. Pretvori običnu večer u
          runde koje će se prepričavati.
        </p>
        <div className="hero-actions">
          <Link className="hero-primary" to="/arena">
            Pokreni partiju <span>↗</span>
          </Link>
          <Link className="hero-secondary" to="/arena?code=">
            Pridruži se →
          </Link>
        </div>
        <Link className="hero-secondary" to="/offline">Napolju bez interneta / samo telefoni</Link>
        <div className="hero-caption">
          <span>◉ Telefon + laptop</span>
          <span>Bez registracije</span>
          <span>Do 32 učesnika</span>
        </div>
      </div>
      <div className="hero-stage" aria-label="Pregled kviz arene">
        <div className="stage-orbit orbit-a" />
        <div className="stage-orbit orbit-b" />
        <div className="stage-orbit orbit-c" />
        <div className="stage-crosshair crosshair-a" />
        <div className="stage-crosshair crosshair-b" />
        <div className="hero-mascot">
          <img src="/skocko.svg" alt="" />
          <span className="mascot-shadow" />
        </div>
        <div className="stage-label">
          <span className="stage-dot" /> ZNANJE ULAZI U ARENU.
        </div>
        <div className="stage-score">
          <span>TAČAN ODGOVOR</span>
          <strong>
            +150<small>POENA</small>
          </strong>
          <div>
            <i /> BRZINA PRAVI RAZLIKU
          </div>
        </div>
        <div className="stage-music">
          <div className="stage-wave">
            {[16, 30, 22, 45, 35, 52, 24, 40, 20, 32].map((h, i) => (
              <i
                key={i}
                style={{ height: h, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <div>
            <strong>Prepoznaj hit.</strong>
            <span>MUZIČKO FINALE / 05 PJESAMA</span>
          </div>
        </div>
        <div className="stage-ticket">
          <span>PRIMJER IGRE</span>
          <b>01 — KALADONT</b>
          <div>
            S<i>→</i>N<i>→</i>A
          </div>
          <small>Posljednje slovo. Novi izazov.</small>
        </div>
        <span className="stage-index">SKOČKO / SEASON: VEČERAS</span>
      </div>
    </section>
    <section className="home-number-strip">
      <div>
        <b>02+</b>
        <span>oblasti po izboru ekipe</span>
      </div>
      <div>
        <b>05</b>
        <span>pitanja po izabranoj oblasti</span>
      </div>
      <div>
        <b>813</b>
        <span>domaćih hitova</span>
      </div>
      <div>
        <b>01</b>
        <span>ekipa koju okupljaš</span>
      </div>
    </section>
    <section className="home-rounds" id="kako-se-igra">
      <div className="home-section-heading">
        <div>
          <span className="home-eyebrow">OVDJE SVAKO IMA SVOJ TRENUTAK.</span>
          <h2>
            Znanje. Muzika. Mapa.
            <br />
            <em>Nula dosadnih minuta.</em>
          </h2>
        </div>
        <Link to="/arena">Uđi u arenu ↗</Link>
      </div>
      <div className="home-round-cards">
        <article className="home-round-card kaladont">
          <div className="round-card-top">
            <span>01 / ZAGRIJAVANJE</span>
            <b>↗</b>
          </div>
          <div className="round-chain">
            <strong>A</strong>
            <i>→</i>
            <strong>B</strong>
            <i>→</i>
            <strong>C</strong>
          </div>
          <h3>Kaladont znanja</h3>
          <p>
            Odgovori se nadovezuju. Posljednje slovo jednog otvara sljedeće
            pitanje. Pet karika, jedan lanac znanja.
          </p>
          <small>OPŠTE ZNANJE / 5 PITANJA</small>
        </article>
        <article className="home-round-card choice">
          <div className="round-card-top">
            <span>VAŠ IZBOR / VAŠ TEREN</span>
            <b>↗</b>
          </div>
          <div className="round-topics">
            <span>SPORT</span>
            <span>FILM</span>
            <span>NAUKA</span>
            <span>ISTORIJA</span>
          </div>
          <h3>Vaša igra. Vaša pravila.</h3>
          <p>
            Neko živi za sport. Neko zna svaki film ili igricu. Izaberite najmanje
            dve oblasti, uključite mapu ako želite i pustite da svako zablista.
          </p>
          <small>NAJMANJE 2 OBLASTI / PO 5 PITANJA</small>
        </article>
        <article className="home-round-card music">
          <div className="round-card-top">
            <span>FINALE / ZADNJI REFREN</span>
            <b>↗</b>
          </div>
          <div className="music-art">
            {[20, 42, 30, 65, 45, 78, 52, 28, 55, 35, 65, 25].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </div>
          <h3>Znaš je na prvu.</h3>
          <p>
            Od kafane do modernih hitova. Nekoliko sekundi originalne pjesme i
            trka za naslovom. Završnica koja diže ekipu.
          </p>
          <small>6 MUZIČKIH ŽANROVA / 5 PJESAMA</small>
        </article>
      </div>
    </section>
    <section className="home-app">
      <div className="app-pitch">
        <span className="home-eyebrow">JEDNA ARENA. SVAKI TVOJ EKRAN.</span>
        <h2>
          Veliki ekran.
          <br />
          Mali ekran.
          <br />
          <em>Ista velika igra.</em>
        </h2>
        <p>
          Na laptopu vodiš večer, na telefonu loviš poene. Dodaj Skočka među
          aplikacije i sljedeći put uđi jednim dodirom.
        </p>
        <InstallButton className="app-pitch-install" />
        <div className="app-feature-line">
          <span>↓ Instalacija iz browsera</span>
          <span>↗ Pozovi linkom ili QR kodom</span>
        </div>
      </div>
      <div className="device-stage" aria-label="Skočko na laptopu i telefonu">
        <div className="device-laptop">
          <div className="device-browser">
            <i />
            <i />
            <i />
            <span>SKOČKO / ARENA</span>
          </div>
          <div className="device-content">
            <div className="device-round">RUNDA 01 / KALADONT</div>
            <strong>
              Koji je glavni
              <br />
              grad Italije?
            </strong>
            <div className="device-answer">
              Rim <span>✓ POSLATO</span>
            </div>
            <div className="device-progress">
              <i />
            </div>
            <small>EKIPA JE NA POTEZU.</small>
          </div>
          <div className="device-keyboard" />
        </div>
        <div className="device-phone">
          <div className="phone-island" />
          <img src="/skocko.svg" alt="" />
          <small>POREDAK UŽIVO</small>
          <div>
            <span>01</span>
            <b>Ti</b>
            <strong>1.450</strong>
          </div>
          <div>
            <span>02</span>
            <b>Ekipa</b>
            <strong>1.320</strong>
          </div>
          <p>↑ TVOJ TRENUTAK.</p>
          <button tabIndex={-1} aria-hidden="true">
            SLJEDEĆE PITANJE
          </button>
        </div>
        <span className="device-preview-label">ILUSTRACIJA APLIKACIJE</span>
      </div>
    </section>
    <section className="home-how">
      <div>
        <span className="home-eyebrow">DOGOVOR U GRUPI. PARTIJA ZA MINUT.</span>
        <h2>
          Tri koraka
          <br />
          do dobrog provoda.
        </h2>
        <p>
          Bez komplikacija. Domaćin otvara sobu, a arena priprema pitanja i
          muziku.
        </p>
      </div>
      <ol>
        <li>
          <b>01</b>
          <div>
            <h3>Napravi sobu</h3>
            <p>Izaberi nadimak i tempo. Pozornica je spremna.</p>
          </div>
        </li>
        <li>
          <b>02</b>
          <div>
            <h3>Pozovi ekipu</h3>
            <p>
              Pošalji pozivnicu ili pokaži QR kod. Svako igra sa svog uređaja.
            </p>
          </div>
        </li>
        <li>
          <b>03</b>
          <div>
            <h3>Glasajte. Igrajte. Slavite.</h3>
            <p>
              Izaberite oblasti i krenite po podijum. Najbrži muzički pogodak
              pobjednika postaje soundtrack slavlja.
            </p>
          </div>
        </li>
      </ol>
    </section>
    <section className="home-final-cta">
      <div className="cta-orbit" />
      <span>NEKA SE O OVOJ VEČERI PRIČA.</span>
      <h2>
        Ekipa je spremna.
        <br />
        <em>Jesi li ti?</em>
      </h2>
      <Link className="hero-primary" to="/arena">
        Napravi svoju partiju ↗
      </Link>
      <p>Telefon, laptop i malo takmičarskog duha. To je sve.</p>
    </section>
    <footer className="home-footer">
      <Link className="footer-brand" to="/">
        <img src="/skocko.svg" alt="Skočko" />
        <span>ARENA</span>
      </Link>
      <span>DOBRO DRUŠTVO. DOBRA PITANJA.</span>
      <Link to="/arena">Ulaz u igru ↗</Link>
    </footer>
  </main>
);
export default Home;
