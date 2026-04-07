"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

// ─── Local photo helper ──────────────────────────────────────────────────────

const PHOTO_DIR = "/img/Danish_MEPs";

/** Map full_name (e.g. "Morten LØKKEGAARD") → local filename (e.g. "Morten Loekkegaard") */
function toLocalPhotoUrl(fullName: string, basePath: string): string {
  // Convert "Given SURNAME" → "Given Surname" (title case)
  const normalised = fullName
    .split(" ")
    .map((part) => {
      // Handle hyphenated names like PETER-HANSEN → Peter-Hansen
      return part
        .split("-")
        .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join("-");
    })
    .join(" ");

  // Replace Danish special chars with the ASCII variants used in the filenames
  const ascii = normalised
    .replace(/Ø/g, "Oe")
    .replace(/ø/g, "oe")
    .replace(/Æ/g, "Ae")
    .replace(/æ/g, "ae")
    .replace(/Å/g, "Aa")
    .replace(/å/g, "aa");

  return `${basePath}${PHOTO_DIR}/${encodeURIComponent(ascii)}.jpg`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MEPClean {
  mep_id: string;
  full_name: string;
  family_name: string;
  given_name: string;
  photo_url: string;
  country_code: string;
  national_party_id: { name: string; code: string };
  current_group_id: { name: string; code: string };
  n_votes: number;
  n_votes_with_group: number;
  n_votes_against_group: number;
  group_loyalty: number;
  participation_pct: number;
}

interface Disagreement {
  "Vote ID": string;
  "Vote Description": string;
  "Document Title": string;
  "Short Title": string;
  "Document Link": string;
  "MEP Name": string;
  "Vote Type": string;
  "Vote Type_Majority": string;
  "Group ID": string;
  "Group Majority Percentage": number;
  ECR: string;
  ESN: string;
  NI: string;
  PPE: string;
  PfE: string;
  Renew: string;
  "S&D": string;
  "The Left": string;
  "Verts/ALE": string;
}

interface LatestVotesDoc {
  short_title: string;
  eurovoc_keywords: string[];
  votes: { vote_id: number; vote_description: string }[];
}

interface AllyCount {
  group: string;
  count: number;
  pct: number;
}

interface MEPSummary {
  mep: MEPClean;
  totalDisagreements: number;
  filteredDisagreements: Disagreement[];
  topAllies: AllyCount[];
  topicVoteCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_CODES = ["ECR", "ESN", "NI", "PPE", "PfE", "Renew", "S&D", "The Left", "Verts/ALE"] as const;

const GROUP_COLORS: Record<string, string> = {
  ECR: "#0E4DA4",
  ESN: "#1B263B",
  NI: "#808080",
  PPE: "#003399",
  PfE: "#143862",
  Renew: "#FFD700",
  "S&D": "#E30613",
  "The Left": "#8B0000",
  "Verts/ALE": "#009A44",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Configurable UI labels ──────────────────────────────────────────────────
// Change these strings to update text across the entire component.

const LABELS = {
  /** Accordion header when expanded: {name} is replaced with the MEP's family name */
  accordionHeader: "↓ Brud med gruppen — hvem stemte {name} med?",
  /** Detail panel: how many breaks */
  breakCount: "{count} brud med partigruppen",
  /** Detail panel: ally chart heading */
  allyHeading: "Hvem stemmer {name} med ved brud?",
  /** Detail panel: vote list heading */
  voteListHeading: "Afstemninger hvor {name} brød med {group}",
  /** No breaks for this topic */
  noBreaks: "{fullName} har ingen brud med {group} inden for dette emne.",
} as const;

// ─── Group tooltip badge ─────────────────────────────────────────────────────

function GroupBadge({
  code,
  description,
  pill,
  children,
}: Readonly<{
  code: string;
  description?: string;
  pill?: boolean;
  children?: React.ReactNode;
}>) {
  const bg = GROUP_COLORS[code] ?? "#888";

  if (pill) {
    return (
      <span className="relative group/tip inline-flex">
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium text-white cursor-default"
          style={{ backgroundColor: bg }}
        >
          {children ?? code}
        </span>
        {description && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 text-xs leading-snug shadow-md opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150 z-50 text-center">
            <span className="font-semibold text-gray-900">{code}</span>: {description}
          </span>
        )}
      </span>
    );
  }

  // Inline text variant (used in AllyBar)
  return (
    <span className="relative group/tip inline-flex">
      <span
        className="text-xs w-20 text-right truncate font-medium cursor-default"
        style={{ color: bg }}
      >
        {code}
      </span>
      {description && (
        <span className="absolute bottom-full right-0 mb-2 w-56 px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 text-xs leading-snug shadow-md opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150 z-50">
          <span className="font-semibold text-gray-900">{code}</span>: {description}
        </span>
      )}
    </span>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LoyaltyBar({ against, total, participationPct }: Readonly<{ against: number; total: number; participationPct?: number }>) {
  // If we have participation data, scale the bar to include absent votes
  const hasAbsent = participationPct !== undefined && participationPct < 100;
  const absentPct = hasAbsent ? 100 - participationPct : 0;
  const activePct = 100 - absentPct;
  const loyalPct = total > 0 ? ((total - against) / total) * activePct : activePct;
  const againstPct = total > 0 ? (against / total) * activePct : 0;

  return (
    <div className="w-full">
      <div className="w-full h-4 rounded-full bg-gray-100 overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${loyalPct}%` }}
          title={`${loyalPct.toFixed(1)}% med gruppen`}
        />
        <div
          className="h-full bg-red-500 transition-all duration-500"
          style={{ width: `${againstPct}%` }}
          title={`${againstPct.toFixed(1)}% brud`}
        />
        {hasAbsent && (
          <div
            className="h-full bg-gray-300 transition-all duration-500"
            style={{ width: `${absentPct}%` }}
            title={`${absentPct.toFixed(1)}% fravær`}
          />
        )}
      </div>
      {/* Percentages aligned to bar segments */}
      <div className="flex text-xs mt-1">
        <span style={{ width: `${loyalPct}%` }} className="text-gray-600 truncate">{loyalPct.toFixed(1)}%</span>
        <span style={{ width: `${againstPct}%` }} className="text-gray-600 text-center truncate">{againstPct.toFixed(1)}%</span>
        {hasAbsent && (
          <span style={{ minWidth: '2.5rem' }} className="text-gray-400 text-right flex-shrink-0">{absentPct.toFixed(1)}%</span>
        )}
      </div>
      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Med gruppen</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Brud</span>
        {hasAbsent && (
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-300 inline-block" /> Fravær</span>
        )}
      </div>
    </div>
  );
}

function AllyBar({ allies, mepGroup, groupDescriptions }: { allies: AllyCount[]; mepGroup: string; groupDescriptions: Record<string, string> }) {
  if (allies.length === 0) return <p className="text-xs text-gray-400 italic">Ingen data</p>;
  const max = allies[0].count;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 mb-2">Stemmer oftest med (ved brud):</p>
      {allies.map((a) => (
        <div key={a.group} className="flex items-center gap-2">
          <GroupBadge code={a.group} description={groupDescriptions[a.group]} />
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(a.count / max) * 100}%`,
                backgroundColor: GROUP_COLORS[a.group] ?? "#888",
                opacity: a.group === mepGroup ? 0.3 : 0.8,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 w-16 text-right">
            {a.count} ({a.pct.toFixed(0)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function VoteRow({ d, groupCodes, groupDescriptions }: { d: Disagreement; groupCodes: readonly string[]; groupDescriptions: Record<string, string> }) {
  const mepVote = d["Vote Type"];
  const groupVote = d["Vote Type_Majority"];
  const voteLabel = (v: string) => v === "For" ? "For" : v === "Against" ? "Imod" : "Blank";
  const voteColor = (v: string) => v === "For" ? "text-emerald-700 bg-emerald-50" : v === "Against" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50";

  // Groups that voted the same as the MEP
  const sameAsMe = groupCodes.filter((gc) => {
    const val = d[gc as keyof Disagreement];
    return val === mepVote && gc !== d["Group ID"];
  });

  const title = d["Short Title"] !== "Ingen reference" ? d["Short Title"] : d["Document Title"];
  const hasLink = d["Document Link"] !== "Ingen reference";

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {hasLink ? (
              <a href={d["Document Link"]} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline inline-flex items-center gap-1">
                {title}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ) : (
              title
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{d["Vote Description"]}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${voteColor(mepVote)}`}>
            MEP: {voteLabel(mepVote)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${voteColor(groupVote)}`}>
            Gruppe: {voteLabel(groupVote)}
          </span>
        </div>
      </div>
      {sameAsMe.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs text-gray-400">Stemte ligesom MEP&apos;en:</span>
          {sameAsMe.map((gc) => (
            <GroupBadge key={gc} code={gc} description={groupDescriptions[gc]} pill />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail panel (drill-down for one MEP) ───────────────────────────────────

function MEPDetailPanel({
  summary,
  onClose,
  basePath,
  groupDescriptions,
}: {
  summary: MEPSummary;
  onClose: () => void;
  basePath: string;
  groupDescriptions: Record<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);
  const list = summary.filteredDisagreements;
  const visible = showAll ? list : list.slice(0, 8);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Tilbage til oversigten
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={toLocalPhotoUrl(summary.mep.full_name, basePath)}
          alt={summary.mep.full_name}
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
          }}
        />
        <div>
          <h3 className="text-xl font-bold text-gray-900">{summary.mep.full_name}</h3>
          <p className="text-sm text-gray-500">
            {summary.mep.national_party_id.name} ({summary.mep.national_party_id.code}) · {summary.mep.current_group_id.name}
          </p>
          <p className="text-sm text-red-600 font-medium mt-0.5">
            {LABELS.breakCount.replace("{count}", String(list.length))}{list.length !== summary.totalDisagreements ? ` (af ${summary.totalDisagreements} i alt)` : ""}
          </p>
        </div>
      </div>

      {/* Ally chart */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{LABELS.allyHeading.replace("{name}", summary.mep.family_name)}</h4>
        <AllyBar allies={summary.topAllies} mepGroup={summary.mep.current_group_id.code} groupDescriptions={groupDescriptions} />
      </div>

      {/* Vote list */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">{LABELS.voteListHeading.replace("{name}", summary.mep.family_name).replace("{group}", summary.mep.current_group_id.code)}</h4>
        <div className="divide-y divide-gray-100">
          {visible.map((d) => (
            <VoteRow key={`${d["Vote ID"]}-${d["Vote Description"]}`} d={d} groupCodes={GROUP_CODES} groupDescriptions={groupDescriptions} />
          ))}
        </div>
        {list.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            {showAll ? (
              <><ChevronUp className="w-4 h-4" /> Vis færre</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> Vis alle {list.length} afstemninger</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DanishMEPVotesChart() {
  const searchParams = useSearchParams();
  const searchFilter = searchParams.get("search") ?? undefined;
  const eurovocFilter = searchParams.get("eurovoc") ?? undefined;

  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: mepData } = useSWR<{ meps: MEPClean[] }>(`${basePath}/data/meps_clean.json`, fetcher);
  const { data: brudData } = useSWR<{ mep_vs_party: { disagreements: Disagreement[] } }>(
    `${basePath}/data/Danske_MEPs_brud_med_partigruppelinjen.json`,
    fetcher
  );
  const { data: latestVotes } = useSWR<{ documents: LatestVotesDoc[] }>(
    `${basePath}/data/latest_votes.json`,
    fetcher
  );
  const { data: tooltipData } = useSWR<{ groups: { code: string; description: string }[] }>(
    `${basePath}/data/group-tooltips.json`,
    fetcher
  );

  // Build group code → description map
  const groupDescriptions = useMemo(() => {
    const map: Record<string, string> = {};
    if (tooltipData) {
      for (const g of tooltipData.groups) map[g.code] = g.description;
    }
    return map;
  }, [tooltipData]);

  const [selectedMEP, setSelectedMEP] = useState<string | null>(null);
  const [expandedMEP, setExpandedMEP] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "participation" | "breaks">("breaks");

  // Build a map of vote_id → eurovoc keywords for topic filtering
  const voteTopicMap = useMemo(() => {
    if (!latestVotes) return null;
    const map = new Map<string, string[]>();
    for (const doc of latestVotes.documents) {
      for (const v of doc.votes) {
        map.set(String(v.vote_id), doc.eurovoc_keywords ?? []);
      }
    }
    return map;
  }, [latestVotes]);

  // Count total topic-relevant vote IDs (used for per-topic loyalty)
  const topicVoteIds = useMemo(() => {
    if (!voteTopicMap || (!searchFilter && !eurovocFilter)) return null;
    const ids = new Set<string>();
    for (const [vid, keywords] of voteTopicMap.entries()) {
      if (eurovocFilter && keywords.some((kw) => kw.toLowerCase() === eurovocFilter.toLowerCase())) {
        ids.add(vid);
        continue;
      }
      if (searchFilter) {
        const re = new RegExp(searchFilter.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if (keywords.some((kw) => re.test(kw))) {
          ids.add(vid);
        }
      }
    }
    return ids;
  }, [voteTopicMap, searchFilter, eurovocFilter]);

  // Build MEP summaries
  const summaries = useMemo((): MEPSummary[] => {
    if (!mepData || !brudData) return [];

    const dkMeps = mepData.meps.filter((m) => m.country_code.includes("DNK"));
    const allDisag = brudData.mep_vs_party.disagreements;

    return dkMeps.map((mep) => {
      const mepDisag = allDisag.filter((d) => d["MEP Name"] === mep.family_name);

      // Apply topic filter via search/eurovoc if provided
      let filtered = mepDisag;
      if ((searchFilter || eurovocFilter) && voteTopicMap) {
        filtered = mepDisag.filter((d) => {
          const keywords = voteTopicMap.get(d["Vote ID"]);
          if (!keywords) return false;
          if (eurovocFilter && keywords.some((kw) => kw.toLowerCase() === eurovocFilter.toLowerCase())) return true;
          if (searchFilter) {
            const re = new RegExp(searchFilter.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            const fields = [d["Short Title"], d["Document Title"], ...keywords];
            return fields.some((f) => re.test(f));
          }
          return false;
        });
      }

      // Compute allies when breaking ranks
      const allyMap: Record<string, number> = {};
      for (const d of filtered) {
        const mepVote = d["Vote Type"];
        for (const gc of GROUP_CODES) {
          if (gc === mep.current_group_id.code) continue;
          if (d[gc as keyof Disagreement] === mepVote) {
            allyMap[gc] = (allyMap[gc] || 0) + 1;
          }
        }
      }

      const topAllies: AllyCount[] = Object.entries(allyMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 7)
        .map(([group, count]) => ({
          group,
          count,
          pct: filtered.length > 0 ? (count / filtered.length) * 100 : 0,
        }));

      return {
        mep,
        totalDisagreements: mepDisag.length,
        filteredDisagreements: filtered,
        topAllies,
        topicVoteCount: topicVoteIds ? topicVoteIds.size : 0,
      };
    });
  }, [mepData, brudData, voteTopicMap, searchFilter, eurovocFilter, topicVoteIds]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...summaries];
    switch (sortBy) {
      case "name":
        return arr.sort((a, b) => a.mep.family_name.localeCompare(b.mep.family_name, "da"));
      case "participation":
        return arr.sort((a, b) => b.mep.n_votes - a.mep.n_votes);
      case "breaks":
        return arr.sort((a, b) => b.filteredDisagreements.length - a.filteredDisagreements.length);
    }
  }, [summaries, sortBy]);

  // Detail view
  const selectedSummary = selectedMEP ? sorted.find((s) => s.mep.mep_id === selectedMEP) : null;

  const handleSelect = useCallback((mepId: string) => setSelectedMEP(mepId), []);
  const handleClose = useCallback(() => setSelectedMEP(null), []);
  const toggleAccordion = useCallback((mepId: string) => setExpandedMEP((prev) => (prev === mepId ? null : mepId)), []);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (!mepData || !brudData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Detail view ───────────────────────────────────────────────────────────

  if (selectedSummary) {
    return <MEPDetailPanel summary={selectedSummary} onClose={handleClose} basePath={basePath} groupDescriptions={groupDescriptions} />;
  }

  // ─── Overview ──────────────────────────────────────────────────────────────

  const hasTopicFilter = !!(searchFilter || eurovocFilter);

  return (
    <div>
      {/* Filter info */}
      {hasTopicFilter && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Filtreret efter:{" "}
          {eurovocFilter && <span className="font-medium">{eurovocFilter}</span>}
          {searchFilter && eurovocFilter && " + "}
          {searchFilter && <span className="font-medium">&quot;{searchFilter}&quot;</span>}
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">Sortér:</span>
        {(["breaks", "participation", "name"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
              sortBy === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {key === "breaks" ? "Flest brud" : key === "participation" ? "Flest stemmer" : "Navn"}
          </button>
        ))}
      </div>

      {/* MEP cards */}
      <div className="space-y-4">
        {sorted.map((s) => {
          const filteredCount = s.filteredDisagreements.length;
          const isExpanded = expandedMEP === s.mep.mep_id;

          // Build detail link with current filters preserved
          const detailParams = new URLSearchParams();
          detailParams.set("mep", s.mep.mep_id);
          if (searchFilter) detailParams.set("search", searchFilter);
          if (eurovocFilter) detailParams.set("eurovoc", eurovocFilter);
          const detailHref = `${basePath}/danish-mep-votes?${detailParams.toString()}`;

          return (
            <div
              key={s.mep.mep_id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded
                  ? "border-blue-300 shadow-md"
                  : "border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            >
              {/* Clickable header */}
              <button
                onClick={() => toggleAccordion(s.mep.mep_id)}
                className="w-full text-left p-4 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={toLocalPhotoUrl(s.mep.full_name, basePath)}
                    alt={s.mep.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
                    }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <h3 className="font-semibold text-gray-900">{s.mep.full_name}</h3>
                        <GroupBadge code={s.mep.current_group_id.code} description={groupDescriptions[s.mep.current_group_id.code]} pill>
                          {s.mep.current_group_id.code}
                        </GroupBadge>
                      </div>
                      <span className="text-gray-400 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {s.mep.national_party_id.name} ({s.mep.national_party_id.code})
                    </p>

                    {/* Loyalty bar */}
                    <div className="mt-3">
                      {(() => {
                        const participationPct = s.mep.participation_pct;
                        const hasAbsent = participationPct !== undefined && participationPct < 100;
                        const absentPct = hasAbsent ? 100 - participationPct : 0;
                        const activePct = 100 - absentPct;

                        let barTotal: number, barAgainst: number;
                        if (hasTopicFilter) {
                          barTotal = s.topicVoteCount;
                          barAgainst = filteredCount;
                        } else {
                          barTotal = s.mep.n_votes;
                          barAgainst = s.mep.n_votes_against_group;
                        }

                        const loyalPct = barTotal > 0 ? ((barTotal - barAgainst) / barTotal) * activePct : activePct;
                        const againstPct = barTotal > 0 ? (barAgainst / barTotal) * activePct : 0;
                        // Center of the red segment
                        const arrowLeft = loyalPct + againstPct / 2;

                        return (
                          <>
                            {hasTopicFilter ? (
                              <LoyaltyBar
                                against={filteredCount}
                                total={s.topicVoteCount}
                                participationPct={participationPct}
                              />
                            ) : (
                              <LoyaltyBar
                                against={s.mep.n_votes_against_group}
                                total={s.mep.n_votes}
                                participationPct={participationPct}
                              />
                            )}

                            {/* Red connector arrow aligned with brud segment */}
                            {isExpanded && againstPct > 0 && (
                              <div className="relative h-4 -mb-2">
                                <svg
                                  width="20"
                                  height="16"
                                  viewBox="0 0 20 16"
                                  className="text-red-500 absolute"
                                  style={{ left: `calc(${arrowLeft}% - 10px)` }}
                                >
                                  <path d="M10 0 L10 10 L6 6 M10 10 L14 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </button>

              {/* Accordion body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t-2 border-red-400">
                  {filteredCount > 0 ? (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-3">
                          {LABELS.accordionHeader.replace("{name}", s.mep.family_name)}
                        </p>
                        <AllyBar allies={s.topAllies} mepGroup={s.mep.current_group_id.code} groupDescriptions={groupDescriptions} />
                      </div>
                      <a
                        href={detailHref}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSelect(s.mep.mep_id);
                        }}
                        className="mt-4 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Se alle {filteredCount} afstemninger
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    </>
                  ) : (
                    <p className="pt-4 text-sm text-gray-500 italic">
                      {LABELS.noBreaks.replace("{fullName}", s.mep.full_name).replace("{group}", s.mep.current_group_id.code)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
