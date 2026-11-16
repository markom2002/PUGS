# Aplikacija na telefonu i laptopu

Live Quiz Arena je instalabilna web aplikacija (PWA). Nije APK/EXE paket i ne zahtijeva App Store. Chrome/Edge mogu ponuditi instalaciju, a iPhone koristi Safari → Podijeli → Dodaj na početni ekran. Puna instalacija zahtijeva HTTPS, osim lokalnog razvoja na localhost-u. Izvor: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable.

## Ista Wi-Fi mreža

```powershell
.\start-arena.ps1
```

Otvori LAN adresu računara na telefonu (`http://IP-RACUNARA:5087`). Pozivnica u čekaonici sama dobija LAN adresu umjesto localhost-a. Na običnom LAN HTTP linku možeš igrati u browseru, ali instalacija/service worker nisu garantovani.

## Društvo preko interneta

Pokreni backend i frontend build u režimu za javnu Arenu:

```powershell
.\start-arena.ps1 -Public
```

U drugom PowerShell terminalu iz istog foldera:

```powershell
.\start-internet.ps1
```

Skripta preuzima zvanični Cloudflare helper ako nedostaje i ispisuje HTTPS adresu. Otvori tu adresu na laptopu i telefonu, pa instaliraj aplikaciju i napravi sobu. QR/pozivnica mogu se prebaciti između iste Wi-Fi mreže i interneta. Ne šalji localhost adresu prijateljima.

Privremeni link radi dok su računar, SQL Server, backend i tunnel uključeni. Može se promijeniti poslije gašenja/ponovnog pokretanja i nije trajni hosting. Quick Tunnels su namijenjeni probama; za stalnu adresu koristi named Cloudflare Tunnel s vlastitim domenom ili .NET/SQL hosting. Izvor: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.

Gašenje samo internet pristupa:

```powershell
.\stop-internet.ps1
```

Lokalni server nastavlja raditi. Za stalni HTTPS hosting postavi `Arena:PublicUrl` na javni origin, a `ConnectionStrings:DefaultConnection` na dostupnu SQL bazu. Ne pokreći više backend procesa nad istim `arena-data/rooms.json`; svi uređaji moraju koristiti isti server instance.

## Ponašanje aplikacije

- Manifest ima stabilan ID, PNG ikonice 192/512, iPhone ikonicu i prečice za pravljenje/pridruživanje partiji.
- Service worker se generiše uz production build. Kešira samo verzionisani interfejs i ikonice; API, poeni, tokeni i muzika se ne keširaju.
- Bez interneta aplikacija može otvoriti ranije preuzet interfejs, ali partija i muzika zahtijevaju dostupan server. Nema offline slanja odgovora.
- Nova verzija ne prekida partiju automatskim reloadom: prikazuje se obavještenje i korisnik bira osvježavanje.
- Sesija se pamti samo u tabu za oporavak istog aktivnog meča. Nova pozivnica i završetak meča brišu staru prijavu; za svaki novi meč igrači ponovo unose nadimak i PIN. Prijave se više ne pamte kroz localStorage. HTTPS i LAN origin imaju zasebno spremište.
- U javnom režimu (`Arena:PublicMode=true`) dostupni su Arena API i interfejs. Raniji administratorski API, Swagger, stari SignalR i upload su blokirani. Kreiranje i ulazak imaju ograničenje pokušaja po IP adresi.

Stare stranice naloga, administracije i klasicnih kvizova, njihovi API-ji i AutoMapper zavisnosti su uklonjeni. Postojeca SQL istorija i sacuvane partije ostaju.

## Ponovno pokretanje i zakljucan BE.exe

Ako je Arena vec pokrenuta, `start-arena.ps1` ispisuje postojece linkove bez novog builda. Za obnovu aplikacije koristi `.\start-arena.ps1 -Restart`, odnosno `.\start-arena.ps1 -Public -Restart` za internet. Restart prekida aktivne veze. Skripta zaustavlja samo backend iz ovog foldera. Nemoj paralelno pokretati `dotnet run` ili `dotnet ef database update` dok isti backend radi: Windows zakljucava njegov BE.exe i build prijavljuje MSB3027/MSB3021.

## Pokretanje jednim klikom

Dvoklik na Desktop aplikaciju `Live Quiz Arena` proverava SQL Express, pravi noviji FE/BE build po potrebi, pokrece server i automatski priprema proverenu internet pozivnicu. Desktop otvara http://localhost:5087/. Telefon koristi QR/link iz sobe. Logovi su u .qa/launcher-*.log.

Ako Desktop precica nedostaje, dvoklik na `Vrati precicu.cmd` u folderu projekta ponovo je pravi na stvarnom Windows Desktopu. Zatvaranje browsera ne zaustavlja backend pokrenut launcherom. Poslije gasenja ili restarta racunara ponovo klikni `Live Quiz Arena`.


Pokretac ispisuje status dok ceka server (do 180 sekundi). Ponovni klik otvara vec dostupnu aplikaciju i kada prethodno pokretanje jos traje. Greske ostaju vidljive u prozoru; nema modalnog dijaloga koji drzi zakljucavanje.

Pokretac sada automatski priprema i HTTPS tunel i otvara HTTPS aplikaciju za instalaciju. LAN instalacioni dijalog nudi prelazak na aktivni HTTPS link. Na Androidu koristi Chrome meni / Instaliraj; na iPhone-u Safari / Podijeli / Dodaj na pocetni ekran. HTTPS adresa je privremena i nakon promjene tunela instalirana aplikacija moze traziti ponovno dodavanje s novog linka. Za trajnu instalaciju potreban je stabilan HTTPS domen.

Muzicko pitanje samo pokrece zvuk koristeci audio kontekst otkljucan pri ulasku/glasovima. Snimak prati serverovo vrijeme i staje pola sekunde prije kraja pitanja, uz kratak fade. Povratak na pitanje ne resetuje snimak. Ako browser zahtijeva novi dodir nakon otvaranja ili povratka iz pozadine, postoji dugme Ukljuci zvuk. Kaladont vise ne salje niti prikazuje pocetno slovo odgovora.

Aplikacija i Desktop pokretac sada otvaraju pocetnu stranicu. Admin u cekaonici iznad Rundi 02?05 bira Samo vodim partiju ili Igram sa ekipom. Samo takmicari glasaju i odgovaraju. Admin igrac nema privilegovan uvid u trenutnu tacnost protivnika, ulazi u bodovanje i moze pobijediti. Uloga se zakljucava pri startu. Promjena uloge brise adminove ranije glasove.

## Lokalna igra bez interneta i desktop prozor

`install-desktop-app.ps1` pravi Desktop precicu Live Quiz Arena: launcher pali lokalni server i otvara poseban Edge app prozor bez kartica. To je desktop web aplikacija, ne samostalni nativni EXE paket. Native PWA instalacija je i dalje dostupna kroz Instaliraj na HTTPS adresi.

Prije izlaska pripremi muziku uz `node scripts/prepare-offline-music.mjs`. Lokalni previewi ostaju u ignorisanom BE/arena-data/audio-cache; ne salju se na GitHub. Za offline sobu ukljuci Lokalna igra bez interneta. Izbor pjesama se tada ogranicava na pripremljene snimke. Laptop i njegov SQL Server moraju ostati ukljuceni; povezi telefone i laptop na isti Wi-Fi ili hotspot. Koristi LAN pozivnicu, ne internet adresu instalirane PWA. Internet nije potreban za pitanja, bodove ni pripremljenu muziku. Telefon sam bez laptop/servera ne moze hostovati ovu verziju. Ako hotspot ne dozvoljava medjusobnu komunikaciju klijenata, koristi drugu lokalnu mrezu.

Banka sadrzi 2210 pitanja u JSON datoteci, uz 40 osnovnih pitanja u QuestionBank.cs: ukupno 2250, odnosno po 250 u svakoj od devet tekstualnih oblasti. Osam ranijih oblasti u JSON-u imaju po 245 pitanja, a Igrice svih 250. Svaka oblast ukupno ima po 50 pitanja na svakom od pet nivoa tezine. Uklonjene su stare serije istih sablona. Podteme ukljucuju geografiju, nauku, istoriju, umjetnost, film, tehnologiju, prirodu i sport. Igrice obuhvataju Nintendo i arkadne klasike, PC i mobilne igre, konzole, strategije, RPG, MOBA, platformske, trkacke, borilacke, sportske, kooperativne i indie igre, likove, svetove i mehanike. Istrazeni kvizovi i izvori za odabrane provere odgovora navedeni su u [QUESTION_SOURCES.md](QUESTION_SOURCES.md).

Oblasti se biraju u cekaonici: svaki takmicar potvrdjuje najmanje dve, a moze izabrati i sve ponudjene. U partiju ulaze sve oblasti koje je potvrdio bar jedan takmicar; oblasti sa vise glasova idu ranije, dok Pronađi na mapi ide neposredno pre muzickog finala. Ne dodaju se neizabrane oblasti. Svaka izabrana oblast ima pet pitanja, uz obavezni Kaladont i pet pesama. Ukupno je `10 + 5 × broj izabranih oblasti` pitanja: minimum 20, a uz svih deset oblasti 60. Voditelj van konkurencije ne glasa; za izbor ukljucuje Igram sa ekipom.

Unutar odgovarajuce tezine izbor daje prednost novoj podtemi, zatim odgovoru koji nije vec koriscen u toj rundi, pa najmanje koriscenim pitanjima. Ista pravila raznovrsnosti vaze u direktnoj offline igri; stari paketi bez podtema i dalje rade, ali domacin treba ponovo da izabere Sacuvaj pitanja i muziku za novu bazu. Upotreba pitanja pamti se na serveru i sastavljaju se novi Kaladont lanci; ogranicena banka se poslije iscrpljivanja ponavlja. Nema tvrdnje da su pitanja prepisana iz TV emisija.

Provera podataka: `python scripts/check-question-bank.py`. Opcija `--review-shared-answers` izdvaja pitanja sa zajednickim prihvacenim odgovorima radi urednickog pregleda; zajednicki odgovor sam po sebi ne znaci isti podatak. Funkcionalne provere: `dotnet run --project tests/ArenaChecks/ArenaChecks.csproj` i frontend test `questionSelection.test.ts`.

Provereni izvori za odabrana specijalisticka pitanja: [Library of Congress navodi Nizinskog kao koreografa Posvecenja proleca iz 1913](https://www.loc.gov/collections/bronislava-nijinska/articles-and-essays/le-sacre-du-printemps/); [MoMA opisuje Brankusijev Beskrajni stub](https://press.moma.org/wp-content/uploads/2018/10/brancusi_object_labels_for_press_final.pdf); [National Park Service opisuje let brace Rajt iz 1903](https://www.nps.gov/articles/wright-brothers.htm). Ovi izvori proveravaju navedene cinjenice, a nisu poreklo teksta cele baze.

Muzika traje dodatnih pet sekundi (10/15/20 postaje 15/20/25). Puni naslov zadrzava 100 osnovnih poena i bonus za brzinu; samo tacan izvodjac donosi 50 bez bonusa. Djelimican pogodak ne ulazi u izbor pobjednicke pjesme. Audio preskace tihi uvod i ponavlja kraci isjecak do kraja serverovog tajmera.

Za pripremu bez komandi koristi dvoklik na Pripremi offline.cmd u folderu projekta dok si na internetu. Trenutno je lokalno pripremljeno 48 originalnih preview snimaka.

## Direktna igra samo sa telefonima

Ako telefon prijavi gresku veze pri pridruzivanju, otvori najnoviju pozivnicu ili skeniraj QR kod iz cekaonice na racunaru. Desktop aplikacija sada automatski priprema internet vezu i proverava da HTTPS adresa vodi do ovog servera. Stari link ili instalirana telefonska precica mogu upucivati na isteklu privremenu adresu; tada treba otvoriti novu pozivnicu. Za lokalnu igru koristi prikazanu Wi-Fi adresu i istu mrezu, nikad localhost sa telefona. Racunar i server ostaju ukljuceni tokom internet/LAN partije. [Cloudflare privremene adrese](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) nemaju garanciju stalne dostupnosti.

Provera povezivanja: `dotnet run --project tests/ConnectionChecks`, frontend testovi `arenaApi.test.ts` i `inviteAddress.test.ts`, zatim `node tests/phone-join-browser.mjs` uz pokrenut desktop server. `ARENA_TEST_URL` bira LAN ili trenutnu HTTPS adresu. Browser test otvara mobilni prikaz, ulazi sa nadimkom, proverava istu adresu za API, spisak oblasti i uklanja svoju probnu sobu.

Otvorite /offline (dugme Napolju na pocetnoj). Dok ste na internetu, domacin koristi Sacuvaj pitanja i muziku; paket ostaje u IndexedDB na tom telefonu. Svi ranije instaliraju aplikaciju i otvore /offline da provjere da je verzija spremna. Za igru bez interneta ukljucite zajednicki hotspot/Wi-Fi bez izolacije klijenata. Nisu potrebni laptop, SQL ili javni server tokom partije.

Domacin pravi QR za pojedinog gosta. Gost skenira ponudu i pokaze povratni QR; domacin skenira taj odgovor. SDP se razmjenjuje rucno, kompresovano; WebRTC koristi samo lokalne ICE kandidate (bez STUN/TURN servera). Nakon povezivanja i nadimaka, svako potvrdjuje najmanje dve oblasti iz istog spiska, ukljucujuci Igrice i mapu ako su u sacuvanom paketu. Muzika se prenosi direktno gostima i potvrda prijema je uslov za start. Domacin vodi sat, odgovore, poene i zavrsetak partije. Oba ekrana prikazuju istu partiju. Zadrzite aplikaciju domacina u prvom planu; prekid ili zatvaranje domacina prekida partiju. Ovaj rezim ne migrira domacina niti automatski obnavlja izgubljene veze.

Ako kamera nije dostupna, kodovi se mogu prenijeti rucno iz polja Tvoj kod za povezivanje. Maksimalno osam telefona. Na nekim hotspotima i browserima direktna WebRTC veza nece uspjeti zbog ogranicenja mreze; aplikacija prikazuje gresku, tada koristite drugu lokalnu mrezu ili internet Arenu. Offline PWA i kamera zahtijevaju prethodno instaliranu HTTPS verziju; obican LAN HTTP nije dovoljan na telefonima.

Pitanja u rundama 2-5 imaju urednicke nivoe 1-5. Svaka runda bira po jedno pitanje blisko svakom nivou, bez duplikata, i sortira ih rastuce. Razlicite podteme i odgovori imaju prednost unutar istog nivoa; ako nema alternative, podtema moze da se ponovi. Rotacija najmanje koriscenih pitanja vazi medju podjednako raznovrsnim kandidatima. Kaladont zadrzava slovnu vezu.

## Pronađi na mapi

**Pronađi na mapi** je kartica u spisku oblasti u čekaonici, zajedno sa ostalim oblastima. Nema posebnog prekidača na formi za kreiranje sobe. Ulazi u partiju kada je neko od takmičara izabere i računa se u minimum od dve oblasti. Izbor samo Igrice + Pronađi na mapi daje četiri runde i 20 pitanja: Kaladont, Igrice, mapa i muzičko finale. Stari API parametar `mapEnabled` zadržan je samo radi kompatibilnosti ranijih klijenata.

Igrač dodirne mapu, po potrebi je uveća i pomeri, pa potvrdi lokaciju. Svako mapiranje traje 30 sekundi bez bonusa za brzinu. Server računa udaljenost po velikom krugu (haversine), validira koordinate i zaključava prvi odgovor. Do 50 km donosi 150 poena, do 200 km 130, do 500 km 100, do 1.000 km 70, do 2.000 km 40, do 4.000 km 10, a veća udaljenost 0. Kao potpuno tačno računa se rastojanje do 50 km.

Dok tajmer traje, igrač vidi samo sopstvenu oznaku. Tačna lokacija, tuđe oznake i udaljenosti otkrivaju se zajedno u fazi odgovora; ni voditelj nema raniji pristup koordinatama preko stanja sobe. Odgovori opstaju nakon restarta servera. Muzičko finale zadržava dosadašnje bodovanje i izbor pobedničke pesme i kada je pomereno na sedmu rundu.

Baza za mapu ima 50 lokacija, po deset na svakom nivou težine. Odvojena je od 2.250 tekstualnih pitanja. Vektorski obrisi kopna iz Natural Earth-a nalaze se u aplikaciji, bez spoljnih pločica ili servisa. Direktna igra telefona koristi isti princip i bodovanje; gostima se koordinate cilja i tuđe oznake ne šalju pre otkrivanja. Za nove oblasti u ranije sačuvanom offline paketu ponovo izaberi **Sačuvaj pitanja i muziku**. Stari paketi koriste samo oblasti koje zaista sadrže.

Provere: `dotnet run --project tests/MapChecks/MapChecks.csproj`, frontend testovi `mapRound.test.ts` i `MapQuestion.test.tsx`. Za mobilnu proveru pokreni `dotnet run --project tests/MapChecks/MapChecks.csproj -- --serve`, zatim `node tests/map-round-browser.mjs`. Direktna provera telefona: postavi `ARENA_TEST_URL` na test server i `TEST_MAP_ROUND=1`, pa pokreni `node tests/phone-offline-browser.mjs`. Test server sluša isključivo na loopback adresi i ne ulazi u produkcijski backend.

Automatski test tests/phone-offline-browser.mjs proverava dva browser klijenta: uparivanje, glasanje, potvrdu prenosa muzike, svih 30 pitanja (35 uz TEST_MAP_ROUND=1), bodove gosta i pobjednika dok su HTTP/HTTPS zahtjevi blokirani. Sa mapom proverava i postavljanje oznake, zaključavanje, skrivanje cilja do otkrivanja i poene za preciznost. Ovaj test nije zamjena za fizicku probu kombinacije Android/iPhone i konkretnog hotspota.

Azurirano muzicko bodovanje: izvodjac ili prepoznatljiv dio naslova donose 50 poena bez bonusa; potpuno tacan naslov donosi 50 plus do 50 za brzinu. Dio naslova zahtijeva najmanje dvije uzastopne rijeci, najmanje sest normalizovanih znakova i bar polovinu rijeci prihvacenog naslova. Obicna opsta pitanja ostaju 100 plus bonus. Stare standalone precice na /arena bez PIN-a prebacuju se na homepage; eksplicitne pozivnice sa PIN-om se cuvaju.
