# VNO→KUN Skrydžių Nukreipimo Aptikimas

Express.js REST API, dislokuotas Vercel platformoje. Automatiškai aptinka, kai skrydžiai iš Vilniaus oro uosto (VNO / ICAO: EYVI) nukreipiami į Kauną (KUN / ICAO: EYKA).

Duomenų šaltinis: [OpenSky Network](https://opensky-network.org/) – nemokama viešoji API, API rakto nereikia.

---

## Endpoint'ai

| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/health` | Sveikatos patikra |
| GET | `/ready` | Parengtumo patikra |
| GET | `/flights/diversions` | Nukreiptų skrydžių sąrašas |
| GET | `/flights/status` | Ar yra nukreipimų (be pilno sąrašo) |
| GET | `/flights/departures/vilnius` | Visi VNO išskridimų duomenys |
| GET | `/flights/arrivals/kaunas` | Visi KUN atskridimų duomenys |
| POST | `/flights/cache/clear` | Kešo išvalymas |

Visi `/flights` endpoint'ai priima `?hours=1-24` parametrą (numatytasis: 6 val.).

### Aptikimo logika

Sistema lygina orlaivių ICAO24 transponderio kodus:
1. Orlaivis **išskrido** iš Vilniaus (EYVI) per nurodytą laiko langą
2. Tas pats orlaivis **nusileido** Kaune (EYKA) per tą patį langą

→ Toks skrydis žymimas kaip potencialus nukreipimas.

### Pavyzdinė atsakymo struktūra (`/flights/diversions`)

```json
{
  "totalDiversions": 1,
  "windowHours": 6,
  "checkedAt": "2026-03-06T10:00:00.000Z",
  "originAirport": "EYVI",
  "diversionAirport": "EYKA",
  "flights": [
    {
      "callsign": "BTI123",
      "icao24": "a1b2c3",
      "departedAt": 1741251600,
      "departedAtIso": "2026-03-06T07:00:00.000Z",
      "arrivedAt": 1741252500,
      "arrivedAtIso": "2026-03-06T07:15:00.000Z",
      "originAirport": "EYVI",
      "diversionAirport": "EYKA",
      "flightDurationSeconds": 900,
      "detectedAt": "2026-03-06T10:00:00.000Z"
    }
  ]
}
```

---

## Paleisti lokaliai

```bash
npm install
npm run dev
# API pasiekiamas: http://localhost:4000
```

Aplinkos kintamieji (nebūtini – API veikia be jų):

```env
API_PORT=4000
```

---

## Diegimas į Vercel

1. Importuoti repozitoriją Vercel platformoje
2. Deploy – `vercel.json` automatiškai nukreipia visas užklausas į API
3. Aplinkos kintamųjų nereikia

---

## Projekto struktūra

```
apps/api/src/
├── routes/
│   └── flights.ts              # Visi /flights endpoint'ai
├── services/
│   └── flightDiversionService.ts  # OpenSky API integracija + aptikimo logika
└── main.ts                     # Express app (eksportuojamas Vercel)
vercel.json                     # Vercel konfigūracija
```
