# Darbo skelbimų portalo promptas

Žemiau pateiktas detalus aprašymas, kurį galima panaudoti kaip „promptą“ generuojant pilną darbo skelbimų portalą (CVbankas/CVonline tipo).

---

## PROMPTAS CODEX'UI: Pilnas darbo skelbimų portalas (Lietuva) – nuo registracijos iki administravimo

Sukurk pilnai veikiantį, produkcijai paruoštą darbo skelbimų portalą (CVbankas/CVonline tipo), su pilna funkcionalumo apimtimi tiek kandidatams, tiek darbdaviams, tiek administratoriui. Projektas turi būti „full-stack“ su modernia architektūra, saugumu, testais, dokumentacija ir diegimo instrukcijomis. Sistema turi turėti visas tipines darbo portalo funkcijas: registracija, prisijungimas, CV kūrimas, darbo skelbimų talpinimas, paieška, kandidatavimas, žinutės, prenumeratos, moderavimas, apmokėjimai, statistika, SEO, administravimo panelė.

### 1) Tech reikalavimai (pasirink modernų stack'ą ir įgyvendink)

* Frontend: React + TypeScript + Next.js (App Router), SSR/ISR kur reikia SEO.
* Backend: Node.js (NestJS) ARBA Next.js API route + atskiras service layer. Geriau NestJS.
* DB: PostgreSQL + Prisma ORM.
* Cache/queue: Redis (sesijoms / rate limit / queue).
* Failai: S3 suderinama saugykla (pvz. MinIO lokaliai, AWS S3 produkcijoje) CV PDF ir logotipams.
* Search: PostgreSQL full-text + optional Elasticsearch (jei renkiesi – padaryk pasirinktinai per env).
* Auth: JWT (access+refresh) + httpOnly cookies, taip pat OAuth (Google) kaip papildomas login būdas.
* Payments: Stripe (abonementai, vienkartiniai pirkimai už skelbimo iškėlimą / „highlight“).
* Email: SMTP (pvz. Mailgun/Sendgrid) – naudok adapterį + template'us.
* i18n: LT (privaloma) + EN (pasirinktinai).
* Docker: docker-compose dev aplinkai (app, db, redis, minio).
* Testai: unit + integration (backend), e2e bent kritiniams flow.
* Dokumentacija: README su paleidimu, env pavyzdžiu, migracijomis, seed duomenimis, admin prisijungimu.

### 2) Vartotojų rolės ir teisės (RBAC)

Implementuok rolėmis paremtą prieigos kontrolę su teisėmis (permissions).

* Kandidatas (Candidate)
* Darbdavys (Employer)
* Admin (Administrator)
* Moderatorius (optional, gali būti Admin sub-role)

Kiekvienas API endpointas ir UI veiksmas turi būti apsaugotas pagal rolę ir leidimus.

### 3) Pagrindinės funkcijos kandidatui

**Registracija / prisijungimas**

* Email+password registracija su email patvirtinimu.
* Password reset per email.
* 2FA (TOTP) – pasirinktina, bet įdiegti.
* Prisijungimo bandymų ribojimas, lockout, CAPTCHA po N bandymų.
* Profilio nustatymai: kontaktai, miestas, norimas atlyginimas, nuotolinis/hibridinis/biuras, darbo tipas.

**CV / profilis**

* CV builder: išsilavinimas, patirtis, įgūdžiai (tag'ai), kalbos, sertifikatai, portfolio linkai.
* Galimybė importuoti CV PDF/DOCX (bent PDF upload, parsinti nebūtina, bet saugoti ir leisti atsisiųsti).
* CV versijos (v1, v2) ir pasirinkimas kurią siųsti kandidatavime.
* Privatumo nustatymai: ar profilis matomas darbdaviams; ar rodyti kontaktus; anonimizuotas CV režimas.

**Darbo paieška**

* Paieška pagal: pareigybė, miestas/regionas, nuotolinis, atlyginimo rėžiai, technologijos/įgūdžiai, darbo tipas (full-time/part-time/contract/intern).
* Filtrai, rūšiavimas (naujausi, atlyginimas, populiarumas).
* Išsaugotos paieškos (saved searches) + email pranešimai.
* Mėgstamiausi skelbimai (bookmark).
* Skelbimo peržiūra + panašūs skelbimai.

**Kandidatavimas**

* Kandidatuoti su pasirinktu CV + motyvacinis laiškas.
* Failų priedai (pvz. portfolio PDF).
* Kandidatavimo būsena: pateikta, peržiūrėta, atranka, atmesta, pasiūlymas.
* Kandidatavimo istorija su filtrais.
* Kandidatavimo atšaukimas (jei darbdavys dar neperžiūrėjo – taisyklę sukonfigūruok).

**Komunikacija**

* Inbox žinutės su darbdaviais (tik po kandidatavimo arba darbdaviui pakvietus).
* Pranešimai: email + in-app (nauji skelbimai, atsakymai, statuso pasikeitimai).

### 4) Pagrindinės funkcijos darbdaviui

**Registracija / įmonės profilis**

* Įmonės registracija (įmonės pavadinimas, kodas, svetainė, veikla, dydis, lokacija).
* Logotipo įkėlimas, cover nuotrauka.
* Komandos nariai: Employer Owner + Recruiter (pakvietimai el. paštu, rolės).
* Įmonės viešas puslapis su skelbimais.

**Skelbimų kūrimas ir valdymas**

* Skelbimo kūrimo formos: pavadinimas, aprašymas (rich text), atsakomybės, reikalavimai, privalumai, atlyginimas (nuo-iki, bruto/neto žyma), lokacija, nuotolinis/hibridinis, darbo tipas, patirties lygis, kategorija, tag'ai/įgūdžiai.
* Skelbimo statusai: Draft, Pending Review, Published, Paused, Expired, Rejected.
* Publikavimas tik po moderavimo (konfigūruojama per admin).
* Skelbimo atnaujinimas („bump“) – mokama funkcija.
* Premium/Highlight skelbimai – mokami, rodomi viršuje (su taisyklėmis).
* Skelbimo galiojimo laikas (pvz. 30 dienų), automatinis expire.

**Kandidatų valdymas (ATS mini)**

* Kandidatų sąrašas pagal skelbimą su filtrais ir statusais.
* Peržiūros žymėjimas, komentarai prie kandidato (vidiniai, tik darbdaviui).
* Kandidato kvietimas į pokalbį (template + siuntimas).
* Eksportas CSV (tik su teisėmis).
* Kandidato profilio peržiūra su privatumo taisyklėmis.

**Statistika**

* Peržiūrų skaičius, kandidatavimų skaičius, CTR, šaltiniai (UTM).
* Premium skelbimų efektyvumo palyginimas.

### 5) Admin panelė (privaloma, pilna)

Sukurk atskirą admin UI (pvz. /admin) su apsaugotu prisijungimu ir 2FA reikalavimu.
Admin funkcijos:

* Vartotojų valdymas: kandidatai/darbdaviai, blokavimas, rolės, prisijungimų istorija.
* Įmonių valdymas: patvirtinimas, blokavimas, duomenų korekcijos audit trail.
* Skelbimų moderavimas: peržiūra, redagavimas, approve/reject su priežastimi, automatinės taisyklės (žodynas: scam, adult, diskriminacija).
* Skundų (reports) valdymas: kandidatai gali reportinti skelbimą/įmonę.
* Turinio valdymas: kategorijos, miestai/regionai, tag'ai/įgūdžiai (taxonomy).
* Mokėjimai: planai, užsakymai, sąskaitos, refund, webhook log.
* Sisteminis konfigas: ar reikalingas moderavimas, kainos, limitai.
* Audit log: kas ką keitė ir kada (privaloma).
* Incident log: security įvykiai, rate-limit triggers.

### 6) Saugumas (privaloma, „rimtai“)

Įgyvendink:

* Password hashing (argon2/bcrypt), password policy.
* JWT su refresh rotacija, token revocation, session management.
* CSRF apsauga jei naudoji cookies.
* XSS apsauga, HTML sanitizavimas rich text laukams.
* SQL injection apsauga per ORM + validacijos.
* Rate limiting (login, search, apply).
* Brute force apsauga + suspicious activity detection.
* Failų upload saugumas: antivirus hook (optional), MIME tikrinimas, dydžio limitai, random filename, private bucket CV failams.
* Roles/permissions enforcement server-side (ne tik UI).
* GDPR: duomenų eksportas (download my data), paskyros ištrynimas (su retention taisyklėmis), sutikimai (marketing opt-in).

### 7) Duomenų modelis (DB schemos gairės)

Sukurk Prisma schemas su ryšiais ir indeksais:

* User (id, email, passwordHash, role, status, createdAt…)
* ProfileCandidate (userId, contact, settings…)
* ProfileEmployer (companyId, userId, roleInCompany…)
* Company (id, name, code, description, website, logoUrl…)
* JobPost (id, companyId, title, description, salaryMin/Max, location, remoteType, employmentType, experienceLevel, status, publishedAt, expiresAt, premiumFlags…)
* JobTag (taxonomy)
* JobPostTag (join)
* Application (id, jobPostId, candidateId, cvVersionId, coverLetter, status, viewedAt…)
* CvVersion (candidateId, jsonData, fileUrl?, createdAt…)
* MessageThread, Message
* Notification (inApp), EmailLog
* SavedSearch, Bookmark
* Report (targetType, targetId, reason, status)
* AuditLog (actorId, action, entityType, entityId, before/after json, ip, userAgent)
* PaymentPlan, Subscription, Order, Invoice, WebhookEvent

Indeksai: paieškai (title, location, tags), application (jobPostId, candidateId), audit (entityType+id), message thread.

### 8) API dizainas

Sukurk REST API (arba GraphQL, bet REST paprasčiau) su:

* /auth (register, verify-email, login, refresh, logout, forgot/reset)
* /candidate (profile, cv, applications, saved-searches, bookmarks)
* /employer (company, team, job-posts, applications, analytics)
* /jobs (search, details, similar, categories, tags)
* /messages (threads, send)
* /notifications (list, mark-read)
* /admin (users, companies, job-posts moderation, reports, config, audit)
* /payments (checkout, portal, webhook)

Naudok DTO validaciją (zod/class-validator) ir aiškius error codes.

### 9) UI/UX reikalavimai

Frontend puslapiai:

* Landing + paieška
* Darbų sąrašas su filtrais
* Skelbimo detalės
* Kandidato dashboard: CV, kandidatavimai, žinutės, nustatymai
* Darbdavio dashboard: įmonė, skelbimai, kandidatai, statistika, planai/mokėjimai
* Admin panelė: lentelės, filtrai, audit log, moderavimo ekranas

Naudok komponentų biblioteką (pvz. shadcn/ui) ir formų validaciją.

### 10) SEO ir viešinimas

* Server-side render job post pages (Next SSR/ISR).
* Schema.org JobPosting structured data.
* OpenGraph meta.
* Sitemap.xml ir robots.txt.
* Canonical URL, slug'ai.
* UTM tracking.

### 11) Observability / kokybė

* Centralizuotas log'inimas (pino/winston), request id.
* Error tracking hook (Sentry optional).
* Health endpoints: /health, /ready.
* Migration + seed.
* CI pipeline (GitHub Actions) – lint, test, build.

### 12) Pradiniai duomenys ir demo

* Seed: 1 admin, 3 įmonės, 20 skelbimų, 10 kandidatų, kelios aplikacijos.
* Admin prisijungimo duomenis pateik README (dev tik).

### 13) Projekto struktūra ir pristatymas

Sugeneruok:

* Monorepo (apps/web, apps/api, packages/shared) arba aiški struktūra.
* .env.example
* docker-compose.yml
* README su:
  * kaip paleisti
  * kaip vykdyti migracijas
  * kaip sukonfigūruoti Stripe webhooks lokaliai
  * kaip prisijungti į admin
  * testų paleidimas

### 14) Privalomi „edge case“ / taisyklės

* Darbdavys negali matyti kandidato kontaktų, jei kandidatas pasirinko anoniminį režimą (išskyrus atvejį kai kandidatas kandidatuoja ir sutinka atskleisti).
* Skelbimo publikavimas be apmokėjimo turi limitus (pvz. 1 aktyvus nemokamas).
* Premium skelbimai turi „fairness“: nerodyti vieno darbdavio visų premium viršuje, naudok rotaciją.
* Visi veiksmai su kritiniais duomenimis turi audit log.
* GDPR: „right to be forgotten“ – ištrynus kandidatą anonimizuoti aplikacijas (palikti statistiką).

### 15) Output reikalavimai

Sugeneruok visą kodą: backend + frontend + DB schema + migracijos + seed + testai + docker. Viskas turi veikti „out-of-the-box“ su `docker-compose up`, o tada:

* Web: http://localhost:3000
* API: http://localhost:4000
* Admin: http://localhost:3000/admin

---

Jei reikia, galima sukurti alternatyvų, trumpesnį promptą su griežtesniais „acceptance criteria“.

## Projekto pradinė struktūra

Pridėta monorepo struktūra, atitinkanti nurodytus technologinius reikalavimus:

- `apps/api` – Express pagrindu veikiantis API startas su `helmet`, `cors`, `morgan` ir sveikatos patikra (`/health`, `/ready`).
- `apps/web` – Next.js 14 pagrindo viešasis tinklalapis su pradine SEO metadata ir pasiruošimu SSR/ISR puslapiams.
- `packages/shared` – vieta bendrinamiems tipams ir konstantoms.
- `docker-compose.yml` – Postgres, Redis, MinIO ir Mailhog paslaugos, bei web ir api konteinerių ruošiniai.
- `.env.example` – pagrindiniai konfigūracijos raktai (DB, JWT, S3, Stripe, SMTP, admin demo duomenys).

Tolimesni žingsniai:

1. Įsirašyti priklausomybes (`npm install` projekto šaknyje su workspaces palaikymu).
2. Paleisti `docker-compose up --build` ir tikrinti `http://localhost:4000/health` bei `http://localhost:3000`.
3. Papildyti API moduliais (auth, kandidatų/darbdavių srautai, mokėjimai) ir Next.js puslapiais pagal aukščiau esantį detalų promptą.

## Minimalus įgyvendinimas (dabartinė repo versija)

Šiame commit'e pridėtas veikiantis API stub'as ir duomenų modeliai, kad būtų galima iš karto išbandyti kritinius srautus:

* `/auth/register`, `/auth/login`, `/auth/refresh` – JWT autentifikacija (bcrypt slaptažodžiai, rate-limit loginui).
* `/jobs` – skelbimų sąrašas, kūrimas, publikavimas ir kandidatavimas.
* `/candidate` – CV versijų kūrimas ir kandidatavimo istorija.
* `/employer` – darbdavio skelbimai, kandidatų peržiūra, analitika.
* `/admin` – vartotojų, skelbimų, ataskaitų ir audit log peržiūra.
* Health/ready endpoint'ai: `/health`, `/ready`.

Pridėta `Prisma` schema su visais pagrindiniais modeliais (User, Company, JobPost, Application, CV, Notification, PaymentPlan ir kt.), kad būtų galima generuoti migracijas į PostgreSQL.

### Kaip paleisti API lokaliai

```bash
npm install
cd apps/api && npm install
npm run dev --workspace apps/api
```

### Sėkliniai duomenys

Kraunant API, automatiškai sukuriamos trys paskyros ir vienas skelbimas:

* Admin: `admin@example.com` / `Admin123!`
* Darbdavys: `employer@example.com` / `Employer123!`
* Kandidatas: `candidate@example.com` / `Candidate123!`

Naudokite gautą `accessToken` iš `/auth/login` užklausų Authorization antraštėje: `Bearer <token>`.

### Prisma

Prisijungimo eilutę `DATABASE_URL` aprašykite `.env` faile (PostgreSQL). Migracijai:

```bash
cd apps/api
npx prisma migrate dev --name init
```

Seed'ui galite adaptuoti `apps/api/src/data/store.ts` arba sukurti `prisma/seed.ts` pagal šią struktūrą.
