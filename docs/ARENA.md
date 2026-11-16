# PUGS Arena

## Pokretanje na računaru i telefonu

Potreban je .NET 8 SDK i Node.js/npm. Iz korijena repozitorijuma:

```powershell
.\start-arena.ps1
```

Skripta pravi frontend build i pokreće .NET na portu 5087. Otvori `http://localhost:5087/arena`. Za telefon koristi istu Wi-Fi mrežu i adresu `http://IP-RACUNARA:5087/arena` (IPv4 računara vidiš komandom `ipconfig`). Ako firewall blokira konekciju, dozvoli aplikaciju na privatnoj mreži. Otvori sobu preko LAN adrese i na računaru da QR kod/pozivnica sadrže adresu dostupnu telefonu. `localhost` na telefonu predstavlja telefon.

Ako je port zauzet, koristi `.\start-arena.ps1 -Port 5099` i adresu sa tim portom. Skripta ne zaustavlja druge pokrenute aplikacije.

Arena koristi SQL Server `QuizAppDB` za muzički katalog. Postojeći nalozi, klasični kvizovi i stari SignalR režim i dalje zahtijevaju SQL Server konfigurisan u `BE/appsettings.json` i `dotnet ef database update`.

Za razvoj pokreni `dotnet run --launch-profile http` iz `BE`, a `npm start` iz `FE`. Frontend proxy šalje API pozive na port 5087. `REACT_APP_API_URL` je prazan za isti origin; postavi ga samo ako koristiš zaseban API host i podesi CORS za taj frontend. Automatsko pokretanje React servera iz .NET-a sada je opciono preko `StartReactDevServer=true`.

## Pravila

- Soba ima domaćina i do 31 igrača. Domaćin vodi igru van konkurencije.
- Gost upisuje nadimak i šestocifreni PIN, bez registracije. QR kod je lokalno generisan.
- Svi, uključujući domaćina, biraju četiri od osam oblasti. Četiri najpopularnije ulaze u partiju; izjednačene glasove rješava slučajni žrijeb.
- Prva runda: pet pitanja opšteg znanja u nasumično odabranom, unaprijed provjerenom lancu. Posljednje slovo tačnog odgovora je prvo slovo sljedećeg. Lanac prati tačne odgovore, čak i ako igrači pogriješe.
- Runde 2–5: po pet pitanja iz izabranih oblasti, nasumičnim redoslijedom.
- Runda 6: pet domaćih hitova aplikacija automatski bira iz SQL Server baze. Ne dodaješ fajlove. Start bira pet različitih naslova direktno iz baze i prvenstveno pet različitih žanrova. Izvorni preview link se osvježava tek tokom reprodukcije.
- Koriste se originalni izvođači i zvanični preview isečci, uz internet vezu. UI zaustavlja slušanje na zajedničkoj granici od osam sekundi; zbog browser pravila igrač klikne „Pusti isečak”. Kasniji klik nastavlja od proteklog dijela zajedničkog prozora.
- Tajmer je 10, 15 ili 20 sekundi za odgovor, uključujući vrijeme slušanja. Zatim slijedi pet sekundi za tačan odgovor i rezultat.
- Tačan odgovor donosi 100 poena i do 50 za brzinu, prema serverskom vremenu. Provjera ignoriše velika slova, razmake, interpunkciju i dijakritike; podržava eksplicitno navedene alternative, bez neodređene procjene sličnosti.
- Zaključan odgovor ne može se ponovo slati. Prije otkrivanja ne šalju se tačni odgovori ni novi rezultati protivnicima.

## Oporavak i ograničenja

Sesija igrača se čuva u tabu i na uređaju (`sessionStorage` i `localStorage`): osvježavanje ili ponovno otvaranje na istom origin-u vraća igrača u sobu dok je server čuva. „Napusti prikaz” briše lokalnu aktivnu sesiju, ali ne uklanja učesnika iz sobe. Za instalaciju i lokalnu/internet igru pogledaj [APP.md](APP.md).

Backend čuva stanje i tokene u ignorisanom folderu `BE/arena-data`; muzički katalog je u SQL Server tabeli `QuizAppDB.dbo.MusicTracks`. Ne izlaži taj folder kroz statički server i ne commituj ga. Restart procesa zadržava partije mlađe od tri sata, uz nastavak po stvarnom satu (partija nije pauzirana dok server ne radi). Sačuvano stanje je namijenjeno jednom server procesu sa trajnim diskom. Više instanci zahtijeva zajedničku bazu/Redis i koordinaciju. Stari audio fajlovi se ne brišu automatski.

Sinhronizacija nove arene koristi HTTP polling na približno 900 ms. Postojeći SignalR režim ostaje odvojen. Moguće je odstupanje prikaza tajmera zbog mrežne latencije; server odlučuje prihvata li odgovor. Uploadovani fajl može se preuzeti tokom aktivnog pitanja, pa ograničenje slušanja u UI nije zaštita od zlonamjernog klijenta. Ovo je osnova za privatne partije, ne završena javna produkciona infrastruktura.

Biblioteka je početna: tri Kaladont lanca i osam oblasti sa po pet pitanja. Za veću raznovrsnost proširi `BE/Arena/QuestionBank.cs`. Muzički katalog sadrži provjerene unose narodne, kafanske, pop-folk, pop/rock, rep i moderne muzike. Tačan broj i raspodjelu prikazuje `/api/arena/music/status`. U `QuizAppDB.dbo.MusicTracks` čuvaju se ID pjesme, naslov, izvođač, prihvatljivi odgovori i izvor. Snimci nisu sačuvani u bazi: server dobavlja aktuelni preview tokom pitanja i vraća ga bez trajnog keširanja. Posle otkrivanja odgovora prikazuje se link na Deezer.

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

## Automatska muzička biblioteka

`BE/Arena/Data/music-seed.json` je verzionisani početni katalog. Baza Tabela `dbo.MusicTracks` u postojećoj bazi `QuizAppDB` se kreira i puni automatski pri startu backenda; ponovni start ne duplira pjesme. Koristi se postojeći `ConnectionStrings:DefaultConnection`. U SSMS proširi QuizAppDB → Tables → dbo.MusicTracks (Refresh ako ne vidiš tabelu). `Arena:DataPath` mijenja samo lokaciju sačuvanih soba.

`scripts/seed-music.mjs` obnavlja početni katalog pretragom originalnih izvođača i provjerom dostupnosti preview snimaka. Pokreće se iz korijena (`node scripts/seed-music.mjs`) uz internet. Ne preuzima kompletne pjesme, ne čuva potpisane privremene audio URL-ove i filtrira karaoke, tribute, instrumental, live i remix rezultate. Lista nije zamjena za dozvolu za javno/komercijalno emitovanje; integracija je namijenjena privatnim partijama. Izvor i uslovi: https://cdn-content.dzcdn.net/pdf/CGU-developers.pdf.

Provjera nove putanje bez uploada: na razvojnom serveru pokreni `node tests/music-library-http.mjs`. Ovo pravi probnu sobu i zahtijeva dostupnost muzičkog servisa. Nije test za produkcioni server.
### Prošireni SQL katalog

Trenutni početni katalog: 813 pjesama i 84 izvođača. Narodna 120, kafanska 120, pop-folk 120, pop/rock 170, rep 118 i moderna 165. Broj se može provjeriti kroz `GET /api/arena/music/status` ili u SSMS:

```sql
USE QuizAppDB;
SELECT Genre, COUNT(*) AS Songs FROM dbo.MusicTracks GROUP BY Genre;
SELECT Title, Artist, Genre, SourceUrl FROM dbo.MusicTracks ORDER BY Genre, Artist, Title;
```

U bazi su trajno pripremljeni naslovi, izvođači, žanrovi, ID-jevi izvornog kataloga i prihvatljivi odgovori. Pokretanje partije bira pet naslova direktno iz SQL-a bez HTTP poziva muzičkom servisu. Audio je i dalje originalni streaming preview, dostupan uz internet, a ne kompletan snimak pohranjen u SQL-u.
## Poredak uživo

Desna bočna lista (na telefonu ispod pitanja) osvježava se postojećim pollingom približno svakih 900 ms. Prikazuje poziciju, ukupne poene, pomak od prethodnog pitanja, dobitak na pitanju, broj poslatih odgovora, vrijeme slanja i prosjek vremena. Izjednačeni poeni dijele rang. Domaćin je van konkurencije i ne ulazi u brojač odgovora.

Domaćin i igrač koji je zaključao odgovor odmah vide tekuće poene. Igrač koji još piše vidi prethodne poene i status/vrijeme slanja protivnika, a trenutne poene dobija tek kada zaključa odgovor ili vrijeme istekne. Oznaka najbržeg odnosi se na najbrže slanje, bez obzira na tačnost. Vrijeme mjeri server i čuva se sa partijom. Za stare odgovore sačuvane prije ove izmjene vrijeme nije dostupno.

## Proglašenje i pobjednički soundtrack

Završetak prikazuje krunu, animirani podijum, konfete i svjetlosne zrake. Pobjednici su svi igrači sa najvećim brojem poena; izjednačenje se prikazuje kao zajednička pobjeda. Efekti poštuju sistemsku postavku smanjenih animacija.

Server bira muzičko pitanje koje je pobjednik najbrže tačno odgovorio, prema sačuvanom serverskom vremenu. Kod više pobjednika bira se najbrži takav pogodak među njima. Pogrešni odgovori, protivnički pogoci i odgovori bez zabilježenog vremena se ne koriste. Ako nema odgovarajućeg pogotka, finale prikazuje slavlje bez soundtracka.

Zvanični preview izabrane pjesme pokušava da se pusti automatski, jednom, uz početnu jačinu od 35%. Browser može zahtijevati klik na „Pusti slavlje”. Dostupni su pauza, ponavljanje i jačina zvuka. Izlazak iz završnog prikaza zaustavlja zvuk. Zaštićeni `victory-audio` endpoint dostupan je samo učesnicima završene partije; prije kraja ne otkriva pjesmu. Potrebna je internet veza i dostupan preview kod muzičkog servisa.

### Automatski zvuk i izbor slavljeničkog dijela

AudioContext se priprema tokom prvog normalnog dodira/klika ili pritiska tipke u Areni. Završnica koristi isti kontekst, pa u redovnoj partiji ne zahtijeva dodatni klik za zvuk. Browser pravila se ne mijenjaju niti zaobilaze: direktno otvaranje završnice bez ranijeg dodira, povratak iz pozadine ili izričita zabrana zvuka i dalje mogu zahtijevati dodir na „Pusti slavlje”. Mehanizam prati preporuku za igre: https://developer.chrome.com/blog/web-audio-autoplay.

Do pet preview isečaka koji su već učitani tokom muzičkih pitanja privremeno se drži samo u RAM-u, vezano za sobu i sesiju. Pobjednička pjesma se zato obično ne preuzima ponovo. Izlazak iz partije briše ove podatke; nema trajnog niti PWA keširanja audio snimaka.

Iz dostupnog preview-a bira se do 18 sekundi kontinuirano energičnog zvuka, uz kratko poravnanje početka na jači ulaz fraze i postepeno pojačavanje/stišavanje. Analiza koristi amplitudu i kontinuitet energije, bez semantičkog prepoznavanja refrena; ne garantuje refren niti pristup punoj pjesmi. Kratak preview svira u svojoj raspoloživoj dužini. Pauza, nastavak, ponavljanje i jačina zvuka ostaju dostupni.

Provjere: `npm test -- --watchAll=false --runInBand` u FE; `node tests/victory-autoplay-browser.mjs` iz korijena za stvarni Edge s pravilom `document-user-activation-required`. Browser provjera pokreće svoj razvojni backend na portu 5108 s izolovanim podacima u `.qa`, koristi stvarni preview i ne mijenja aktivne sobe. Potrebni su .NET, lokalni SQL Server, internet, izgrađeni frontend i instaliran Edge.
