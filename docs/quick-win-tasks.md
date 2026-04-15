# Quick Win Tasks

Implementation tasks derived from the [quality review](quality-review.md), section 7.
Each task is self-contained and can be completed independently.

---

## Task 1 — Change HTML lang to Danish

- [ ] Done

**File:** `app/layout.tsx`

**Current code (line 33):**
```tsx
<html lang="en" className="overflow-x-hidden">
```

**Change to:**
```tsx
<html lang="da" className="overflow-x-hidden">
```

**Why:** The entire site is in Danish. `lang="en"` breaks screen-reader pronunciation and browser translation prompts.

**Validation:** Inspect rendered HTML in the browser — `<html lang="da">`.

---

## Task 2 — Add skip-to-content link and `id="main"`

- [ ] Done

**File:** `app/layout.tsx`

**Steps:**

1. Add `id="main"` to the existing `<main>` element (line 39):
   ```tsx
   <main id="main" className="flex-grow">
   ```

2. Add a visually-hidden skip link as the first child of `<body>`, before `<NavigationHeader />`:
   ```tsx
   <a
     href="#main"
     className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-blue-700 focus:underline"
   >
     Spring til indhold
   </a>
   ```

**Why:** Keyboard and screen-reader users currently must tab through the full navigation on every page load.

**Validation:** Press Tab on any page — the skip link should appear at the top-left. Pressing Enter should jump focus to `<main>`.

---

## Task 3 — Replace full D3 with `d3-selection`

- [ ] Done

**File:** `components/parliament-hemicycle.tsx`

**Steps:**

1. Install the focused sub-package:
   ```bash
   npm install d3-selection && npm install -D @types/d3-selection
   ```

2. Replace the import (line 4):
   ```tsx
   // Before
   import * as d3 from "d3";

   // After
   import { select } from "d3-selection";
   ```

3. Update the two call-sites that use `d3.select()`:
   - Line 243: `const svg = d3.select(svgRef.current);` → `const svg = select(svgRef.current);`
   - Line 266: `const svg = d3.select(svgRef.current);` → `const svg = select(svgRef.current);`

4. Uninstall the full d3 package if no other file imports it:
   ```bash
   grep -r "from ['\"]d3['\"]" components/ app/ lib/ --include='*.tsx' --include='*.ts'
   ```
   If no other matches, run `npm uninstall d3 @types/d3`.

**Why:** The full `d3` package is ~550 KB. Only `d3.select()` is used. `d3-selection` is ~17 KB.

**Validation:** Run `npm run build` — verify no `d3` import errors. Open the parliament hemicycle page and confirm the SVG renders correctly with tooltips.

---

## Task 4 — Add global SWRConfig

- [ ] Done

**File:** `app/layout.tsx`

**Steps:**

1. The root layout is a Server Component. SWRConfig requires `"use client"`, so create a small provider wrapper:

   Create `components/swr-provider.tsx`:
   ```tsx
   "use client"

   import { SWRConfig } from "swr";

   export function SWRProvider({ children }: { children: React.ReactNode }) {
     return (
       <SWRConfig
         value={{
           revalidateOnFocus: false,
           revalidateOnReconnect: false,
           dedupingInterval: 60_000,
         }}
       >
         {children}
       </SWRConfig>
     );
   }
   ```

2. In `app/layout.tsx`, import and wrap `{children}`:
   ```tsx
   import { SWRProvider } from "../components/swr-provider.tsx";
   // ...
   <main id="main" className="flex-grow">
     <SWRProvider>
       {children}
     </SWRProvider>
   </main>
   ```

**Why:** Every component currently uses SWR defaults (`revalidateOnFocus: true`, 2 s dedup window). Since all data is static JSON, re-fetching on tab-switch is pointless. A 60 s dedup window also prevents duplicate requests when multiple chart components request the same file.

**Validation:** Open a theme page, switch tabs, switch back — Network tab should show no new JSON requests.

---

## Task 5 — Create shared `safeFetcher`

- [ ] Done

**File:** New file `lib/fetcher.ts`, then update all files that define a local `fetcher`.

**Steps:**

1. Create `lib/fetcher.ts`:
   ```ts
   export async function fetcher<T>(url: string): Promise<T> {
     const res = await fetch(url);
     if (!res.ok) {
       throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
     }
     return res.json() as Promise<T>;
   }
   ```

2. In every file that defines a local fetcher, replace the local definition with an import. Files to update (16 occurrences):
   - `components/parliament-hemicycle.tsx` (line 37)
   - `components/danish-mep-votes-chart.tsx` (line 104)
   - `components/winning-coalition-column-chart.tsx` (line 33)
   - `components/frequent-coalitions-bar-chart.tsx` (line 36)
   - `components/theme-coalitions.tsx` (line 32)
   - `app/theme-winning-coalitions/page.tsx` (line 9)
   - `app/committee/page.tsx` (line 20)
   - `app/vote/page.tsx` (line 14)
   - `app/mep/page.tsx` (line 14)
   - `app/heatmap/page.tsx` (line 41)
   - `app/group-wins/page.tsx` (line 9)
   - `app/national-party-disagreements/page.tsx` (line 9)
   - `app/mep-disagreements/page.tsx` (line 9)
   - `app/meps/page.tsx` (line 11)
   - `app/compare-meps/page.tsx` (line 66)
   - `app/winning-coalitions/page.tsx` (line 9)

   For each file:
   - Remove the local `const fetcher = ...` definition.
   - Add `import { fetcher } from "@/lib/fetcher";` at the top.

   **Note:** Some files (e.g. `app/committee/page.tsx`, `app/vote/page.tsx`) define multi-line fetchers with extra logic beyond `res.json()`. Read each one first — only replace those that are plain `(url) => fetch(url).then(r => r.json())` wrappers. For the multi-line ones, keep the local definition but add the `response.ok` check.

**Why:** Eliminates 16 duplicated fetcher definitions and ensures every fetch checks `response.ok`, preventing silent 404s from being parsed as JSON.

**Validation:** Run `npm run build` and `npm run test` — no regressions. `grep -r "const fetcher" components/ app/` should only show files with custom fetcher logic.

---

## Task 6 — Add `aria-label` to chart containers

- [ ] Done

**Files to update:**

| Component | File | Outer wrapper | Suggested `aria-label` |
|-----------|------|---------------|----------------------|
| `VoteResultChart` | `components/vote-result-chart.tsx` | `<div className="relative">` (line 67) | `"Afstemningsresultat: {majorityPercentage}% stemte {majority.label.toLowerCase()}"` |
| `CoalitionsSunburst` | `components/coalitions-sunburst.tsx` | `<div className="space-y-6">` (line 54) | `"Fordeling af koalitionstyper i vindende koalitioner"` |
| `WinningCoalitionColumnChart` | `components/winning-coalition-column-chart.tsx` | `<div ref={containerRef} className="relative">` (line 102) | `"Søjlediagram: andel af vindende koalitioner per politisk gruppe"` |
| `FrequentCoalitionsBarChart` | `components/frequent-coalitions-bar-chart.tsx` | Outer `<div>` returned by the component | `"Søjlediagram: hyppigste vindende koalitioner"` |
| `GroupWinsChart` | `components/group-wins-chart.tsx` | Outer `<div className="space-y-6">` | `"Søjlediagram: antal sejre per politisk gruppe"` |
| `HeatmapGrid` | `components/heatmap-grid.tsx` | `<Card>` wrapping the grid (line 66 area) | `"Heatmap: stemmeoverensstemmelse mellem politiske grupper"` |
| `ParliamentHemicycle` | `components/parliament-hemicycle.tsx` | The `<svg>` element rendered via D3 / the ref wrapper | `"Europa-Parlamentets halvkreds med sædefordeling per politisk gruppe"` |

**Steps for each component:**

1. Find the outermost `<div>` (or `<svg>`) returned by the component.
2. Add `role="img"` and the `aria-label` attribute.

Example for `vote-result-chart.tsx`:
```tsx
// Before
<div className="relative">

// After
<div className="relative" role="img" aria-label={`Afstemningsresultat: ${majorityPercentage}% stemte ${majority.label.toLowerCase()}`}>
```

For `parliament-hemicycle.tsx`, add `role="img"` and `aria-label` to the `<svg>` wrapper `<div>` that wraps `svgRef`.

**Why:** Screen readers currently skip all chart content entirely. Adding `role="img"` + `aria-label` provides a text alternative.

**Validation:** Use browser DevTools Accessibility Inspector or a screen reader to verify each chart announces its description.

---

## Task 7 — Associate form labels with inputs

- [ ] Done

**Files:** `components/meps-overview.tsx`, `components/group-wins-chart.tsx`

### 7a — `meps-overview.tsx`

Three `<label>` + form control pairs need `htmlFor` / `id` associations:

1. **Group-by selector** (~line 173):
   ```tsx
   <label htmlFor="mep-group-by" className="block text-sm font-medium mb-2">Gruppér efter:</label>
   <select id="mep-group-by" ...>
   ```

2. **Filter selector** (~line 190):
   ```tsx
   <label htmlFor="mep-filter" className="block text-sm font-medium mb-2">Filtrer:</label>
   <select id="mep-filter" ...>
   ```

3. **Search input** (find the search `<input>` — add an `id` and link to its `<label>`):
   ```tsx
   <label htmlFor="mep-search" className="block text-sm font-medium mb-2">Søg:</label>
   <input id="mep-search" ...>
   ```
   If there is no `<label>` for the search input, add one (can be `sr-only` if the placeholder is sufficient visually).

### 7b — `group-wins-chart.tsx`

The committee selector (~line 52):
```tsx
<label htmlFor="group-wins-committee" className="block text-sm font-medium mb-2">Vælg udvalg:</label>
<select id="group-wins-committee" ...>
```

There are two identical selectors in this component (one for the empty-data branch, one for the data branch). Both need the same fix.

**Why:** Without `htmlFor`/`id`, clicking the label does not focus the associated control, and screen readers cannot link them.

**Validation:** Click on any `<label>` text — the corresponding input or select should receive focus.
