"use client"

import React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface Vote {
  vote_id: string;
  vote_description: string;
  sitting_date: string;
  sitting_time: string;
  for: number;
  against: number;
  abstention: number;
}

export interface VoteGroup {
  document_reference: string;
  report: string;
  short_title: string;
  document_sitting_date: string;
  committee: string[];
  eurovoc_keywords: string[];
  votes: Vote[];
}

const normalizeSittingDate = (value: string): string => {
  return value.split(/[T ]/)[0];
};

/** Handles deep-linking to a specific document via ?doc=<reference> on
 * /latest-votes. Once data has loaded, finds the matching group, jumps to
 * the right page, expands it, and scrolls into view. */
export function useDocDeepLink(params: {
  docParam: string | null;
  hasData: boolean;
  filteredGroups: VoteGroup[];
  itemsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const { docParam, hasData, filteredGroups, itemsPerPage, currentPage, setCurrentPage, setExpandedGroups } = params;
  const [scrolledTo, setScrolledTo] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!docParam || !hasData || scrolledTo === docParam) return;
    const idx = filteredGroups.findIndex((g) => g.document_reference === docParam);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      return;
    }
    const group = filteredGroups[idx];
    const groupKey = `${group.document_reference}-${normalizeSittingDate(group.document_sitting_date)}`;
    setExpandedGroups((prev) => {
      if (prev.has(groupKey)) return prev;
      const next = new Set(prev);
      next.add(groupKey);
      return next;
    });
    requestAnimationFrame(() => {
      const el = document.getElementById(`doc-${docParam}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setScrolledTo(docParam);
  }, [docParam, hasData, filteredGroups, itemsPerPage, currentPage, scrolledTo, setCurrentPage, setExpandedGroups]);
}

/* ── Vote Group Card ─────────────────────────────────────── */

export function VoteGroupCard({ group, expandedGroups, setExpandedGroups }: {
  group: VoteGroup;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const groupKey = `${group.document_reference}-${normalizeSittingDate(group.document_sitting_date)}`;
  const isExpanded = expandedGroups.has(groupKey);
  const shouldCollapse = group.votes.length > 3;
  const visibleVotes = shouldCollapse && !isExpanded ? group.votes.slice(0, 1) : group.votes;
  const tableContainerStyle = shouldCollapse
    ? { maxHeight: isExpanded ? "2200px" : "220px" }
    : undefined;

  return (
    <div id={`doc-${group.document_reference}`} className="bg-white rounded-lg shadow-md p-6 scroll-mt-24">
      <div className="mb-6">
        <div className="mt-3 space-y-2">
          {group.committee.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-1">
                {group.committee.map((name, idx) => (
                  <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {group.short_title || group.document_reference}
        </h2>
        {group.document_reference.trim() && (
          <p className="text-sm text-gray-500">Betænkning: {group.report}</p>
        )}
        <p className="text-sm text-gray-500">
          {group.votes.length} afstemning{group.votes.length !== 1 ? "er" : ""} • {group.document_sitting_date}
        </p>

        <div className="mt-3 space-y-2">
          {group.eurovoc_keywords.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-1">
                {group.eurovoc_keywords.map((keyword, idx) => (
                  <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`overflow-hidden ${shouldCollapse ? "transition-all duration-500 ease-in-out" : ""}`}
        style={tableContainerStyle}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Afstemning</th>
                <th className="text-right py-3 px-2">Stemmer</th>
                <th className="text-left py-3 px-2 min-w-[200px]">Fordeling</th>
                <th className="text-right py-3 px-2">Flertal</th>
              </tr>
            </thead>
            <tbody>
              {visibleVotes.map(vote => {
                const total = vote.for + vote.against + vote.abstention;
                const forPct = total > 0 ? (vote.for / total) * 100 : 0;
                const abstentionPct = total > 0 ? (vote.abstention / total) * 100 : 0;
                const againstPct = total > 0 ? (vote.against / total) * 100 : 0;

                const votes = [
                  { label: 'for', count: vote.for, pct: forPct },
                  { label: 'undlod', count: vote.abstention, pct: abstentionPct },
                  { label: 'imod', count: vote.against, pct: againstPct }
                ];
                const majority = votes.reduce((max, v) => v.count > max.count ? v : max, votes[0]);

                return (
                  <tr key={vote.vote_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <Link href={`/vote?id=${vote.vote_id}`} className="text-blue-600 hover:underline font-medium">
                        {vote.vote_description}
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">{total}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 flex rounded overflow-hidden">
                          {forPct > 0 && (
                            <div className="h-full" style={{ width: `${forPct}%`, backgroundColor: '#00CC00' }}
                              title={`For: ${vote.for} (${forPct.toFixed(1)}%)`} />
                          )}
                          {abstentionPct > 0 && (
                            <div className="h-full" style={{ width: `${abstentionPct}%`, backgroundColor: '#FFCC00' }}
                              title={`Undlod: ${vote.abstention} (${abstentionPct.toFixed(1)}%)`} />
                          )}
                          {againstPct > 0 && (
                            <div className="h-full" style={{ width: `${againstPct}%`, backgroundColor: '#FF0000' }}
                              title={`Imod: ${vote.against} (${againstPct.toFixed(1)}%)`} />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-semibold">{majority.pct.toFixed(0)}% {majority.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {shouldCollapse && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setExpandedGroups((previous) => {
                const next = new Set(previous);
                if (next.has(groupKey)) { next.delete(groupKey); }
                else { next.add(groupKey); }
                return next;
              });
            }}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-blue-600 cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            aria-expanded={isExpanded}
          >
            <ChevronDown size={16} className={`transition-transform duration-500 ${isExpanded ? "rotate-180" : "rotate-0"}`} />
            {isExpanded ? "Skjul øvrige afstemninger" : `Vis ${group.votes.length - 1} øvrige afstemninger`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Filter Panel ────────────────────────────────────────── */

const formatCommitteeLabel = (name: string): string => {
  // eslint-disable-next-line security/detect-unsafe-regex -- linear alternation, no backtracking risk
  return name.replace(/^Udvalget (?:om|for)\s+(?:det\s+)?/i, "");
};

interface FilterPanelProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCommittee: string | null;
  setSelectedCommittee: (c: string | null) => void;
  selectedEurovoc: string | null;
  setSelectedEurovoc: (e: string | null) => void;
  selectedMep: string | null;
  setSelectedMep: (m: string | null) => void;
  committeeCounts: Array<{ name: string; count: number }>;
  hasMoreCommittees: boolean;
  onShowMoreCommittees: () => void;
  eurovocCounts: Array<{ label: string; count: number }>;
  hasMoreEurovoc: boolean;
  onShowMoreEurovoc: () => void;
  hasActiveSearch: boolean;
  totalVotesFound: number;
  filteredGroupsCount: number;
}

export function FilterPanel({
  searchQuery, setSearchQuery,
  selectedCommittee, setSelectedCommittee,
  selectedEurovoc, setSelectedEurovoc,
  selectedMep, setSelectedMep,
  committeeCounts, hasMoreCommittees, onShowMoreCommittees,
  eurovocCounts, hasMoreEurovoc, onShowMoreEurovoc,
  hasActiveSearch: _hasActiveSearch, totalVotesFound, filteredGroupsCount,
}: FilterPanelProps) {
  return (
    <>
      {/* Active filter indicators */}
      {(selectedMep || selectedEurovoc || selectedCommittee) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-900">Aktive filtre</span>
            <button
              type="button"
              onClick={() => {
                setSelectedMep(null);
                setSelectedEurovoc(null);
                setSelectedCommittee(null);
                setSearchQuery("");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Nulstil alle
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedMep && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                MEP: {selectedMep}
                <button type="button" onClick={() => setSelectedMep(null)} className="hover:text-red-600 cursor-pointer" aria-label="Fjern MEP filter">✕</button>
              </span>
            )}
            {selectedEurovoc && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Emneord: {selectedEurovoc}
                <button type="button" onClick={() => setSelectedEurovoc(null)} className="hover:text-purple-600 cursor-pointer" aria-label="Fjern emneord filter">✕</button>
              </span>
            )}
            {selectedCommittee && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                Udvalg: {selectedCommittee}
                <button type="button" onClick={() => setSelectedCommittee(null)} className="hover:text-emerald-600 cursor-pointer" aria-label="Fjern udvalg filter">✕</button>
              </span>
            )}
          </div>
          {selectedMep && (
            <p className="text-xs text-blue-700 mt-2">
              Viser kun afstemninger hvor {selectedMep} stemte imod sin partigruppe.
            </p>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label htmlFor="latest-votes-search" className="block text-sm font-semibold text-gray-900 mb-2">
          Søg i afstemninger
        </label>
        <input
          id="latest-votes-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Søg efter titel, emneord, udvalg eller afstemning..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {filteredGroupsCount > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            {totalVotesFound} afstemning{totalVotesFound === 1 ? "" : "er"} fordelt på {filteredGroupsCount} sag
            {filteredGroupsCount === 1 ? "" : "er"}.
          </p>
        )}
      </div>

      {/* Committee Filter */}
      {committeeCounts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Udvalg</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCommittee(null)}
              aria-pressed={selectedCommittee === null}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selectedCommittee === null ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Alle
            </button>
            {committeeCounts.map((committee) => (
              <button
                key={committee.name}
                type="button"
                onClick={() => setSelectedCommittee(selectedCommittee === committee.name ? null : committee.name)}
                aria-pressed={selectedCommittee === committee.name}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  selectedCommittee === committee.name ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {formatCommitteeLabel(committee.name)} ({committee.count})
              </button>
            ))}
            {hasMoreCommittees && (
              <button
                type="button"
                onClick={onShowMoreCommittees}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors underline cursor-pointer"
              >
                Vis flere udvalg...
              </button>
            )}
          </div>
        </div>
      )}

      {/* Eurovoc Filter */}
      {eurovocCounts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Emneord</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedEurovoc(null)}
              aria-pressed={selectedEurovoc === null}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selectedEurovoc === null ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              Alle
            </button>
            {eurovocCounts.map((eurovoc) => (
              <button
                key={eurovoc.label}
                type="button"
                onClick={() => setSelectedEurovoc(selectedEurovoc === eurovoc.label ? null : eurovoc.label)}
                aria-pressed={selectedEurovoc === eurovoc.label}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  selectedEurovoc === eurovoc.label ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                {eurovoc.label} ({eurovoc.count})
              </button>
            ))}
            {hasMoreEurovoc && (
              <button
                type="button"
                onClick={onShowMoreEurovoc}
                className="px-3 py-1.5 rounded-full text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors underline cursor-pointer"
              >
                Vis flere emneord...
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
