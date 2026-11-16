# Skočko Arena (PUGS)

Multiplayer kviz za računar i telefon: šest rundi, po pet pitanja, PIN/QR ulazak, serverski tajmer i poredak uživo.

- Kaladont opšteg znanja, četiri oblasti po glasanju ekipe i domaće muzičko finale.
- Katalog od 813 pjesama u SQL Server tabeli `QuizAppDB.dbo.MusicTracks`; pet žanrova se bira automatski po partiji.
- Proglašenje pobjednika sa animacijama i soundtrackom njegovog najbržeg tačnog muzičkog pogotka.

## Pokretanje

Potrebni su .NET 8 SDK, Node.js 20+ i SQL Server. U `BE/appsettings.json` podesi `ConnectionStrings:DefaultConnection` za postojeću bazu `QuizAppDB`. Muzička tabela se automatski kreira i puni bez izmjene postojećih podataka.

Iz korijena projekta:

```powershell
.\start-arena.ps1
```

Otvori `http://localhost:5087/arena`. Za drugi port koristi `.\start-arena.ps1 -Port 5099`. Telefon mora biti na istoj mreži; otvori `http://IP-RACUNARA:5087/arena`. Ako dijeliš QR/pozivnicu, i na računaru otvori tu LAN adresu.

Muzički katalog čuva podatke i odgovore. Originalni Deezer preview isečci se dobavljaju preko interneta, pa audio zahtijeva mrežnu vezu i dostupnost izvora.

## Razvoj i provjere

Pokreni `dotnet run --launch-profile http` iz `BE`, a `npm ci` i `npm start` iz `FE`. Frontend na portu 3000 preko proxy-ja koristi backend na portu 5087.

```powershell
dotnet run --project tests/ArenaChecks
dotnet build BE/BE.csproj
cd FE
npm test -- --watchAll=false --runInBand
npm run build
```

`tests/music-library-http.mjs`, `tests/arena-http.mjs` i `tests/arena-browser.mjs` su dodatne provjere za razvojni server; koriste `ARENA_TEST_URL`. HTTP provjere prave probne sobe. Browser provjera koristi lokalno instaliran Edge na Windowsu.

## Fajlovi

- `FE/`: React/TypeScript interfejs.
- `BE/Arena/`: nova Arena, bodovanje, muzička biblioteka i početni katalog.
- `BE/Migrations/`: istorija postojeće SQL baze; ne brisati.
- `BE/arena-data/`: lokalno stanje partija i tokeni; nije u Gitu.
- `scripts/seed-music.mjs`: obnavljanje početnog kataloga pjesama.
- `pugs.ncp`: originalni dijagram modela projekta.

Raniji nalozi, administracija i preostale klasične rute ostaju u projektu. Stranice Kvizovi i Moji rezultati su uklonjene, a njihove stare adrese preusmjeravaju u Arenu.

Detaljna pravila, ograničenja i planirane funkcije: [docs/ARENA.md](docs/ARENA.md).
