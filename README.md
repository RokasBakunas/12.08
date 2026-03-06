# Job Portal API + VNO→KUN Skrydžių Stebėjimas

Express.js REST API su MongoDB, dislokuotas Vercel platformoje. Apima darbo skelbimų portalą ir automatinį Vilniaus–Kauno skrydžių nukreipimo aptikimą.

---

## Technologijų stack'as

| Sluoksnis | Technologija |
|-----------|-------------|
| Runtime | Node.js 18+ |
| Framework | Express.js + TypeScript |
| Duomenų bazė | MongoDB (Mongoose) |
| Autentifikacija | JWT (access + refresh token) |
| Diegimas | Vercel (serverless) |
| Skrydžių duomenys | OpenSky Network API (nemokama) |

---

## API Endpoint'ai

### Autentifikacija `/auth`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| POST | `/auth/register` | Naujo vartotojo registracija |
| POST | `/auth/login` | Prisijungimas (JWT) |
| POST | `/auth/refresh` | Access token atnaujinimas |

### Darbo skelbimai `/jobs`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/jobs` | Skelbimų sąrašas (filtrai: `?q=`, `?location=`) |
| GET | `/jobs/:id` | Skelbimo detalės + panašūs skelbimai |
| POST | `/jobs` | Sukurti naują skelbimą *(employer)* |
| POST | `/jobs/:id/publish` | Publikuoti skelbimą *(employer)* |
| POST | `/jobs/:id/apply` | Kandidatuoti į skelbimą *(candidate)* |

### Kandidatas `/candidate`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/candidate/profile` | CV versijų sąrašas |
| POST | `/candidate/cv` | Sukurti naują CV versiją |
| GET | `/candidate/applications` | Kandidatavimų istorija |

### Darbdavys `/employer`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/employer/jobs` | Darbdavio skelbimai |
| GET | `/employer/jobs/:id/applicants` | Skelbimo kandidatai |
| GET | `/employer/analytics` | Statistika |

### Administravimas `/admin`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/admin/users` | Vartotojų sąrašas |
| GET | `/admin/jobs` | Visų skelbimų sąrašas |
| POST | `/admin/jobs/:id/review` | Pakeisti skelbimo statusą |
| GET | `/admin/reports` | Skundų sąrašas |
| GET | `/admin/audit` | Audit log |

### VNO→KUN Skrydžių stebėjimas `/flights`
| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/flights/diversions` | Nukreiptų skrydžių sąrašas |
| GET | `/flights/status` | Greita patikra (ar yra nukreipimų) |
| GET | `/flights/departures/vilnius` | Visi VNO išskridimų duomenys |
| GET | `/flights/arrivals/kaunas` | Visi KUN atskridimų duomenys |
| POST | `/flights/cache/clear` | Kešo išvalymas |

Visi `/flights` endpoint'ai priima `?hours=1-24` parametrą (numatytasis: 6 val.).

#### Nukreipimo aptikimo logika
Sistema automatiškai lygina orlaivių (pagal ICAO24 transponderio kodą), kurie:
1. **Išskrido** iš Vilniaus (EYVI)
2. **Nusileido** Kaune (EYKA)

per nurodytą laiko langą. Duomenys gaunami iš [OpenSky Network](https://opensky-network.org/) nemokamos API.

---

## Paleisti lokaliai

```bash
# 1. Įsirašyti priklausomybes
npm install

# 2. Sukurti .env failą
cp .env.example .env
# Užpildyti MONGODB_URI ir JWT_SECRET

# 3. Paleisti API
npm run dev --workspace apps/api
# API pasiekiamas: http://localhost:4000
```

---

## Aplinkos kintamieji

`.env` faile (pagal `.env.example`):

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0...mongodb.net/?appName=Cluster0
JWT_SECRET=stiprus-slaptas-raktas
API_PORT=4000
```

---

## Diegimas į Vercel

1. Importuoti repozitoriją Vercel platformoje
2. Pridėti aplinkos kintamuosius **Settings → Environment Variables**:
   - `MONGODB_URI`
   - `JWT_SECRET`
3. Deploy – `vercel.json` automatiškai nukreipia visas užklausas į API

---

## Demo paskyros

Paleidus API pirmą kartą, MongoDB automatiškai užpildoma pradiniais duomenimis:

| Rolė | El. paštas | Slaptažodis |
|------|-----------|-------------|
| Admin | `admin@example.com` | `Admin123!` |
| Darbdavys | `employer@example.com` | `Employer123!` |
| Kandidatas | `candidate@example.com` | `Candidate123!` |

Prisijungus naudokite gautą `accessToken` antraštėje:
```
Authorization: Bearer <accessToken>
```

---

## Projekto struktūra

```
apps/api/src/
├── db/
│   ├── connection.ts          # MongoDB ryšys (serverless-safe kešavimas)
│   └── models.ts              # Mongoose schemos
├── data/
│   └── store.ts               # Seed funkcija, autentifikacija
├── middleware/
│   └── auth.ts                # JWT tikrinimas, RBAC
├── routes/
│   ├── auth.ts
│   ├── jobs.ts
│   ├── candidate.ts
│   ├── employer.ts
│   ├── admin.ts
│   └── flights.ts             # VNO→KUN stebėjimas
├── services/
│   └── flightDiversionService.ts  # OpenSky API integracija
└── main.ts                    # Express app (eksportuojamas Vercel)
packages/shared/src/
└── types.ts                   # Bendri TypeScript tipai
vercel.json                    # Vercel konfigūracija
```
