# PUGS - Platforma za Upravljanje i Generisanje Sadržaja kvizova 

Full-stack web aplikacija za upravljanje i izvođenje kvizova u realnom vremenu.

## Arhitektura

- `BE/` - Backend (.NET 7, REST API, SignalR)
- `FE/` - Frontend (React + TypeScript)
-  Baza podataka: SQL Server (koristi se SQL Server Management  Studio - SSMS za upravljanje bazom i migracije)
- `.env` i `appsettings.json` - konfiguracije

## Funkcionalnosti

- Registracija i login (JWT, hesirane lozinke)
- Role-based pristup (admin, user)
- CRUD kvizova (admin)
- Live kviz sa tajmerom i rang listom (SignalR)
- Višestruki pokušaji i praćenje rezultata

## Pokretanje

**Backend** (`BE/`):
dotnet ef database update
dotnet run

**Frontend** ('FE/'):
npm install
'.env' -> REACT_APP_API_URL=http://localhost:5087
npm start

## Napomene

- Frontend koristi servise za HTTP pozive
- Modeli i DTO su odvojeni
- REST konvencije su ispoštovane
- Token se validira, lozinke su heširane
- UML dijagram i migracije dostupni u projektu