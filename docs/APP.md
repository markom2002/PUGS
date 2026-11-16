# Aplikacija na telefonu i laptopu

Skočko je instalabilna web aplikacija (PWA). Nije APK/EXE paket i ne zahtijeva App Store. Chrome/Edge mogu ponuditi instalaciju, a iPhone koristi Safari → Podijeli → Dodaj na početni ekran. Puna instalacija zahtijeva HTTPS, osim lokalnog razvoja na localhost-u. Izvor: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable.

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

Ovo je privatna multiplayer aplikacija za probne partije s društvom, ne završena infrastruktura za javni komercijalni servis. Postojeće AutoMapper/CRA zavisnosti imaju prijavljena upozorenja koja treba zasebno riješiti prije takvog lansiranja.

## Ponovno pokretanje i zakljucan BE.exe

Ako je Arena vec pokrenuta, `start-arena.ps1` ispisuje postojece linkove bez novog builda. Za obnovu aplikacije koristi `.\start-arena.ps1 -Restart`, odnosno `.\start-arena.ps1 -Public -Restart` za internet. Restart prekida aktivne veze. Skripta zaustavlja samo backend iz ovog foldera. Nemoj paralelno pokretati `dotnet run` ili `dotnet ef database update` dok isti backend radi: Windows zakljucava njegov BE.exe i build prijavljuje MSB3027/MSB3021.

## Pokretanje jednim klikom

Dvoklik na Desktop precicu `Pokreni Skocko` provjerava SQL Express, pokrece backend u pozadini i otvara http://localhost:5087/arena. Backend posluzuje i frontend; nije potreban npm start. Postojeci server se koristi bez dupliranja procesa. SQL se pokrece samo ako je ugasen; tada Windows moze traziti administratorsko odobrenje. Prvo pokretanje bez builda automatski pravi FE/BE build. Za primjenu novih izmjena koristi start-arena.ps1 -Public -Restart. Logovi su u .qa/launcher-*.log. Internet tunel se zasebno pokrece skriptom start-internet.ps1; LAN igranje ga ne zahtijeva.

Ako Desktop precica nedostaje, dvoklik na `Vrati precicu.cmd` u folderu projekta ponovo je pravi na stvarnom Windows Desktopu. Zatvaranje browsera ne zaustavlja backend pokrenut launcherom. Poslije gasenja ili restarta racunara ponovo klikni `Pokreni Skocko`.

Desktop pokretac je obican `Pokreni Skocko.cmd`, jer sistem moze odbiti cuvanje .lnk precica koje pokrecu PowerShell. On poziva isti launcher; prozor se zatvara po uspjesnom pokretanju.

Pokretac ispisuje status dok ceka server (do 180 sekundi). Ponovni klik otvara vec dostupnu aplikaciju i kada prethodno pokretanje jos traje. Greske ostaju vidljive u prozoru; nema modalnog dijaloga koji drzi zakljucavanje.

Pokretac sada automatski priprema i HTTPS tunel i otvara HTTPS aplikaciju za instalaciju. LAN instalacioni dijalog nudi prelazak na aktivni HTTPS link. Na Androidu koristi Chrome meni / Instaliraj; na iPhone-u Safari / Podijeli / Dodaj na pocetni ekran. HTTPS adresa je privremena i nakon promjene tunela instalirana aplikacija moze traziti ponovno dodavanje s novog linka. Za trajnu instalaciju potreban je stabilan HTTPS domen.

Muzicko pitanje samo pokrece zvuk koristeci audio kontekst otkljucan pri ulasku/glasovima. Snimak prati serverovo vrijeme i staje pola sekunde prije kraja pitanja, uz kratak fade. Povratak na pitanje ne resetuje snimak. Ako browser zahtijeva novi dodir nakon otvaranja ili povratka iz pozadine, postoji dugme Ukljuci zvuk. Kaladont vise ne salje niti prikazuje pocetno slovo odgovora.

Aplikacija i Desktop pokretac sada otvaraju pocetnu stranicu. Admin u cekaonici iznad Rundi 02?05 bira Samo vodim partiju ili Igram sa ekipom. Samo takmicari glasaju i odgovaraju. Admin igrac nema privilegovan uvid u trenutnu tacnost protivnika, ulazi u bodovanje i moze pobijediti. Uloga se zakljucava pri startu. Promjena uloge brise adminove ranije glasove.

## Lokalna igra bez interneta i desktop prozor

`install-desktop-app.ps1` pravi Desktop precicu Skocko aplikacija: launcher pali lokalni server i otvara poseban Edge app prozor bez kartica. To je desktop web aplikacija, ne samostalni nativni EXE paket. Native PWA instalacija je i dalje dostupna kroz Instaliraj na HTTPS adresi.

Prije izlaska pripremi muziku uz `node scripts/prepare-offline-music.mjs`. Lokalni previewi ostaju u ignorisanom BE/arena-data/audio-cache; ne salju se na GitHub. Za offline sobu ukljuci Lokalna igra bez interneta. Izbor pjesama se tada ogranicava na pripremljene snimke. Laptop i njegov SQL Server moraju ostati ukljuceni; povezi telefone i laptop na isti Wi-Fi ili hotspot. Koristi LAN pozivnicu, ne internet adresu instalirane PWA. Internet nije potreban za pitanja, bodove ni pripremljenu muziku. Telefon sam bez laptop/servera ne moze hostovati ovu verziju. Ako hotspot ne dozvoljava medjusobnu komunikaciju klijenata, koristi drugu lokalnu mrezu.

Banka sadrzi dodatnih 240 autorskih pitanja u svih osam oblasti. Rotacija daje prednost najmanje koriscenim pitanjima, pamti upotrebu na serveru i sastavlja nove Kaladont lance; ogranicena banka se poslije iscrpljivanja ponavlja. Nema tvrdnje da su pitanja prepisana iz TV emisija. Pregledani formati: https://www.rts.rs/lat/rts/rts-predstavlja/slagalica/pravila-i-prijave/3622030/pravila-su-pravila.html i https://www.rts.rs/lat/tv/rts1/2159633/potera.html.

Muzika traje dodatnih pet sekundi (10/15/20 postaje 15/20/25). Puni naslov zadrzava 100 osnovnih poena i bonus za brzinu; samo tacan izvodjac donosi 50 bez bonusa. Djelimican pogodak ne ulazi u izbor pobjednicke pjesme. Audio preskace tihi uvod i ponavlja kraci isjecak do kraja serverovog tajmera.

Za pripremu bez komandi koristi dvoklik na Pripremi offline.cmd u folderu projekta dok si na internetu. Trenutno je lokalno pripremljeno 48 originalnih preview snimaka.

## Direktna igra samo sa telefonima

Otvorite /offline (dugme Napolju na pocetnoj). Dok ste na internetu, domacin koristi Sacuvaj pitanja i muziku; paket ostaje u IndexedDB na tom telefonu. Svi ranije instaliraju aplikaciju i otvore /offline da provjere da je verzija spremna. Za igru bez interneta ukljucite zajednicki hotspot/Wi-Fi bez izolacije klijenata. Nisu potrebni laptop, SQL ili javni server tokom partije.

Domacin pravi QR za pojedinog gosta. Gost skenira ponudu i pokaze povratni QR; domacin skenira taj odgovor. SDP se razmjenjuje rucno, kompresovano; WebRTC koristi samo lokalne ICE kandidate (bez STUN/TURN servera). Nakon povezivanja i nadimaka, svi glasaju za cetiri oblasti. Muzika se prenosi direktno gostima i potvrda prijema je uslov za start. Domacin vodi sat, odgovore, poene i zavrsetak partije. Oba ekrana prikazuju istu partiju. Zadrzite aplikaciju domacina u prvom planu; prekid ili zatvaranje domacina prekida partiju. Ovaj rezim ne migrira domacina niti automatski obnavlja izgubljene veze.

Ako kamera nije dostupna, kodovi se mogu prenijeti rucno iz polja Tvoj kod za povezivanje. Maksimalno osam telefona. Na nekim hotspotima i browserima direktna WebRTC veza nece uspjeti zbog ogranicenja mreze; aplikacija prikazuje gresku, tada koristite drugu lokalnu mrezu ili internet Arenu. Offline PWA i kamera zahtijevaju prethodno instaliranu HTTPS verziju; obican LAN HTTP nije dovoljan na telefonima.

Pitanja u rundama 2-5 imaju urednicke nivoe 1-5. Svaka runda bira po jedno pitanje blisko svakom nivou, bez duplikata, i sortira ih rastuce. Rotacija najmanje koriscenih pitanja i dalje vazi unutar odgovarajuceg nivoa. Kaladont zadrzava slovnu vezu.

Automatski test tests/phone-offline-browser.mjs proverava dva browser klijenta: uparivanje, glasanje, potvrdu prenosa muzike, svih 30 pitanja, bodove gosta i pobjednika dok su HTTP/HTTPS zahtjevi blokirani. Ovaj test nije zamjena za fizicku probu kombinacije Android/iPhone i konkretnog hotspota.
