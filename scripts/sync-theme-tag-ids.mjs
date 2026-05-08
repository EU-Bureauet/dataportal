/**
 * Sync WordPress tag IDs into data/themes/*.json at build time.
 *
 * Each theme JSON has `articleFilter.tags` (human-readable tag names) and
 * `articleFilter.tagIds` (the numeric IDs the WP REST API needs to filter
 * posts by tag). This script looks up the current ID for each tag name and
 * rewrites `tagIds` if anything has changed — so if a WP admin deletes and
 * recreates a tag (changing its ID), a redeploy is enough to align again.
 *
 * Failure mode: if WordPress is unreachable, the script logs a warning and
 * exits 0 — leaving the existing `tagIds` untouched so the build can still
 * succeed offline.
 *
 * Run as: node scripts/sync-theme-tag-ids.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(__dirname, "..", "data", "themes");
const WP_BASE = "https://www.eubureauet.dk";
const TAGS_URL = `${WP_BASE}/wp-json/wp/v2/tags`;

/** Fetch every tag from WP, paginating until exhausted. */
async function fetchAllTags() {
  const out = [];
  let page = 1;
  // Hard upper bound to avoid runaway loops if the API misbehaves.
  const maxPages = 50;
  while (page <= maxPages) {
    const url = `${TAGS_URL}?per_page=100&page=${page}`;
    const res = await fetch(url);
    // WP returns 400 once `page` exceeds totalPages — treat as end of list.
    if (res.status === 400) break;
    if (!res.ok) throw new Error(`WP tags ${res.status}: ${res.statusText}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }
  return out;
}

/** Build a name → id lookup. Names are matched case-insensitively. If a name
 * collides across multiple tags, the smallest (oldest) ID wins so we get
 * deterministic behaviour without needing slug hints in the theme JSON. */
function buildNameIndex(tags) {
  const byName = new Map();
  for (const t of tags) {
    const key = (t.name || "").toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (existing === undefined || t.id < existing) {
      byName.set(key, t.id);
    }
  }
  return byName;
}

/** Resolve the tag IDs for a single theme file. Returns null when any of
 * the listed tag names cannot be found in the WP index, so the caller can
 * skip the file and leave the existing IDs untouched. */
function resolveTagIds(filter, index, file) {
  const resolvedIds = [];
  const missing = [];
  for (const name of filter.tags) {
    const id = index.get(String(name).toLowerCase());
    if (typeof id === "number") {
      resolvedIds.push(id);
    } else {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    const quoted = missing.map((n) => `"${n}"`).join(", ");
    console.warn(`  ⚠ ${file}: no WP tag found for ${quoted} — keeping existing tagIds`);
    return null;
  }
  return resolvedIds;
}

function syncThemeFile(file, index) {
  const path = join(THEMES_DIR, file);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path joined from constant dir + filename listed by readdir
  const raw = readFileSync(path, "utf-8");
  const data = JSON.parse(raw);
  const filter = data.articleFilter;
  if (!filter || !Array.isArray(filter.tags) || filter.tags.length === 0) return false;

  const resolvedIds = resolveTagIds(filter, index, file);
  if (resolvedIds === null) return false;

  const current = Array.isArray(filter.tagIds) ? filter.tagIds : [];
  const same =
    current.length === resolvedIds.length &&
    current.every((v, i) => v === resolvedIds[i]);
  if (same) return false;

  filter.tagIds = resolvedIds;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- see above
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`  ↻ ${file}: tagIds ${JSON.stringify(current)} → ${JSON.stringify(resolvedIds)}`);
  return true;
}

function main() {
  const themeFiles = readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  if (themeFiles.length === 0) {
    console.log("No theme JSON files found — nothing to sync.");
    return;
  }

  fetchAllTags()
    .then((tags) => {
      const index = buildNameIndex(tags);
      console.log(`✓ Fetched ${tags.length} WP tags`);

      let changed = 0;
      for (const file of themeFiles) {
        if (syncThemeFile(file, index)) changed++;
      }

      if (changed === 0) {
        console.log("→ All theme tagIds already up to date");
      } else {
        console.log(`→ Updated ${changed} theme file(s)`);
      }
    })
    .catch((err) => {
      console.warn(`⚠ Could not sync theme tag IDs: ${err.message}`);
      console.warn("  Continuing build with existing tagIds in theme JSON files.");
      // Exit 0 so a transient WP outage doesn't block deploys.
    });
}

main();
