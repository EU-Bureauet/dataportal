# Dataportal – Applikationsarkitektur

## Overblik

Dataportal er en **Next.js 15** applikation der bygges som et statisk site (`output: "export"`) og serveres bag Nginx. Den visualiserer data om EU-Parlamentets afstemninger, koalitioner og danske MEP'er.

### Teknologistak

| Lag | Teknologi |
|-----|-----------|
| Framework | Next.js 15 (App Router, static export) |
| Sprog | TypeScript |
| Styling | Tailwind CSS 4 |
| Visualisering | Recharts, D3.js, Chart.js |
| Datafetching (klient) | SWR |
| Linting | ESLint 9 (flat config) + sonarjs + security |
| Test | Vitest |
| Container | Podman/Docker via Containerfile + Nginx |

---

## Mappestruktur

```
dataportal/
├── app/                    # Next.js App Router sider
│   ├── layout.tsx          # Rod-layout (NavigationHeader + Footer)
│   ├── page.tsx            # Landingsside
│   ├── tema/[slug]/        # Tema-sider (dynamisk, statisk genereret)
│   ├── heatmap/            # Pairwise agreement heatmap
│   ├── winning-coalitions/ # Koalitions-sunburst
│   ├── group-wins/         # Gruppesejr-oversigt
│   ├── latest-votes/       # Seneste afstemninger
│   ├── meps/               # MEP-oversigt
│   ├── mep/                # Enkelt MEP-detaljer
│   ├── vote/               # Enkelt afstemning
│   ├── compare-meps/       # Sammenlign to MEP'er
│   ├── compare-groups/     # Sammenlign to grupper
│   └── ...
├── components/             # React-komponenter
│   ├── coalitions-sunburst.tsx
│   ├── frequent-coalitions-bar-chart.tsx
│   ├── winning-coalition-column-chart.tsx
│   ├── heatmap-grid.tsx
│   ├── group-wins-chart.tsx
│   ├── vote-details-view.tsx
│   ├── theme-articles.tsx
│   ├── theme-coalitions.tsx
│   ├── parliament-hemicycle.tsx
│   ├── navigation-header.tsx
│   ├── footer.tsx
│   └── ui/                 # Shadcn-baserede UI-primitiver
├── data/                   # JSON-datafiler (kopieres til public/data ved build)
│   ├── All_Winning_coalitions.json   # Vindende koalitioner (TOTAL, per udvalg, per tema)
│   ├── All_Pairwise_coalitions.json  # Pairwise enighed (TOTAL, per udvalg, per tema)
│   ├── All_Group_wins.json           # Gruppesejre (TOTAL, per udvalg, per tema)
│   ├── latest_votes.json             # Alle afstemninger (bruges på /latest-votes)
│   ├── theme_votes_forsvar_sikkerhed.json   # Tema-afstemninger: Forsvar og sikkerhed
│   ├── theme_votes_energi_industri.json     # Tema-afstemninger: Energi og industri
│   ├── theme_votes_miljo_sundhed.json       # Tema-afstemninger: Miljø og sundhed
│   ├── meps_clean.json
│   ├── group-tooltips.json
│   ├── committee_and_group_names.json
│   └── themes/             # Tema-konfigurationsfiler
│       ├── energi.json
│       ├── forsvar.json
│       └── miljoe.json
├── lib/                    # Delte utility-funktioner
│   ├── data-transforms.ts  # Pure transformations (testbare)
│   ├── group-colors.ts     # Politiske gruppefarver
│   └── vote-comparison.ts  # MEP/gruppe-sammenligning
├── types/                  # TypeScript interfaces + transforms
├── scripts/                # Build-time scripts
│   └── sync-theme-tag-ids.mjs  # Henter WordPress tag-ID'er ind i themes/*.json
├── __tests__/              # Vitest testsuiter
│   ├── data-transforms.test.ts   # Pure funktions-tests
│   └── data-integrity.test.ts    # Data-validering mod JSON
└── docs/                   # Dokumentation
```

---

## Sider og komponenter

### Rod-layout (`app/layout.tsx`)

Alle sider deler dette layout:

```
<html>
  <body>
    <NavigationHeader />    ← Sticky topnavigation
    <main>{children}</main> ← Sideindhold
    <Footer />              ← Bundtekst
  </body>
</html>
```

### Landingsside (`app/page.tsx`)

- `NewsCarousel` — seneste artikler fra RSS-feed
- `ThemeExplorationCards` — kort til hvert publiceret tema
- Feature-kort til visualiseringssider

### Tema-sider (`app/tema/[slug]/page.tsx`)

Server Component der statisk genererer en side per publiceret tema. Se [theme-admin-guide.md](theme-admin-guide.md) for konfiguration.

### Feature-sider

Hver feature-side renderer ét eller flere diagramkomponenter med data fra JSON-filer i `/data/`:

| Side | Hovedkomponent | Datafil(er) |
|------|----------------|-------------|
| `/heatmap` | `HeatmapGrid` | `All_Pairwise_coalitions.json` |
| `/heatmap?theme=<key>` | `HeatmapGrid` (tema-tilstand, udvalgsvælger skjult) | `All_Pairwise_coalitions.json[theme_<key>]` |
| `/winning-coalitions` | `CoalitionsSunburst` | `All_Winning_coalitions.json` |
| `/group-wins` | `GroupWinsChart` | `All_Group_wins.json` |
| `/latest-votes` | Vote-liste + filtre | `latest_votes.json` |
| `/latest-votes?search=<x>&eurovoc=<y>` | Vote-liste + filtre (tema-tilstand) | `theme_votes_<tema>.json` |
| `/meps` | `MEPsOverview` | `meps_clean.json` |
| `/mep?id=X` | `MEPDetailView` | `mep_*.json` |
| `/vote?id=X` | `VoteDetailsView` | `vote_details_*.json` |
| `/mep-disagreements` | `MEPDisagreementsView` | `Danske_MEPs_brud_*.json` |
| `/theme-winning-coalitions` | `WinningCoalitionColumnChart` + `FrequentCoalitionsBarChart` | `All_Group_wins.json`, `All_Winning_coalitions.json` |

---

## Dataflow

### Klient-side fetching (SWR)

Chart-komponenter henter JSON-data via `useSWR` efter side-hydration:

```tsx
const { data } = useSWR<GroupWinsFile>(
  `${basePath}/data/All_Group_wins.json`,
  fetcher
);
```

`basePath` sættes fra `NEXT_PUBLIC_BASEPATH` environment-variabel.

### Pure transformationsfunktioner (`lib/data-transforms.ts`)

Alle beregninger der konverterer rådata til visningsdata er ekstraheret som pure functions, som kan unit-testes uafhængigt af React:

- `buildMatrixFromPairwise()` — 8×8 agreement-matrix
- `getHeatmapColor()` — farve for en procent-værdi
- `categorizeCoalition()` — Dominant/Common/Uncommon/Rare
- `coalitionKey()` — kanonisk nøgle for en koalition
- `getMajorityLabel()` — dansk flertals-label
- `normalizeVoteLabel()` — normalisér "For"/"+"/"-" etc.
- `computeGroupWinStats()` — højeste, laveste, gennemsnit

### Referencefiler

- `group-tooltips.json` — politiske gruppebeskrivelser, farver, sædeorden
- `committee_and_group_names.json` — opslag: udvalgskoder → danske navne

---

## Tema-data og krydsreferencer

Hvert tema har både en lille **konfigurationsfil** under `data/themes/<slug>.json` (titel, hero-billede, WordPress-tag-IDs, visualiseringskort) **og** en stor **dataset-fil** `data/theme_votes_<theme_key>.json`, der indeholder kun de afstemninger, der hører til temaet.

Dataset-filen følger samme dokumentstruktur som `latest_votes.json`, men beriget med `metadata.theme`, `metadata.theme_label`, `metadata.theme_definition` og `metadata.theme_description`. Derudover indeholder de tre store koalitions-/sejrs-filer en særskilt nøgle per tema, så de eksisterende heatmap- og koalitionskomponenter kan genbruges direkte:

| Tema-slug | `data/themes/<slug>.json` | `theme_votes_<key>.json` | Nøgle i `All_*` filerne |
|-----------|--------------------------|--------------------------|--------------------------|
| `forsvar` | `forsvar.json` | `theme_votes_forsvar_sikkerhed.json` | `theme_forsvar_sikkerhed` |
| `energi`  | `energi.json`  | `theme_votes_energi_industri.json`   | `theme_energi_industri`   |
| `miljoe`  | `miljoe.json`  | `theme_votes_miljo_sundhed.json`     | `theme_miljo_sundhed`     |

### Hvordan datafilerne refererer hinanden

```
data/themes/<slug>.json
  │
  ├── articleFilter.tagIds  → WordPress REST API (henter artikler runtime)
  │
  └── visualisations[].href
        ├─ /latest-votes?search=&eurovoc=    → slår tema-dataset op via search|eurovoc-key
        │                                       └─ indlæser theme_votes_<key>.json
        ├─ /heatmap?theme=<theme_<key>>      → indlæser All_Pairwise_coalitions.json[theme_<key>]
        ├─ /danish-mep-votes?search=&eurovoc= → deep-link videre til /latest-votes (tema-tilstand)
        └─ /theme-winning-coalitions?committee=&theme=
              └─ indlæser All_Group_wins.json + All_Winning_coalitions.json

theme_votes_<key>.json (donut på /tema/<slug>)
  └── documents[].document_reference → deep-link til /latest-votes?...&doc=<reference>
        (latest-votes-siden ruller automatisk til og udfolder det specifikke dokument)

Danske_MEPs_brud_med_partigruppelinjen.json
  └── disagreements[]."Vote ID" ↔ theme_votes_<key>.json: documents[].votes[].vote_id
        (så ?mep=<navn>&search=<tema>&eurovoc=<…> filtrerer til MEP'ens brud inden for temaet)
```

Nøglen `theme_<key>` (fx `theme_forsvar_sikkerhed`) er den samme i alle tre `All_*` filer og i `theme_votes_*.json` (`metadata.theme`), så nye temaer kun kræver konsistente nøgler i de fire datafiler plus en konfigurationsfil under `data/themes/`.

### Heatmap i tema-tilstand

Når `/heatmap` modtager `?theme=theme_<key>`, slår siden den nøgle op direkte i `All_Pairwise_coalitions.json` og skjuler udvalgsvælgeren — brugeren kan ikke skifte til et udvalg, mens et tema er aktivt. Tema-nøgler ekskluderes også fra udvalgs-dropdownen i normal tilstand.

### Latest-votes i tema-tilstand

Når `/latest-votes` modtager `?search=<x>&eurovoc=<y>` og kombinationen matcher en tema-mapping (`THEME_DATASETS` i [app/latest-votes/page.tsx](../app/latest-votes/page.tsx)), swapper SWR datasettet fra `latest_votes.json` til `theme_votes_<key>.json`. Øvrige filtre (`Udvalg`, `Emneord`, `?mep=`, `?doc=`) kører uforændret oven på det indlæste dataset, så tile-tællinger og filtrering er identiske med normal tilstand.

---

## Test

```bash
npm test          # Kør alle tests
npm run test:watch # Watch-mode
npm run lint      # ESLint + TypeScript check
```

**34 unit tests** verificerer pure transformationsfunktioner.
**113 integrationstests** indlæser de faktiske JSON-filer og validerer:
- Datastruktur og påkrævede felter
- Numeriske invarianter (procenter 0–100, summer, symmetri)
- Kryds-datasæt konsistens (gruppe-ID'er matcher på tværs af filer)
- At transformationer producerer korrekt output fra rådata
- At hver `theme_votes_*.json` har korrekt struktur, og at de præcomputerede tile-tællinger (`committees[]`, `eurovoc[]`) matcher de faktiske dokumenter
- At hver tema-nøgle (`theme_<key>`) findes i `All_Pairwise_coalitions.json`, `All_Group_wins.json` og `All_Winning_coalitions.json` med valide records
- At tema-vote-IDs overlapper med MEP-disagreement-datasettet, så deep-links fra `/danish-mep-votes` ikke giver tomme lister

---

## Build og deployment

Se [build-and-data-pipeline.md](build-and-data-pipeline.md) for detaljer om build-processen.

```bash
npm run build     # Kører prebuild (sync-theme-tag-ids) → next build → static /out
```
