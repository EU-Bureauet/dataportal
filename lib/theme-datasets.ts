/**
 * Shared mapping from URL params (`search` + `eurovoc`) to the curated
 * per-theme votes dataset. Used by both:
 *   - app/latest-votes/page.tsx (swap primary dataset)
 *   - components/danish-mep-votes-chart.tsx (filter brud-records by theme)
 *
 * Keys are `"<search>|<eurovoc>"` (lower-cased) and must match the `href`
 * query parameters defined on the corresponding theme JSON's
 * "Danske MEP'er" / "Liste over afstemninger" visualisation card.
 */
export interface ThemeDatasetEntry {
  /** File name in /public/data/ (or copied data/ folder). */
  file: string;
  /** Human-readable theme label (Danish). */
  label: string;
}

export const THEME_DATASETS: Record<string, ThemeDatasetEntry> = {
  "forsvar|forsvarspolitik": {
    file: "theme_votes_forsvar_sikkerhed.json",
    label: "Forsvar og sikkerhed",
  },
  "milj\u00f8|milj\u00f8politik": {
    file: "theme_votes_miljo_sundhed.json",
    label: "Milj\u00f8 og sundhed",
  },
  "energi|energipolitik": {
    file: "theme_votes_energi_industri.json",
    label: "Energi og industri",
  },
};

export function matchThemeDataset(
  search: string | null | undefined,
  eurovoc: string | null | undefined,
): ThemeDatasetEntry | null {
  if (!search || !eurovoc) return null;
  return THEME_DATASETS[`${search.toLowerCase()}|${eurovoc.toLowerCase()}`] ?? null;
}
