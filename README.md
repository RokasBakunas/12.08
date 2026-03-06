# VNO→KUN Skrydžių Nukreipimo Aptikimas

Express.js REST API, dislokuotas Vercel platformoje. Aptinka orlaivius, kurie šiuo metu yra Kauno oro uosto (KUN / ICAO: EYKA) rajone ir nėra reguliarių Kauno maršrutų vykdytojai – tai potencialūs nukreipimai iš Vilniaus (VNO / ICAO: EYVI).

Duomenų šaltinis: [ADS-B Exchange](https://api.adsb.lol/) per `api.adsb.lol` – nemokama, realaus laiko ADS-B duomenų API, API rakto nereikia.

---

## Endpoint'ai

| Metodas | Kelias | Aprašymas |
|---------|--------|-----------|
| GET | `/` | API informacija ir endpoint'ų sąrašas |
| GET | `/health` | Sveikatos patikra |
| GET | `/ready` | Parengtumo patikra |
| GET | `/flights/diversions` | Potencialiai nukreiptų skrydžių sąrašas (live) |
| GET | `/flights/status` | Ar yra nukreipimų šiuo metu (be pilno sąrašo) |
| GET | `/flights/arrivals/kaunas` | Visi orlaiviai šiuo metu Kauno rajone (raw) |
| POST | `/flights/cache/clear` | Kešo išvalymas (priverstinis atnaujinimas) |

### Aptikimo logika

1. Gaunami visi orlaiviai 25 jūrmylių spinduliu aplink Kauno oro uostą (live ADS-B)
2. Filtruojami reguliarūs Kauno vežėjai: **Ryanair** (RYR), **Wizz Air** (WZZ), Ryanair Sun (RYS), Buzz (BZZ)
3. Likę orlaiviai – potencialūs nukreipimai iš Vilniaus ar kitų destinacijų

> **Pastaba:** duomenys yra realaus laiko (ne istoriniai). Jei nukreipimas įvyko prieš kelias valandas ir orlaivis jau išskrido, jis nebus rodomas.

### Pavyzdinė atsakymo struktūra (`/flights/diversions`)

```json
{
  "totalDiversions": 1,
  "checkedAt": "2026-03-06T10:00:00.000Z",
  "diversionAirport": "EYKA",
  "note": "Aircraft currently at Kaunas operated by carriers without scheduled Kaunas routes – likely diverted from Vilnius (EYVI). Live ADS-B data.",
  "flights": [
    {
      "callsign": "LOT123",
      "icao24": "a1b2c3",
      "registration": "SP-LXX",
      "aircraftType": "B738",
      "diversionAirport": "EYKA",
      "detectedAt": "2026-03-06T10:00:00.000Z"
    }
  ]
}
```

Kai nukreipimų nėra: `"totalDiversions": 0` ir `"flights": []`.

---

## Paleisti lokaliai

```bash
npm install
npm run dev
# API pasiekiamas: http://localhost:4000
```

Aplinkos kintamieji (nebūtini):

```env
API_PORT=4000
```

---

## Diegimas į Vercel

1. Importuoti repozitoriją Vercel platformoje
2. Deploy – `vercel.json` automatiškai nukreipia visas užklausas į API
3. Aplinkos kintamųjų nereikia (ADS-B Exchange API yra viešas)

---

## Projekto struktūra

```
apps/api/src/
├── routes/
│   └── flights.ts                 # Visi /flights endpoint'ai
├── services/
│   └── flightDiversionService.ts  # ADS-B API integracija + aptikimo logika
└── main.ts                        # Express app (eksportuojamas Vercel)
vercel.json                        # Vercel konfigūracija
```
