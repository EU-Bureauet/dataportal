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
│   ├── All_Winning_coalitions.json
│   ├── All_Pairwise_coalitions.json
│   ├── All_Group_wins.json
│   ├── latest_votes.json
│   ├── meps_clean.json
│   ├── articles.json       # Genereret fra WordPress
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
│   └── fetch-articles.mjs  # WordPress → articles.json
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
| `/winning-coalitions` | `CoalitionsSunburst` | `All_Winning_coalitions.json` |
| `/group-wins` | `GroupWinsChart` | `All_Group_wins.json` |
| `/latest-votes` | Vote-liste + filtre | `latest_votes.json` |
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

## Test

```bash
npm test          # Kør alle tests
npm run test:watch # Watch-mode
npm run lint      # ESLint + TypeScript check
```

**34 unit tests** verificerer pure transformationsfunktioner.
**74 integrationstests** indlæser de faktiske JSON-filer og validerer:
- Datastruktur og påkrævede felter
- Numeriske invarianter (procenter 0–100, summer, symmetri)
- Kryds-datasæt konsistens (gruppe-ID'er matcher på tværs af filer)
- At transformationer producerer korrekt output fra rådata

---

## Build og deployment

Se [build-and-data-pipeline.md](build-and-data-pipeline.md) for detaljer om build-processen.

```bash
npm run build     # Kører prebuild (fetch articles) → next build → static /out
```
