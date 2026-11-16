# Skočko Arena

Aktuelni multiplayer kviz za računar i telefon: PIN/QR ulazak, glasanje za najmanje dve oblasti, Kaladont, mapa sveta i muzičko finale. Baza sadrži 2.250 tekstualnih pitanja u devet oblasti (uključujući Igrice), 50 lokacija za mapu i muzički katalog. Sve potvrđene oblasti ulaze u partiju, a mapa ide pre muzike.

## Pokretanje

Na ovom računaru koristi desktop aplikaciju **Skocko**. Za ponovno pravljenje prečice pokreni `install-desktop-app.ps1` ili `Vrati precicu.cmd`. Pokretač proverava SQL Express, ažurira build po potrebi, pokreće server i priprema internet pozivnicu. Telefon otvara najnoviji QR/link iz sobe. Za LAN igru oba uređaja koriste istu Wi-Fi mrežu. Za internet igru računar ostaje uključen; privremena HTTPS adresa može se promeniti.

Potrebni su .NET 8 SDK, Node.js 20+ i SQL Server sa konekcijom `ConnectionStrings:DefaultConnection` u `BE/appsettings.json`.

```powershell
.\open-arena.ps1 -AppWindow
# Samo lokalna mreža:
.\open-arena.ps1 -AppWindow -LocalOnly
```

Direktna igra telefonima bez servera dostupna je kroz **Napolju bez interneta / samo telefoni**. Paket pitanja i muzike sačuvaj unapred. Detalji: [aplikacija i povezivanje](docs/APP.md).

## Razvoj i provere

Za razvoj: `dotnet run --launch-profile http` iz `BE`, pa `npm ci` i `npm start` iz `FE`.

```powershell
dotnet build BE/BE.csproj
dotnet run --project tests/ArenaChecks
dotnet run --project tests/MapChecks
dotnet run --project tests/ConnectionChecks
python scripts/check-question-bank.py
cd FE
npm test -- --watchAll=false --runInBand
npm run build
```

Browser test `tests/phone-join-browser.mjs` koristi pokrenut server i Edge; `ARENA_TEST_URL` bira LAN ili aktuelnu internet adresu.

U projektu ostaju samo sadašnji početni ekran, Arena i offline igra. Stare stranice naloga, administracije i ranijeg kviza, njihovi API-ji i zavisnosti su uklonjeni. Nepostojeće frontend adrese vode na početni ekran. SQL modeli i migracije čuvaju istoriju postojeće baze; stari podaci se ne brišu i nisu dostupni kroz API. `BE/arena-data/`, buildovi i lokalni alati nisu deo Gita.

Izvori pitanja: [QUESTION_SOURCES.md](docs/QUESTION_SOURCES.md).
