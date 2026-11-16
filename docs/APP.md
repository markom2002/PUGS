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
- Sesija se pamti na uređaju i poslije zatvaranja prozora. Napuštanje prikaza briše aktivnu lokalnu sesiju. HTTPS i LAN origin imaju zasebno spremište; za igru iz instalirane aplikacije otvori HTTPS adresu prije ulaska u sobu.
- U javnom režimu (`Arena:PublicMode=true`) dostupni su Arena API i interfejs. Raniji administratorski API, Swagger, stari SignalR i upload su blokirani. Kreiranje i ulazak imaju ograničenje pokušaja po IP adresi.

Ovo je privatna multiplayer aplikacija za probne partije s društvom, ne završena infrastruktura za javni komercijalni servis. Postojeće AutoMapper/CRA zavisnosti imaju prijavljena upozorenja koja treba zasebno riješiti prije takvog lansiranja.
