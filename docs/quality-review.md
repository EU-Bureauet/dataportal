# Quality Review — EU-Bureauet Dataportal

> Comprehensive quality audit covering Performance, Code Quality, Robustness, Accessibility, UX/UI Design, and Security.
> Each section lists findings by severity and ends with prioritised improvement suggestions.

---

## Table of Contents

1. [Performance](#1-performance)
2. [Code Quality](#2-code-quality)
3. [Robustness](#3-robustness)
4. [Accessibility](#4-accessibility)
5. [UX / UI Design](#5-ux--ui-design)
6. [Security](#6-security)
7. [High-Impact Improvement Roadmap](#7-high-impact-improvement-roadmap)

---

## 1. Performance

### 1.1 Bundle Size

| Severity | Finding | Location |
|----------|---------|----------|
| **Critical** | Full D3 import (`import * as d3 from "d3"` ~550 KB). Only `d3.select()` is used — `d3-selection` alone is ~50 KB. | `components/parliament-hemicycle.tsx:4` |
| **High** | Three charting libraries shipped simultaneously: D3 (full), Recharts (full), Chart.js. Combined adds 400–800 KB to the client bundle. | Multiple components |
| **Medium** | Full Recharts namespace import (`import * as RechartsPrimitive from "recharts"`) — tree-shaking may not eliminate unused modules. | `components/ui/chart.tsx:5` |
| **Low** | No bundle analyser configured. `@next/bundle-analyzer` would surface actual bundle composition. | `next.config.ts` |

### 1.2 Data Fetching

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | Multiple components fetch the same JSON URLs independently (`All_Group_wins.json`, `group-tooltips.json`, `committee_and_group_names.json`). No global `SWRConfig` deduplicates or throttles requests. | `winning-coalition-column-chart.tsx:41–43`, `frequent-coalitions-bar-chart.tsx:46–54` |
| **High** | Full JSON files (200–400 KB) loaded client-side even when only a committee subset is needed. Theme pages read `All_Pairwise_coalitions.json` client-side and filter in the browser. | `app/tema/[slug]/page.tsx`, chart components |
| **Medium** | No SWR global configuration – `revalidateOnFocus` defaults to `true`, causing unnecessary refetches on tab-switch for what is essentially static data. Only `theme-articles.tsx` overrides locally. | `app/layout.tsx` (missing `SWRConfig` wrapper) |

### 1.3 Image Optimisation

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `images.unoptimized: true` in Next config (required for static export). Raw `<img>` tags used throughout — no `srcset`, lazy-loading, or format negotiation. | `next.config.ts:10`, `hero-section.tsx`, `danish-mep-votes-chart.tsx`, `article-card.tsx` |

### 1.4 Rendering

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `coalitions-sunburst.tsx` — data categorisation maps run on every render; no `useMemo`. | `components/coalitions-sunburst.tsx:37–45` |
| **Medium** | `heatmap-grid.tsx` — min/max/average statistics computed on every render (not memoised). Matrix itself is correctly memoised. | `components/heatmap-grid.tsx:26–34` |
| **Low** | No `next/dynamic` or `React.lazy` used; all chart components are eagerly loaded. | All chart components |

### 1.5 Static Generation

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `generateStaticParams()` is only used on `/tema/[slug]`. Dynamic pages like `/mep`, `/vote`, `/committee` do not pre-render popular variants. | `app/tema/[slug]/page.tsx:178` |

### Recommended Improvements — Performance

1. **Replace `import * as d3` with `import { select } from "d3-selection"`** — immediate ~500 KB saving.
2. **Wrap `app/layout.tsx` in `<SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 60000 }}>`** — eliminates duplicate requests on static data.
3. **Pre-filter JSON at build time** — generate per-committee / per-theme slices so the client loads <50 KB instead of 200–400 KB.
4. **Evaluate charting library consolidation** — consider migrating all charts to Recharts (already broadly used) and dropping Chart.js. Use focused D3 sub-package if SVG work remains.
5. **Add `loading="lazy"` to `<img>` tags** below the fold.
6. **Memoise expensive computations** in `coalitions-sunburst.tsx` and `heatmap-grid.tsx`.

---

## 2. Code Quality

### 2.1 Single Responsibility Violations

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | `types/data.tsx` is 500+ lines mixing interfaces (~40 types), constants (`PARTY_COLORS`), and helper functions (`formatName`, `transformMEPData`, `getMEPAgreements`, `getAvailableCommittees`). | `types/data.tsx` |
| **Critical** | `danish-mep-votes-chart.tsx` is 700+ lines containing the main component plus 5 sub-components (`GroupBadge`, `LoyaltyBar`, `AllyBar`, `VoteRow`, `MEPDetailPanel`), 8 local interfaces, and a photo-URL helper. | `components/danish-mep-votes-chart.tsx` |
| **High** | `parliament-hemicycle.tsx` is 400+ lines with 160+ lines of pure seat-layout computation mixed with D3 rendering and React state. | `components/parliament-hemicycle.tsx` |
| **Medium** | `winning-coalition-column-chart.tsx` (280 lines) and `frequent-coalitions-bar-chart.tsx` (270 lines) each contain inline interface definitions and mixed layout/tooltip/data logic. | Chart components |

### 2.2 DRY Violations

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `GroupWin` interface defined in 3 places: `types/data.tsx`, `lib/data-transforms.ts`, and `winning-coalition-column-chart.tsx`. | Multiple files |
| **Medium** | Identical SWR + loading-spinner pattern duplicated across 8+ page/component files. Could be a custom `useDataFetch()` hook. | App pages and chart components |
| **Medium** | Multiple components redefine `MEPClean` and `Disagreement` interfaces. | Chart components, types files |

### 2.3 Module System Inconsistencies

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `require()` used inside a function (`getAvailableCommittees`) in a TypeScript codebase. Disabled via ESLint comment. | `types/data.tsx:430–432` |
| **Medium** | Theme JSON files hardcoded as static imports in `navigation-header.tsx`. Adding a new theme requires editing source code. | `components/navigation-header.tsx:5–7` |

### 2.4 Dead Code & Naming

| Severity | Finding | Location |
|----------|---------|----------|
| **Low** | `"UNKNOWN"` magic string used as membership key. Unclear intent. | `app/meps/page.tsx:49` |
| **Low** | Inconsistent data variable naming: `data`, `mepsRaw`, `winsData`, `coalData`. | Multiple components |
| **Low** | Some files import `React` unnecessarily (post-JSX-transform). | `components/mep-detail-view.tsx:3` |

### Recommended Improvements — Code Quality

1. **Split `types/data.tsx`** into `types/data.ts` (interfaces only), `lib/party-colors.ts`, and `lib/mep-transforms.ts`.
2. **Refactor `danish-mep-votes-chart.tsx`** into a `components/mep-votes/` folder with `GroupBadge`, `LoyaltyBar`, `VoteRow`, `MEPDetailPanel` as separate files.
3. **Extract seat-layout computation** from `parliament-hemicycle.tsx` to `lib/parliament-seat-layout.ts`.
4. **Consolidate `GroupWin` and other shared interfaces** to a single canonical location in `types/`.
5. **Create a custom `useStaticData(url)` hook** wrapping SWR with `revalidateOnFocus: false` and a standard loading/error pattern.
6. **Replace hardcoded theme imports** in `navigation-header.tsx` with a dynamic `getThemes()` lookup.

---

## 3. Robustness

### 3.1 Error Handling in Data Fetching

| Severity | Finding | Location |
|----------|---------|----------|
| **Critical** | `parliament-hemicycle.tsx` and `danish-mep-votes-chart.tsx` never destructure the `error` property from `useSWR`. A fetch failure renders as an empty page with no feedback. | `components/parliament-hemicycle.tsx:171–172`, `components/danish-mep-votes-chart.tsx` |
| **High** | `winning-coalition-column-chart.tsx` and `frequent-coalitions-bar-chart.tsx` check `if (!data)` to show a spinner but never distinguish between "loading" and "error". The user never learns that a request failed. | `components/winning-coalition-column-chart.tsx:41–54`, `components/frequent-coalitions-bar-chart.tsx:46–64` |
| **High** | `theme-winning-coalitions/page.tsx` uses `useSWR` for `namesData` without destructuring `error`. | `app/theme-winning-coalitions/page.tsx:16` |
| **Medium** | Fetcher functions (e.g. `(url: string) => fetch(url).then(r => r.json())`) do not check `response.ok`. A 404 response would be silently parsed as JSON, likely causing a runtime crash downstream. | Multiple components |

### 3.2 Missing Error Boundaries

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | No `ErrorBoundary` component exists anywhere in the codebase. A single component crash will take down the entire page. | Codebase-wide |

### 3.3 Runtime Safety

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `JSON.parse()` in `getThemeData()` is not wrapped in try-catch. Malformed JSON will crash the build. | `app/tema/[slug]/page.tsx:56` |
| **Medium** | `getMEPAgreements()` does not guard against a non-array `overlapData` argument. | `types/data.tsx:369–380` |
| **Medium** | `mep.family_name` used in a `.filter()` comparison without null check. An undefined `family_name` silently returns no results. | `components/danish-mep-votes-chart.tsx:465` |

### 3.4 Loading & Error State Coverage

| Component | Loading UI | Error UI |
|-----------|:----------:|:--------:|
| `WinningCoalitionColumnChart` | ✓ | ✗ |
| `FrequentCoalitionsBarChart` | ✓ | ✗ |
| `ParliamentHemicycle` | ✗ | ✗ |
| `DanishMEPVotesChart` | ✗ | ✗ |
| `GroupWinsChart` | ✓ | ✗ |
| `HeatmapGrid` | N/A (prop) | N/A |

### Recommended Improvements — Robustness

1. **Add an `ErrorBoundary` wrapper** around page content in `app/layout.tsx` — catches rendering crashes and shows a fallback UI.
2. **Create a shared `safeFetcher`** that checks `response.ok` and throws on non-2xx responses.
3. **Add `error` destructuring** to every `useSWR` call and render an error message when appropriate.
4. **Wrap `JSON.parse()` in try-catch** in `getThemeData()`.
5. **Add loading + error states** to `ParliamentHemicycle` and `DanishMEPVotesChart`.

---

## 4. Accessibility

### 4.1 Critical WCAG 2.1 Level AA Issues

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | HTML lang is `"en"` but the site content is entirely in Danish. Should be `lang="da"`. | `app/layout.tsx:31` |
| **High** | No skip-to-content link. Screen-reader and keyboard users must tab through the full navigation on every page. | `app/layout.tsx:29–40` |
| **High** | Heatmap cells convey agreement percentage through colour alone — no text, pattern, or aria-label. Screen readers announce nothing. | `components/heatmap-grid.tsx:97–107` |
| **High** | All chart components (`vote-result-chart`, `parliament-hemicycle`, `coalitions-sunburst`, `winning-coalition-column-chart`, `group-wins-chart`) lack `role="img"` and `aria-label`. Screen readers cannot access the data. | Multiple chart components |
| **High** | Toggle button uses `onClick` only — not keyboard-accessible (no `onKeyDown` handler for Space/Enter). | `components/toggle-button.tsx:13–28` |
| **High** | Search input in MEPs overview has a `<label>` without `htmlFor`, and the `<input>` has no `id`. Association is broken. | `components/meps-overview.tsx:145–153` |
| **High** | News carousel prev/next buttons lack arrow-key keyboard navigation. | `components/news-carousel.tsx:221–230` |

### 4.2 Medium Priority Issues

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Parliament hemicycle SVG has no `role="img"` or `aria-label`. Interactive tooltips only appear on mouse hover. | `components/parliament-hemicycle.tsx` |
| **Medium** | Mobile menu does not trap focus — tab can escape the open menu to content below. | `components/navigation-header.tsx:80` |
| **Medium** | No visible focus indicators on most interactive elements — hover effects only. | Codebase-wide |
| **Medium** | Tooltip interactions are mouse-only (`onMouseEnter`/`onMouseLeave`). Keyboard and touch users cannot access them. | `components/heatmap-grid.tsx:95–107` |
| **Medium** | Hero section: white text on gradient background — verify contrast ratio meets 4.5:1. | `components/hero-section.tsx:23–26` |
| **Medium** | No `prefers-reduced-motion` handling for animations or transitions. | Codebase-wide |
| **Medium** | `<select>` in group-wins chart has `<label>` without `for` attribute. | `components/group-wins-chart.tsx:41–50` |

### Recommended Improvements — Accessibility

1. **Change `lang="en"` to `lang="da"`** in `app/layout.tsx`.
2. **Add skip-to-content link** (`<a href="#main" className="sr-only focus:not-sr-only">Spring til indhold</a>`) and `id="main"` on the `<main>` element.
3. **Add `aria-label` to all chart containers** with a textual summary of what the chart shows (e.g. `aria-label="Heatmap: stemmeafstemningsoverensstemmelse mellem politiske grupper"`).
4. **Add `aria-label` to heatmap cells** with the percentage value.
5. **Associate form labels** — add `htmlFor` / `id` pairs on all `<label>` + `<input>` / `<select>` combinations.
6. **Implement keyboard handlers** on the toggle button and carousel navigation.
7. **Implement focus trap** for the mobile menu.
8. **Add focus-visible ring** styles globally (e.g. `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`).

---

## 5. UX / UI Design

### 5.1 Inconsistencies

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Card hover effects vary: `visualisation-card.tsx` uses `-translate-y-1` + custom shadow, `article-card.tsx` uses `shadow-lg`, `meps-overview.tsx` uses `shadow-md`. | Multiple card components |
| **Medium** | Button hover states vary: some use `scale-105`, others use background colour change. | Multiple components |
| **Medium** | Loading indicators are inconsistent — some components show a spinner, others load silently, and `news-carousel.tsx` returns `null` (shows nothing). | Multiple components |
| **Low** | Inline hardcoded colours (`#80d8a8`, `#adcdea`, `#3b82f6`) used in heatmap statistics instead of Tailwind classes. | `components/heatmap-grid.tsx:46–50` |

### 5.2 Empty States & Error Communication

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | `news-carousel.tsx` returns `null` if there are no articles — user sees a hole in the page. | `components/news-carousel.tsx:157–160` |
| **Medium** | `group-wins-chart.tsx` shows "Ingen data tilgængelig" but it is unclear whether data is loading or genuinely absent. | `components/group-wins-chart.tsx:32–43` |
| **Low** | `meps-overview.tsx` shows "Ingen medlemmer fundet med de valgte filtre" — good empty-state message. | `components/meps-overview.tsx:320–323` |

### 5.3 Responsive Design

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Heatmap cells are `w-20` with `overflow-x-auto`. On small screens the grid is hard to read even with horizontal scroll. | `components/heatmap-grid.tsx:66` |
| **Medium** | News carousel jumps from 1 column to 3 columns (`grid-cols-1 md:grid-cols-3`) with no 2-column intermediate. | `components/news-carousel.tsx:171` |
| **Low** | Hero section uses `h-64 sm:h-80 md:h-96` — on phones <375px this may be too tall. | `components/hero-section.tsx:8` |

### 5.4 Information Density

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Danish MEP votes chart expands accordion with extensive detail. First-time users face cognitive overload. Consider progressive disclosure. | `components/danish-mep-votes-chart.tsx:329+` |
| **Low** | Committee overview stacks multiple sections without clear visual breaks. | `components/committee-overview.tsx` |

### Recommended Improvements — UX / UI

1. **Standardise card and button hover effects** — define a shared set of Tailwind utilities (e.g. a `card-hover` class or shared component wrapper).
2. **Show consistent loading and error indicators** in every data-dependent component.
3. **Replace `null` returns** with "Ingen artikler tilgængelige" or similar message in `news-carousel.tsx`.
4. **Add a 2-column breakpoint** (e.g. `sm:grid-cols-2`) for the news carousel.
5. **Consider progressive disclosure** for dense visualisations — show summary first, expand on interaction.

---

## 6. Security

### 6.1 Missing Security Headers

| Severity | Finding | Location |
|----------|---------|----------|
| **Critical** | No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or Strict-Transport-Security headers configured. | `next.config.ts` |

> **Note:** Since the app uses `output: "export"` (static files), security headers must be configured in the serving layer (Nginx). See `nginx.conf`.

### 6.2 XSS Vectors

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | Regex-based HTML/XML parsing of RSS feed content. If feed content changes structure, extraction may fail or bypass. | `components/news-carousel.tsx:50–75`, `scripts/fetch-articles.mjs:98–127` |
| **Medium** | `innerHTML` used to decode HTML entities in `theme-articles.tsx`. Even though the input comes from a trusted WordPress API, this pattern is unsafe if the source is ever compromised. | `components/theme-articles.tsx:32` |

### 6.3 Input Validation

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Dynamic fetch URLs constructed from URL params (e.g. `mep_${mepId}.json`). `mepId` is URL-encoded but not validated as numeric. | `lib/vote-comparison.ts:26, 48` |
| **Medium** | Page query params (e.g. `?id=124875` on `/mep`) are not validated before use. Non-numeric IDs will produce a 404 silently. | `app/mep/page.tsx` |

### 6.4 Fetch Safety

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Fetcher functions do not check `response.ok`. A 404 response is silently passed to `.json()`, which may throw or return unexpected data. | Multiple components |

### 6.5 External Resources

| Severity | Finding | Location |
|----------|---------|----------|
| **Medium** | Remote image patterns allow full path wildcard (`pathname: '/**'`). Should be narrowed to expected upload paths. | `next.config.ts:7–15` |
| **Low** | No Subresource Integrity (SRI) on external CDN resources (Mermaid in `docs/diagrams.html`). | `docs/diagrams.html` |

### Recommended Improvements — Security

1. **Add security headers in `nginx.conf`**: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.
2. **Replace regex RSS parsing** with a proper XML parser (e.g. `fast-xml-parser` or `cheerio`).
3. **Replace `innerHTML` entity decoding** with `DOMParser` or `html-entities` library.
4. **Validate IDs** before constructing fetch URLs — `if (!/^\d+$/.test(id)) return null;`.
5. **Add `response.ok` check** to all fetch functions.
6. **Narrow remote image patterns** to expected paths (e.g. `/wp-content/uploads/**`).

---

## 7. High-Impact Improvement Roadmap

Improvements ranked by estimated effort vs. impact across all categories.

### Quick Wins (< 1 hour each, high impact)

| # | Improvement | Categories | Files |
|---|-------------|------------|-------|
| 1 | Change `lang="en"` → `lang="da"` | Accessibility | `app/layout.tsx` |
| 2 | Add skip-to-content link + `id="main"` | Accessibility | `app/layout.tsx` |
| 3 | Replace `import * as d3` with `import { select } from "d3-selection"` | Performance | `components/parliament-hemicycle.tsx` |
| 4 | Add global `SWRConfig` with `revalidateOnFocus: false` | Performance, Robustness | `app/layout.tsx` |
| 5 | Create `safeFetcher` that checks `response.ok` | Robustness, Security | New `lib/fetcher.ts` |
| 6 | Add `aria-label` attributes to chart containers | Accessibility | All chart components |
| 7 | Associate `<label>` elements with `htmlFor`/`id` | Accessibility | `meps-overview.tsx`, `group-wins-chart.tsx` |
| 8 | Add security headers in `nginx.conf` | Security | `nginx.conf` |

### Medium Effort (1–4 hours, high impact)

| # | Improvement | Categories | Files |
|---|-------------|------------|-------|
| 9 | Add `ErrorBoundary` wrapper + error state UI to all SWR-using components | Robustness | `app/layout.tsx`, chart components |
| 10 | Split `types/data.tsx` (interfaces / constants / helpers) | Code Quality | `types/data.tsx` → 3 files |
| 11 | Create custom `useStaticData()` hook | Code Quality, Robustness | New `lib/hooks/use-static-data.ts` |
| 12 | Standardise card/button hover effects | UX / UI | Card and button components |
| 13 | Replace `innerHTML` entity decoding + RSS regex parsing | Security | `theme-articles.tsx`, `news-carousel.tsx` |
| 14 | Add keyboard handlers to toggle button, carousel, and tooltips | Accessibility | `toggle-button.tsx`, `news-carousel.tsx`, `heatmap-grid.tsx` |
| 15 | Add focus-visible ring styles globally | Accessibility | `app/globals.css` |

### Larger Effort (4+ hours, strategic impact)

| # | Improvement | Categories | Files |
|---|-------------|------------|-------|
| 16 | Refactor `danish-mep-votes-chart.tsx` into `components/mep-votes/` folder | Code Quality | New folder + 5 files |
| 17 | Pre-filter JSON at build time into per-committee slices | Performance | Build scripts, data pipeline |
| 18 | Consolidate charting libraries (drop Chart.js, use Recharts + d3-selection) | Performance | `vote-result-chart.tsx`, other chart components |
| 19 | Extract seat-layout computation from parliament-hemicycle | Code Quality | New `lib/parliament-seat-layout.ts` |
| 20 | Implement `prefers-reduced-motion` handling + focus-trap for mobile menu | Accessibility | `navigation-header.tsx`, `globals.css` |

---

*Review generated from automated codebase audit. Findings validated against source code with file paths and line numbers. Severity ratings reflect OWASP, WCAG 2.1 AA, and software engineering best practices.*
