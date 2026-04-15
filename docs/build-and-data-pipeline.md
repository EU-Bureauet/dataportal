# Build-proces og datapipeline

## Oversigt

Dataportal er et statisk genereret Next.js site. Al data kommer fra JSON-filer i `data/`-mappen, som enten er:

1. **Pre-computed analytics** — genereret eksternt fra EU-Parlamentets data
2. **WordPress-artikler** — hentet automatisk ved build-time via REST API
3. **Tema-konfiguration** — manuelt vedligeholdte JSON-filer

---

## Build-kommandoer

```bash
npm run build         # Fuld pipeline: prebuild → next build → statisk /out
npm run dev           # Lokal udvikling med Turbopack
npm run lint          # ESLint + TypeScript check
npm test              # Vitest: 108 tests (data-integritet + unit)
npm run fetch-articles # Manuel kørsel af artikel-fetch
```

### Build-pipeline

```
npm run build
  │
  ├─ 1. prebuild (automatisk via npm lifecycle)
  │     └─ node scripts/fetch-articles.mjs
  │         ├─ Henter artikler fra WordPress REST API
  │         ├─ Fallback: WordPress RSS feed
  │         ├─ Fallback: Beholder eksisterende articles.json
  │         └─ Output: data/articles.json
  │
  └─ 2. next build
        ├─ Læser data/themes/*.json → genererer /tema/energi, /tema/forsvar, /tema/miljoe
        ├─ Statisk genererer alle sider til /out
        └─ Kopierer data/*.json til /out/data/ (tilgængelig som statiske filer)
```

---

## WordPress artikel-pipeline

### `scripts/fetch-articles.mjs`

Scriptet kører automatisk **før hvert build** (via `prebuild` i package.json) og henter artikler fra EU-Bureauets WordPress-site.

### Fetch-kæde med fallbacks

```
Trin 1: WordPress REST API
  URL: https://www.eubureauet.dk/wp-json/wp/v2/posts?per_page=100&_embed
  → Paginerer via x-wp-totalpages header
  → Extraherer: titel, excerpt, featured image, kategorier, tags
  → Dekoder HTML-entities (&#8217; → ', &amp; → &)

  Hvis det fejler ↓

Trin 2: WordPress RSS Feed
  URL: https://www.eubureauet.dk/feed/
  → Parser XML (<item>-elementer)
  → Extraherer: titel, link, beskrivelse, dato, billede
  → Kategoriserer terms: "Artikel"/"EU-netværk"/"Værktøj" → categories, resten → tags

  Hvis det også fejler ↓

Trin 3: Behold eksisterende data/articles.json
  → Advarer i konsollen, men build fortsætter
```

### Output-format (`data/articles.json`)

```json
{
  "_generated": "2026-04-09T12:00:00.000Z",
  "articles": [
    {
      "id": "12345",
      "title": "Ny energiaftale i EU-Parlamentet",
      "description": "EU-Parlamentet har stemt om...",
      "image": "https://www.eubureauet.dk/wp-content/uploads/...",
      "url": "https://www.eubureauet.dk/ny-energiaftale/",
      "date": "2026-04-08",
      "categories": ["Artikel"],
      "tags": ["Energi- og industritema", "Analyse"]
    }
  ]
}
```

### Hvordan artikler filtreres til temasider

`app/tema/[slug]/page.tsx` læser `articles.json` og filtrerer mod temaets `articleFilter.tags`:

```
Tema: energi.json
  articleFilter.tags: ["Energi- og industritema"]

Artikel med tags: ["Energi- og industritema", "Analyse"]
  → Match! Vises på /tema/energi

Artikel med tags: ["Forsvarstema"]
  → Ingen match. Vises ikke på /tema/energi
```

---

## Datfiler i `/data`

### Pre-computed analytics

Disse filer genereres eksternt (ikke af denne app) og skal opdateres manuelt eller via en ekstern pipeline:

| Fil | Indhold | Struktur |
|-----|---------|----------|
| `All_Winning_coalitions.json` | Vindende koalitioner per udvalg | `{ TOTAL: { total_coalitions: [...] }, ITRE: [...], ... }` |
| `All_Pairwise_coalitions.json` | Pairwise gruppeenighed | `{ TOTAL: [...], ITRE: [...], ... }` |
| `All_Group_wins.json` | Gruppesejre per udvalg | `{ TOTAL: { total_group_wins: [...] }, ITRE: [...], ... }` |
| `latest_votes.json` | Seneste afstemninger med metadata | `{ metadata: {...}, committees: [...] }` |
| `meps_clean.json` | Alle 720 MEP'er | `{ meps: [...] }` |
| `Danske_MEPs_brud_med_partigruppelinjen.json` | Danske MEP-brud med partigruppen | `{ mep_vs_party: { disagreements: [...] } }` |
| `national_party_disagreements.json` | Nationale partiers interne uenigheder | `{ metadata: {...}, parties: {...} }` |
| `vote_details_*.json` | Detaljeret afstemningsbreakdown | Per afstemning: grupper, lande, MEP-stemmer |
| `mep_*.json` | Individual MEP afstemningsdata | Per MEP: info + vote IDs |

### Referencefiler

| Fil | Indhold |
|-----|---------|
| `group-tooltips.json` | 9 grupper med kode, farve, beskrivelse, sædeorden |
| `committee_and_group_names.json` | Udvalgskoder → danske navne, gruppekoder → danske navne |

### Tema-konfiguration

| Fil | Tema | Primært udvalg |
|-----|------|----------------|
| `themes/energi.json` | Energi og industri | ITRE |
| `themes/forsvar.json` | Forsvar og sikkerhed | SEDE |
| `themes/miljoe.json` | Miljø og klima | ENVI |

Se [theme-admin-guide.md](theme-admin-guide.md) for konfigurationsdetaljer.

---

## Klientside datafetching

Chart-komponenter henter data **efter** side-render via SWR:

```
Browser loads static HTML
  → React hydrates
  → useSWR fetches /data/All_Group_wins.json
  → Pure transforms (lib/data-transforms.ts) processerer rådata
  → Chart renderes med Recharts / D3 / Chart.js
```

Alle JSON-filer kopieres til `/out/data/` ved build og serveres som statiske filer af Nginx.

---

## Deployment

### Container-build

```bash
# Build container (Podman eller Docker)
podman build -f Containerfile -t dataportal .

# Container kører Nginx der serverer /out
podman run -p 8080:8080 dataportal
```

### Manuel deploy

```bash
npm run build
# Upload /out mappen til webserver
# Nginx config: se nginx.conf i roden
```

---

## Dataopdateringer

| Hvad skal opdateres | Handling |
|---------------------|----------|
| Nye artikler fra WordPress | Kør `npm run build` (prebuild henter automatisk) |
| Nye afstemningsdata | Erstat relevante JSON-filer i `data/`, kør `npm run build` |
| Nyt tema | Opret `data/themes/{slug}.json`, kør build (se [theme-admin-guide.md](theme-admin-guide.md)) |
| Skjul et tema | Sæt `"published": false` i temafilen, kør build |
| Ny MEP-data | Erstat `meps_clean.json` + evt. `mep_*.json`, kør build |
