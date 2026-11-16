# PUGS Arena

## Pokretanje na računaru i telefonu

Potreban je .NET 8 SDK i Node.js/npm. Iz korijena repozitorijuma:

```powershell
.\start-arena.ps1
```

Skripta pravi frontend build i pokreće .NET na portu 5087. Otvori `http://localhost:5087/arena`. Za telefon koristi istu Wi-Fi mrežu i adresu `http://IP-RACUNARA:5087/arena` (IPv4 računara vidiš komandom `ipconfig`). Ako firewall blokira konekciju, dozvoli aplikaciju na privatnoj mreži. Otvori sobu preko LAN adrese i na računaru da QR kod/pozivnica sadrže adresu dostupnu telefonu. `localhost` na telefonu predstavlja telefon.

Ako je port zauzet, koristi `.\start-arena.ps1 -Port 5099` i adresu sa tim portom. Skripta ne zaustavlja druge pokrenute aplikacije.

Arena radi bez SQL Servera. Postojeći nalozi, klasični kvizovi i stari SignalR režim i dalje zahtijevaju SQL Server konfigurisan u `BE/appsettings.json` i `dotnet ef database update`.

Za razvoj pokreni `dotnet run --launch-profile http` iz `BE`, a `npm start` iz `FE`. Frontend proxy šalje API pozive na port 5087. `REACT_APP_API_URL` je prazan za isti origin; postavi ga samo ako koristiš zaseban API host i podesi CORS za taj frontend. Automatsko pokretanje React servera iz .NET-a sada je opciono preko `StartReactDevServer=true`.

## Pravila

- Soba ima domaćina i do 31 igrača. Domaćin zna muzičke odgovore i vodi igru van konkurencije.
- Gost upisuje nadimak i šestocifreni PIN, bez registracije. QR kod je lokalno generisan.
- Svi, uključujući domaćina, biraju četiri od osam oblasti. Četiri najpopularnije ulaze u partiju; izjednačene glasove rješava slučajni žrijeb.
- Prva runda: pet pitanja opšteg znanja u nasumično odabranom, unaprijed provjerenom lancu. Posljednje slovo tačnog odgovora je prvo slovo sljedećeg. Lanac prati tačne odgovore, čak i ako igrači pogriješe.
- Runde 2–5: po pet pitanja iz izabranih oblasti, nasumičnim redoslijedom.
- Runda 6: pet domaćih pjesama koje pripremi domaćin. Upload MP3/OGG/WAV/M4A do 8 MB po fajlu. Naziv može imati alternative odvojene znakom `|`.
- Pripremi stvarne isečke do osam sekundi koji počinju od željenog dijela pjesme. Aplikacija ne montira niti provjerava trajanje fajla. UI zaustavlja reprodukciju po isteku zajedničkog osmog sekunda; zbog browser pravila igrač klikne „Pusti isečak”. Kasniji klik nastavlja od proteklog dijela zajedničkog prozora.
- Tajmer je 10, 15 ili 20 sekundi za odgovor, uključujući vrijeme slušanja. Zatim slijedi pet sekundi za tačan odgovor i rezultat.
- Tačan odgovor donosi 100 poena i do 50 za brzinu, prema serverskom vremenu. Provjera ignoriše velika slova, razmake, interpunkciju i dijakritike; podržava eksplicitno navedene alternative, bez neodređene procjene sličnosti.
- Zaključan odgovor ne može se ponovo slati. Prije otkrivanja ne šalju se tačni odgovori ni novi rezultati protivnicima.

## Oporavak i ograničenja

Sesija igrača ostaje u `sessionStorage`: osvježavanje istog taba vraća igrača u istu sobu. Zatvaranje taba može izgubiti token. „Napusti prikaz” izlazi sa ekrana, ali ne uklanja učesnika iz sobe.

Backend čuva stanje, tokene i audio u ignorisanom folderu `BE/arena-data`. Ne izlaži taj folder kroz statički server i ne commituj ga. Restart procesa zadržava partije mlađe od tri sata, uz nastavak po stvarnom satu (partija nije pauzirana dok server ne radi). Sačuvano stanje je namijenjeno jednom server procesu sa trajnim diskom. Više instanci zahtijeva zajedničku bazu/Redis i koordinaciju. Stari audio fajlovi se ne brišu automatski.

Sinhronizacija nove arene koristi HTTP polling na približno 900 ms. Postojeći SignalR režim ostaje odvojen. Moguće je odstupanje prikaza tajmera zbog mrežne latencije; server odlučuje prihvata li odgovor. Uploadovani fajl može se preuzeti tokom aktivnog pitanja, pa ograničenje slušanja u UI nije zaštita od zlonamjernog klijenta. Ovo je osnova za privatne partije, ne završena javna produkciona infrastruktura.

Biblioteka je početna: tri Kaladont lanca i osam oblasti sa po pet pitanja. Za veću raznovrsnost proširi `BE/Arena/QuestionBank.cs`. Domaće pjesme nisu distribuirane uz aplikaciju; pripremi snimke koje smiješ koristiti.

## Provjere

```powershell
dotnet run --project tests/ArenaChecks
dotnet build BE/BE.csproj
cd FE
npm test -- --watchAll=false --runInBand
npm run build
```

Serverski test simulira 30 pitanja, provjerava lance, skrivanje odgovora, ovlašćenja, duple/zakasnjele odgovore i restart između svakog pitanja. Frontend testovi provjeravaju ulazak preko pozivnice, greške pri ulasku i čuvanje sesije.

Za dodatne provjere pokreni zaseban lokalni server na portu 5099, pa `node tests/arena-http.mjs` i `node tests/arena-browser.mjs`. Browser provjera koristi instalirani Edge na Windowsu, provjerava desktop i stvarni viewport širine 390 px i sprema snimke u ignorisani `.qa` folder. `ARENA_TEST_URL` mijenja test adresu, a `EDGE_PATH` putanju browsera. HTTP test pravi probnu sobu sa sintetičkim WAV fajlovima; koristi ga na razvojnom serveru.

## Naredne zasebne cjeline

Timske lige/turniri, AI editor uz provjeru izvora, ponavljanje grešaka, analitika autora i napredni editor sa automatskim čuvanjem još nisu implementirani. Za javno lansiranje slijede rate limiting, veća banka pitanja, upravljanje audio bibliotekom, test stvarnih uređaja i trajna infrastruktura.
