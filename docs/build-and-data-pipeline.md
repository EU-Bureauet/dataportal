# Build-proces og datapipeline

## Oversigt

Dataportal er et statisk genereret Next.js site. Det meste data leveres som statiske JSON-filer i `data/`-mappen, mens **artikler hentes runtime** direkte fra WordPress REST API'et:

1. **Pre-computed analytics** — statiske JSON-filer genereret eksternt fra EU-Parlamentets data
2. **Tema-datasæt** — statiske `theme_votes_*.json` med tema-specifikke afstemninger og koalitionsgrupperinger i `All_*` filerne
3. **WordPress-artikler** — hentes runtime via WordPress REST API med `tagIds`-filter (lazy loading)
4. **Tema-konfiguration** — manuelt vedligeholdte JSON-filer (`data/themes/*.json`); build-scriptet synkroniserer kun tag-ID'erne

---

## Build-kommandoer

```bash
npm run build              # Fuld pipeline: prebuild → next build → statisk /out
npm run dev                # Lokal udvikling med Turbopack
npm run lint               # ESLint + TypeScript check
npm test                   # Vitest: 147 tests (data-integritet + unit)
npm run sync-theme-tag-ids # Manuel synk af WordPress tag-ID'er ind i themes/*.json
```

### Build-pipeline

```
npm run build
  │
  ├─ 1. prebuild (automatisk via npm lifecycle)
  │     └─ node scripts/sync-theme-tag-ids.mjs
  │         ├─ Henter alle tags fra WordPress REST API (/wp/v2/tags)
  │         ├─ Slår hvert temas konfigurerede tag-navn op og opdaterer
  │         │   `articleFilter.tagIds` i data/themes/<slug>.json
  │         └─ Ved fejl: logger advarsel og forsætter (build blokeres ikke)
  │
  └─ 2. next build
        ├─ Læser data/themes/*.json → genererer /tema/energi, /tema/forsvar, /tema/miljoe
        ├─ Statisk genererer alle sider til /out
        └─ Kopierer data/*.json til /out/data/ (tilgængelig som statiske filer)
```

---

## WordPress artikel-pipeline (runtime)

Artikler er **ikke** længere bagt ind i en statisk `articles.json`. I stedet henter `<ThemeArticles>`-komponenten direkte fra WordPress REST API'et i browseren, når en bruger åbner en tema-side.

### Build-tid: tag-ID synkronisering

Da WordPress REST API'et filtrerer på numeriske tag-ID'er (ikke navne), kører `scripts/sync-theme-tag-ids.mjs` automatisk før hvert build og opdaterer `articleFilter.tagIds` i hvert tema-konfigurations-JSON, baseret på de læsbare tag-navne. Det betyder:

- Redaktøren konfigurerer kun et tag-navn i `data/themes/<slug>.json`.
- Et redeploy hæfter de aktuelle tag-ID'er ind i konfigurationen.
- Hvis WordPress er nede ved build-tid, beholdes de tidligere `tagIds` (build blokeres ikke).

### Runtime: lazy fetching fra browser

`components/theme-articles.tsx` bruger SWR til at hente artikler når tema-siden mountes:

```
User åbner /tema/energi
  → React mounter <ThemeArticles filter={...} />
  → SWR fetch GET https://www.eubureauet.dk/wp-json/wp/v2/posts
        ?tags=110              ← fra articleFilter.tagIds
        &per_page=6            ← fra articleFilter.maxArticles
        &_embed                ← inkluderer featured image og terms
  → Mens svaret kommer: spinner + "Henter artikler…"
  → Render artikelkort med titel, excerpt, image, link
  → Ved fejl: "Kunne ikke hente artikler lige nu."
```

Fordele ved at flytte artiklerne til runtime:

- Friske artikler uden redeploy når WordPress publicerer/opdaterer.
- Mindre statisk bundle (`articles.json` ligger ikke i `/out/data/`).
- Lazy loading: kun temasider rammer WordPress, og kun når de besøges.

### Hvordan tags styrer hvilke artikler der vises

Hvert tema-JSON definerer:

```json
{
  "articleFilter": {
    "tags": ["Energi- og industritema"],   // læsbart navn (kilde til ID-opslag)
    "tagIds": [110],                        // synkroniseret automatisk ved build
    "maxArticles": 6
  }
}
```

WordPress sender kun artikler tagged med et af `tagIds`. Hvis listen er tom (ukonfigureret tema, eller WordPress var nede ved første build), springes fetch helt over og sektionen er tom.

---

## Datfiler i `/data`

### Pre-computed analytics

Disse filer genereres eksternt (ikke af denne app) og skal opdateres manuelt eller via en ekstern pipeline:

| Fil | Indhold | Struktur |
|-----|---------|----------|
| `All_Winning_coalitions.json` | Vindende koalitioner per udvalg + per tema | `{ TOTAL: { total_coalitions: [...] }, ITRE: [...], theme_<key>: [...], ... }` |
| `All_Pairwise_coalitions.json` | Pairwise gruppeenighed per udvalg + per tema | `{ TOTAL: [...], ITRE: [...], theme_<key>: [...], ... }` |
| `All_Group_wins.json` | Gruppesejre per udvalg + per tema | `{ TOTAL: { total_group_wins: [...] }, ITRE: [...], theme_<key>: [...], ... }` |
| `latest_votes.json` | Seneste afstemninger med metadata | `{ metadata: {...}, committees: [...], eurovoc: [...], documents: [...] }` |
| `theme_votes_forsvar_sikkerhed.json` | Afstemninger der hører til forsvars-temaet | Samme dokument-shape som `latest_votes.json` + `metadata.theme*` felter |
| `theme_votes_energi_industri.json` | Afstemninger der hører til energi-temaet | Samme dokument-shape som `latest_votes.json` + `metadata.theme*` felter |
| `theme_votes_miljo_sundhed.json` | Afstemninger der hører til miljø-temaet | Samme dokument-shape som `latest_votes.json` + `metadata.theme*` felter |
| `meps_clean.json` | Alle 720 MEP'er | `{ meps: [...] }` |
| `Danske_MEPs_brud_med_partigruppelinjen.json` | Danske MEP-brud med partigruppen | `{ mep_vs_party: { disagreements: [...] } }` |
| `national_party_disagreements.json` | Nationale partiers interne uenigheder | `{ metadata: {...}, parties: {...} }` |
| `vote_details_*.json` | Detaljeret afstemningsbreakdown | Per afstemning: grupper, lande, MEP-stemmer |
| `mep_*.json` | Individual MEP afstemningsdata | Per MEP: info + vote IDs |

Nøglen `theme_<key>` (fx `theme_forsvar_sikkerhed`) er den samme på tværs af de tre `All_*` filer og matcher `metadata.theme` i den tilsvarende `theme_votes_*.json`. Se [architecture.md](architecture.md#tema-data-og-krydsreferencer) for krydsreference-diagram.

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

Chart-komponenter henter data **efter** side-render via SWR. Der er to kilder:

**1. Statiske JSON-filer fra samme origin** (alt analyse-data):

```
Browser loads static HTML
  → React hydrates
  → useSWR fetches /dataportal/data/All_Group_wins.json
  → Pure transforms (lib/data-transforms.ts) processerer rådata
  → Chart renderes med Recharts / D3 / Chart.js
```

Alle JSON-filer kopieres til `/out/data/` ved build og serveres som statiske filer af Nginx.

**2. WordPress REST API direkte fra browseren** (kun artikler på tema-sider):

```
Tema-side mountes
  → useSWR fetches https://www.eubureauet.dk/wp-json/wp/v2/posts?tags=<id>&per_page=<n>&_embed
  → Mens svaret kommer: spinner-state
  → Render artikelkort
```

Kun tema-sider hitter WordPress — alle andre sider er fuldstændig statiske og fungerer offline mod /data/.

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
| Nye artikler fra WordPress | Ingen handling — hentes runtime næste gang en bruger åbner en tema-side |
| Tag-navn ændret/oprettet i WordPress | Kør `npm run build` (prebuild synkroniserer `tagIds` automatisk) |
| Nye afstemningsdata | Erstat relevante JSON-filer i `data/`, kør `npm run build` |
| Nyt tema | Opret `data/themes/{slug}.json` + tilføj `theme_votes_<key>.json` og `theme_<key>` nøgler i de tre `All_*` filer, kør build (se [theme-admin-guide.md](theme-admin-guide.md)) |
| Skjul et tema | Sæt `"published": false` i temafilen, kør build |
| Ny MEP-data | Erstat `meps_clean.json` + evt. `mep_*.json`, kør build |
