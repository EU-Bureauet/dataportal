"use client"

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { GroupBadge } from "@/components/national-party-disagreements-shared";
import { voteNumberToType, type IndexedVotesDoc } from "@/lib/danish-mep-votes-helpers";
import { npdPartyFileName, type NPDDisagreement, type NPDPartyDetail, type NPDPartySummary } from "@/types/national-party-disagreements";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 25;
/** Years stay collapsed by default once a party has more disagreements than this. */
const AUTO_COLLAPSE_THRESHOLD = 150;
const ALL_TOPICS = "__all__";

function yearOf(sittingDate: string): string {
  return sittingDate.slice(0, 4) || "Ukendt";
}

/* ── "Hvem stemte hvad" for a single vote, looked up on demand ─────────── */

function MemberVoteBreakdown({
  voteId,
  meps,
  indexedByMepId,
}: Readonly<{
  voteId: number;
  meps: NPDPartyDetail["meps"];
  indexedByMepId: Record<string, IndexedVotesDoc> | undefined;
}>) {
  if (!indexedByMepId) {
    return <p className="text-xs text-gray-400 italic mt-2">Henter stemmer...</p>;
  }

  const buckets: Record<string, string[]> = { For: [], Against: [], Abstention: [], "Ingen stemme": [] };
  for (const mep of meps) {
    const doc = indexedByMepId[mep.mep_id];
    const idx = doc?.vote_ids.indexOf(String(voteId)) ?? -1;
    const type = idx === -1 || !doc ? "Ingen stemme" : voteNumberToType(doc.votes[idx]);
    (buckets[type] ?? buckets["Ingen stemme"]).push(mep.name);
  }

  const LABELS: Record<string, { label: string; colorClass: string }> = {
    For: { label: "Stemte for", colorClass: "text-emerald-700 bg-emerald-50" },
    Against: { label: "Stemte imod", colorClass: "text-red-700 bg-red-50" },
    Abstention: { label: "Undlod", colorClass: "text-amber-700 bg-amber-50" },
    "Ingen stemme": { label: "Deltog ikke", colorClass: "text-gray-500 bg-gray-100" },
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      {Object.entries(buckets).map(([type, names]) => {
        if (names.length === 0) return null;
        const meta = LABELS[type];
        return (
          <div key={type} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 mr-1">{meta.label}:</span>
            {names.map((name) => (
              <span key={name} className={`text-xs px-2 py-0.5 rounded-full ${meta.colorClass}`}>
                {name}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── Single vote row ────────────────────────────────────────────────────── */

function VoteRow({
  d,
  meps,
  indexedByMepId,
}: Readonly<{
  d: NPDDisagreement;
  meps: NPDPartyDetail["meps"];
  indexedByMepId: Record<string, IndexedVotesDoc> | undefined;
}>) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {d.short_title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="text-xs text-gray-500">{d.sitting_date}</span>
            {d.committee.map((c) => (
              <span key={c} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{c}</span>
            ))}
          </div>
        </div>
        <a
          href={d.document_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-blue-600 flex-shrink-0 mt-0.5"
          aria-label="Åbn dokument"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
      <MemberVoteBreakdown voteId={d.vote_id} meps={meps} indexedByMepId={indexedByMepId} />
    </div>
  );
}

/* ── One collapsible year section, with its own "vis flere" pagination ──── */

function YearSection({
  year,
  disagreements,
  isOpen,
  onToggle,
  meps,
  indexedByMepId,
}: Readonly<{
  year: string;
  disagreements: NPDDisagreement[];
  isOpen: boolean;
  onToggle: () => void;
  meps: NPDPartyDetail["meps"];
  indexedByMepId: Record<string, IndexedVotesDoc> | undefined;
}>) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = disagreements.slice(0, visibleCount);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 cursor-pointer"
      >
        <span className="text-sm font-semibold text-gray-700">{year} ({disagreements.length})</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          <div className="divide-y divide-gray-100">
            {visible.map((d) => (
              <VoteRow key={d.vote_id} d={d} meps={meps} indexedByMepId={indexedByMepId} />
            ))}
          </div>
          {disagreements.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" /> Vis {Math.min(PAGE_SIZE, disagreements.length - visibleCount)} mere
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Party detail: fetches the per-party file lazily, then renders it ──── */

export function PartyDetail({ party, basePath }: Readonly<{ party: NPDPartySummary; basePath: string }>) {
  const detailUrl = `${basePath}/data/national_party_disagreements/${npdPartyFileName(party)}`;
  const { data: detail, error } = useSWR<NPDPartyDetail>(detailUrl, fetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState(ALL_TOPICS);
  const [openYears, setOpenYears] = useState<Set<string> | null>(null);

  // Fetched as soon as the party is opened - every visible vote row shows
  // who voted what, so there's nothing to gain by waiting for a click.
  const mepIdsKey = useMemo(() => party.meps.map((m) => m.mep_id).join(","), [party.meps]);
  const { data: indexedByMepId } = useSWR<Record<string, IndexedVotesDoc>>(
    `${basePath}|npd-mep-votes|${mepIdsKey}`,
    async () => {
      const entries = await Promise.all(
        party.meps.map(async (mep) => {
          const res = await fetch(`${basePath}/data/mep_${mep.mep_id}.json`);
          if (!res.ok) return [mep.mep_id, { vote_ids: [], votes: [] }] as const;
          return [mep.mep_id, (await res.json()) as IndexedVotesDoc] as const;
        })
      );
      return Object.fromEntries(entries);
    }
  );

  const topics = useMemo(() => {
    if (!detail) return [];
    const set = new Set<string>();
    for (const d of detail.disagreements) for (const c of d.committee) set.add(c);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [detail]);

  const filtered = useMemo(() => {
    if (!detail) return [];
    const term = searchTerm.trim().toLowerCase();
    return detail.disagreements.filter((d) => {
      if (topicFilter !== ALL_TOPICS && !d.committee.includes(topicFilter)) return false;
      if (!term) return true;
      return (
        d.short_title.toLowerCase().includes(term) ||
        d.eurovoc_keywords.some((k) => k.toLowerCase().includes(term))
      );
    });
  }, [detail, searchTerm, topicFilter]);

  const byYear = useMemo(() => {
    const map = new Map<string, NPDDisagreement[]>();
    for (const d of filtered) {
      const y = yearOf(d.sitting_date);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Default open/collapsed state per year: everything open for small parties,
  // only the most recent year open when there's a lot to browse.
  const effectiveOpenYears = useMemo(() => {
    if (openYears) return openYears;
    const allYears = byYear.map(([y]) => y);
    if (party.disagreement_count <= AUTO_COLLAPSE_THRESHOLD) return new Set(allYears);
    return new Set(allYears.slice(0, 1));
  }, [openYears, byYear, party.disagreement_count]);

  const toggleYear = (year: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev ?? effectiveOpenYears);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  if (error) {
    return <p className="text-sm text-red-600 py-4">Kunne ikke hente afstemninger for dette parti.</p>;
  }
  if (!detail) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-2">
      {/* Members */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {party.political_groups.map((g) => <GroupBadge key={g} code={g} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
          {party.meps.map((mep) => (
            <div key={mep.mep_id} className="text-sm text-gray-700 bg-gray-50 rounded px-2.5 py-1.5 truncate">
              {mep.name}
            </div>
          ))}
        </div>
      </div>

      {/* Vote list controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          placeholder="Søg i afstemninger..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {topics.length > 1 && (
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={ALL_TOPICS}>Alle udvalg</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Viser {filtered.length} af {detail.disagreements.length} uenige afstemninger
      </p>

      {/* Vote list, grouped by year */}
      <div className="space-y-2">
        {byYear.map(([year, list]) => (
          <YearSection
            key={year}
            year={year}
            disagreements={list}
            isOpen={effectiveOpenYears.has(year)}
            onToggle={() => toggleYear(year)}
            meps={detail.meps}
            indexedByMepId={indexedByMepId}
          />
        ))}
        {byYear.length === 0 && (
          <p className="text-sm text-gray-500 italic py-4">Ingen afstemninger matcher søgningen/filteret.</p>
        )}
      </div>
    </div>
  );
}
