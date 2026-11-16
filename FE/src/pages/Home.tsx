import React from "react";
import { Link } from "react-router-dom";
import "./css/Home.css";
const Home: React.FC = () => (
  <main className="pugs-home">
    <section className="pugs-hero">
      <div className="hero-copy">
        <div className="hero-kicker">
          <i /> NOVA GENERACIJA KVIZ VEČERI
        </div>
        <h1>
          Okupi ekipu.
          <br />
          Uključi mozak.
          <br />
          <span>Pokidaj kviz.</span>
        </h1>
        <p>
          Od prvog slova do posljednjeg refrena. Izazovi prijatelje u šest rundi
          znanja, brzine i domaćih hitova.
        </p>
        <div className="hero-actions">
          <Link className="hero-primary" to="/arena">
            Pokreni partiju <span>↗</span>
          </Link>
          <Link className="hero-secondary" to="/arena?code=">
            Imam PIN sobe →
          </Link>
        </div>
        <div className="hero-caption">
          <span>◉ Telefon + računar</span>
          <span>✦ Bez registracije</span>
          <span>↗ Do 32 igrača</span>
        </div>
      </div>
      <div className="hero-visual" aria-label="Ilustracija kviz arene">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="floating-chip chip-one">✦ ZNANJE JE TIMSKI SPORT</div>
        <div className="visual-card">
          <div className="visual-card-top">
            <span>Skočko / ARENA</span>
            <span className="visual-live">● UŽIVO</span>
          </div>
          <div className="visual-round">01 / KALADONT</div>
          <h2>
            Sve počinje
            <br />
            jednim slovom.
          </h2>
          <div className="hero-letters">
            <b>S</b>
            <span>→</span>
            <b>N</b>
            <span>→</span>
            <b>A</b>
          </div>
          <div className="visual-progress">
            <i />
          </div>
          <div className="visual-card-bottom">
            <span>5 PITANJA</span>
            <span>20 SEKUNDI / ODGOVOR</span>
          </div>
        </div>
        <div className="floating-chip chip-two">
          <span>♫</span>
          <div>
            Prepoznaj hit.<small>Muzičko finale te čeka.</small>
          </div>
        </div>
        <div className="visual-star">✳</div>
      </div>
    </section>
    <section className="home-number-strip">
      <div>
        <b>06</b>
        <span>različitih rundi</span>
      </div>
      <div>
        <b>30</b>
        <span>prilika da zablistaš</span>
      </div>
      <div>
        <b>04</b>
        <span>oblasti bira ekipa</span>
      </div>
      <div>
        <b>01</b>
        <span>mjesto na vrhu</span>
      </div>
    </section>
    <section className="home-rounds">
      <div className="home-section-heading">
        <div>
          <span className="home-eyebrow">
            JEDNA PARTIJA. CIJELI SPEKTAR ZNANJA.
          </span>
          <h2>Rutina? Ne igra kod nas.</h2>
        </div>
        <Link to="/arena">Uđi u arenu ↗</Link>
      </div>
      <div className="home-round-cards">
        <article className="home-round-card kaladont">
          <span>01 / ZAGRIJAVANJE</span>
          <div className="round-art">
            A<span>→</span>B
          </div>
          <h3>Kaladont znanja</h3>
          <p>
            Posljednje slovo odgovora postaje prvo slovo sljedećeg. Pet pitanja,
            jedan povezan lanac.
          </p>
          <small>OPŠTE ZNANJE · 5 PITANJA</small>
        </article>
        <article className="home-round-card choice">
          <span>02—05 / VAŠ TEREN</span>
          <div className="round-art">
            ◈ <span>✳</span> ◎
          </div>
          <h3>Ekipa bira pravila</h3>
          <p>
            Sport, film, nauka ili nešto četvrto? Glasajte i igrajte četiri
            oblasti sa najviše glasova.
          </p>
          <small>4 OBLASTI · 20 PITANJA</small>
        </article>
        <article className="home-round-card music">
          <span>06 / VELIKO FINALE</span>
          <div className="music-art">
            {[20, 42, 30, 65, 45, 78, 52, 28, 55, 35, 65, 25].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </div>
          <h3>Znaš je na prvu.</h3>
          <p>
            Nekoliko sekundi domaćeg hita. Nema ponuđenih odgovora. Samo ti,
            melodija i naslov pjesme.
          </p>
          <small>DOMAĆA MUZIKA · 5 PJESAMA</small>
        </article>
      </div>
    </section>
    <section className="home-how">
      <div>
        <span className="home-eyebrow">OD DOGOVORA DO PRVOG PITANJA</span>
        <h2>
          Manje pripreme.
          <br />
          Više igre.
        </h2>
        <p>Arena sama bira pet domaćih hitova. Vi samo okupite ekipu.</p>
      </div>
      <ol>
        <li>
          <b>01</b>
          <div>
            <h3>Otvori sobu</h3>
            <p>Izaberi nadimak i tempo. Registracija nije potrebna.</p>
          </div>
        </li>
        <li>
          <b>02</b>
          <div>
            <h3>Pošalji PIN ekipi</h3>
            <p>Podijeli pozivnicu ili QR kod. Svako igra sa svog uređaja.</p>
          </div>
        </li>
        <li>
          <b>03</b>
          <div>
            <h3>Izaberite oblasti. Krenite.</h3>
            <p>Unosite odgovore, skupljajte poene i osvojite podijum.</p>
          </div>
        </li>
      </ol>
    </section>
    <section className="home-final-cta">
      <span>EKIPA JE SPREMNA?</span>
      <h2>
        Neko mora biti prvi.
        <br />
        Zašto ne ti?
      </h2>
      <Link className="hero-primary" to="/arena">
        Napravi svoju partiju ↗
      </Link>
    </section>
    <footer className="home-footer">
      <strong>
        Skočko<span> / ARENA</span>
      </strong>
      <span>DOBRO DRUŠTVO. DOBRA PITANJA.</span>
      <Link to="/arena">Arena uživo ↗</Link>
    </footer>
  </main>
);
export default Home;


