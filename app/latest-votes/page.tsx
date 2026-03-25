"use client"

import React, { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
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

interface Document {
  document_reference: string;
  document_sitting_date: string;
  report: string;
  committee: (string | number)[];
  short_title: string;
  eurovoc_keywords: string[];
  votes: Vote[];
}

interface LatestVotesData {
  metadata: {
    votes_total: number;
    documents_total: number;
    document_references_total: number;
    document_reference_dates_total: number;
    generated_at: string;
  };
  committees: Array<{
    label: string;
    voteCount: number;
  }>;
  eurovoc: Array<{
    label: string;
    voteCount: number;
  }>;
  documents: Document[];
}

interface VoteGroup {
  document_reference: string;
  report: string;
  short_title: string;
  document_sitting_date: string;
  committee: string[];
  eurovoc_keywords: string[];
  votes: Vote[];
}

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

const parseCommitteeNames = (committeeField: (string | number)[]): string[] => {
  if (!Array.isArray(committeeField)) return [];
  return committeeField
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const formatCommitteeLabel = (name: string): string => {
  return name.replace(/^Udvalget [om|for]\s+[det]?/i, "");
};

const normalizeSittingDate = (value: string): string => {
  return value.split(/[T ]/)[0];
};

const getVoteDateTimeValue = (vote: Vote): number => {
  const datePart = vote.sitting_date?.split(/[T ]/)[0] || "";
  const timePart = vote.sitting_time || "00:00:00";
  const parsed = Date.parse(`${datePart}T${timePart}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortVotesByNewest = (votes: Vote[]): Vote[] => {
  return [...votes].sort((a, b) => getVoteDateTimeValue(b) - getVoteDateTimeValue(a));
};

const ITEMS_PER_PAGE = 25;

export default function LatestVotesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Seneste afstemninger</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    }>
      <LatestVotesContent />
    </Suspense>
  );
}

function LatestVotesContent() {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || "dataportal";
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [selectedEurovoc, setSelectedEurovoc] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [committeeDisplayLimit, setCommitteeDisplayLimit] = useState(15);
  const [eurovocDisplayLimit, setEurovocDisplayLimit] = useState(15);

  // Initialize filters from URL query params (e.g. ?search=forsvar&eurovoc=forsvarspolitik&committee=...)
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  useEffect(() => {
    if (initializedFromUrl) return;
    const qSearch = searchParams.get("search");
    const qEurovoc = searchParams.get("eurovoc");
    const qCommittee = searchParams.get("committee");
    if (qSearch) setSearchQuery(qSearch);
    if (qEurovoc) setSelectedEurovoc(qEurovoc);
    if (qCommittee) setSelectedCommittee(qCommittee);
    setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);
  const url = `/${basePath}/data/latest_votes.json`;
  const { data, error, isLoading } = useSWR<LatestVotesData>(url, fetcher);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedQuery.length >= 2;
  const searchRegex = useMemo(() => {
    if (!hasActiveSearch) return null;
    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i");
  }, [normalizedQuery, hasActiveSearch]);

  const matchesSearchQuery = useMemo(() => {
    return (doc: Document): boolean => {
      if (!searchRegex) return true;
      const committeeNames = parseCommitteeNames(doc.committee);
      const eurovocKeywords = doc.eurovoc_keywords || [];
      const voteDescriptions = doc.votes.map((vote) => vote.vote_description);
      const searchableFields = [
        doc.report,
        doc.short_title,
        ...committeeNames,
        ...eurovocKeywords,
        ...voteDescriptions,
      ];

      return searchableFields.some((value) => value && searchRegex.test(value));
    };
  }, [searchRegex]);

  // Calculate committee counts based on current committee and eurovoc filters
  const allCommitteeCounts = useMemo(() => {
    if (!data?.documents) return [] as Array<{ name: string; count: number }>;

    // Filter documents by search and committee if selected
    let docs = data.documents.filter(matchesSearchQuery);
    if (selectedCommittee) {
      docs = docs.filter((doc) => {
        const committees = parseCommitteeNames(doc.committee);
        return committees.includes(selectedCommittee);
      });
    }

    // Filter documents by eurovoc if selected
    if (selectedEurovoc) {
      docs = docs.filter((doc) => {
        return doc.eurovoc_keywords.includes(selectedEurovoc);
      });
    }

    const counts: Record<string, number> = {};
    docs.forEach((doc) => {
      const committees = parseCommitteeNames(doc.committee);
      committees.forEach((name) => {
        counts[name] = (counts[name] || 0) + doc.votes.length;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [data?.documents, selectedCommittee, selectedEurovoc, matchesSearchQuery]);

  const committeeCounts = useMemo(() => {
    return allCommitteeCounts.slice(0, committeeDisplayLimit);
  }, [allCommitteeCounts, committeeDisplayLimit]);

  const hasMoreCommittees = allCommitteeCounts.length > committeeDisplayLimit;

  // Calculate eurovoc counts based on current committee and eurovoc filters
  const allEurovocCounts = useMemo(() => {
    if (!data?.documents) return [] as Array<{ label: string; count: number }>;

    // Filter documents by search and committee if selected
    let docs = data.documents.filter(matchesSearchQuery);
    if (selectedCommittee) {
      docs = docs.filter((doc) => {
        const committees = parseCommitteeNames(doc.committee);
        return committees.includes(selectedCommittee);
      });
    }

    // Filter documents by eurovoc if selected
    if (selectedEurovoc) {
      docs = docs.filter((doc) => {
        return doc.eurovoc_keywords.includes(selectedEurovoc);
      });
    }

    // Count votes for each eurovoc keyword
    const counts: Record<string, number> = {};
    docs.forEach((doc) => {
      doc.eurovoc_keywords.forEach((keyword) => {
        counts[keyword] = (counts[keyword] || 0) + doc.votes.length;
      });
    });

    // Sort by count and return all
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [data?.documents, selectedCommittee, selectedEurovoc, matchesSearchQuery]);

  const eurovocCounts = useMemo(() => {
    return allEurovocCounts.slice(0, eurovocDisplayLimit);
  }, [allEurovocCounts, eurovocDisplayLimit]);

  const hasMoreEurovoc = allEurovocCounts.length > eurovocDisplayLimit;

  const groupedVotes = useMemo(() => {
    if (!data?.documents) return [] as VoteGroup[];

    // Deduplicate by document_reference + document_sitting_date before creating groups
    const seen = new Set<string>();
    const deduplicated = [];

    for (const doc of data.documents) {
      const normalizedDate = normalizeSittingDate(doc.document_sitting_date);
      const key = `${doc.document_reference}|${normalizedDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({
          document_reference: doc.document_reference,
          report: doc.report,
          short_title: doc.short_title,
          document_sitting_date: doc.document_sitting_date,
          committee: parseCommitteeNames(doc.committee),
          eurovoc_keywords: doc.eurovoc_keywords || [],
          votes: sortVotesByNewest(doc.votes),
        });
      }
    }

    return deduplicated;
  }, [data?.documents]);

  const filteredGroups = useMemo(() => {
    let filtered = groupedVotes;

    if (searchRegex) {
      filtered = filtered.filter((group) => {
        const searchableFields = [
          group.document_reference,
          group.report,
          group.short_title,
          ...group.committee,
          ...group.eurovoc_keywords,
          ...group.votes.map((vote) => vote.vote_description),
        ];

        return searchableFields.some((value) => value && searchRegex.test(value));
      });
    }
    
    // Filter by committee if selected
    if (selectedCommittee) {
      filtered = filtered.filter((group) =>
        group.committee.includes(selectedCommittee)
      );
    }
    
    // Filter by Eurovoc keyword if selected
    if (selectedEurovoc) {
      filtered = filtered.filter((group) =>
        group.eurovoc_keywords.includes(selectedEurovoc)
      );
    }
    
    return filtered;
  }, [groupedVotes, selectedCommittee, selectedEurovoc, searchRegex]);

  const totalVotesFound = useMemo(() => {
    return filteredGroups.reduce((total, group) => total + group.votes.length, 0);
  }, [filteredGroups]);

  // Client-side pagination: calculate total pages and slice documents
  const totalPages = useMemo(() => {
    return Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  }, [filteredGroups.length]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredGroups.slice(startIndex, endIndex);
  }, [filteredGroups, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCommittee, selectedEurovoc, searchQuery]);

  // Reset eurovoc display limit when committee or eurovoc filter changes
  React.useEffect(() => {
    setEurovocDisplayLimit(10);
  }, [selectedCommittee, selectedEurovoc, searchQuery]);

  // Reset committee display limit when eurovoc or committee filter changes
  React.useEffect(() => {
    setCommitteeDisplayLimit(10);
  }, [selectedCommittee, selectedEurovoc, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Seneste afstemninger</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Seneste afstemninger</h1>
          <p className="text-red-600">Kunne ikke indlæse data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Seneste afstemninger</h1>
        </div>

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
          {hasActiveSearch && (
            <p className="mt-2 text-sm text-gray-600">
              {totalVotesFound} afstemning{totalVotesFound === 1 ? "" : "er"} fordelt på {filteredGroups.length} sag
              {filteredGroups.length === 1 ? "" : "er"}.
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
                  selectedCommittee === null
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
                    selectedCommittee === committee.name
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {formatCommitteeLabel(committee.name)} ({committee.count})
                </button>
              ))}
              {hasMoreCommittees && (
                <button
                  type="button"
                  onClick={() => setCommitteeDisplayLimit(prev => prev + 15)}
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
                  selectedEurovoc === null
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
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
                    selectedEurovoc === eurovoc.label
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  {eurovoc.label} ({eurovoc.count})
                </button>
              ))}
              {hasMoreEurovoc && (
                <button
                  type="button"
                  onClick={() => setEurovocDisplayLimit(prev => prev + 15)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors underline cursor-pointer"
                >
                  Vis flere emneord...
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {paginatedGroups.map(group => (
            <div
              key={`${group.document_reference}-${normalizeSittingDate(group.document_sitting_date)}`}
              className="bg-white rounded-lg shadow-md p-6"
            >
              {(() => {
                const groupKey = `${group.document_reference}-${normalizeSittingDate(group.document_sitting_date)}`;
                const isExpanded = expandedGroups.has(groupKey);
                const shouldCollapse = group.votes.length > 3;
                const visibleVotes = shouldCollapse && !isExpanded
                  ? group.votes.slice(0, 1)
                  : group.votes;
                const tableContainerStyle = shouldCollapse
                  ? { maxHeight: isExpanded ? "2200px" : "220px" }
                  : undefined;

                return (
                  <>
              <div className="mb-6">

                <div className="mt-3 space-y-2">
                  {group.committee.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {group.committee.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded"
                          >
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
                  <p className="text-sm text-gray-500">
                    Betænkning: {group.report}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  {group.votes.length} afstemning{group.votes.length !== 1 ? "er" : ""} • {group.document_sitting_date}
                </p>

                {/* Committee and Eurovoc Info */}
                <div className="mt-3 space-y-2">
                  {group.eurovoc_keywords.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {group.eurovoc_keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded"
                          >
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
                        const forPct = total > 0 ? ((vote.for / total) * 100) : 0;
                        const abstentionPct = total > 0 ? ((vote.abstention / total) * 100) : 0;
                        const againstPct = total > 0 ? ((vote.against / total) * 100) : 0;

                        const votes = [
                          { label: 'for', count: vote.for, pct: forPct },
                          { label: 'undlod', count: vote.abstention, pct: abstentionPct },
                          { label: 'imod', count: vote.against, pct: againstPct }
                        ];
                        const majority = votes.reduce((max, v) => v.count > max.count ? v : max, votes[0]);

                        return (
                          <tr key={vote.vote_id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">
                              <Link
                                href={`/vote?id=${vote.vote_id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {vote.vote_description}
                              </Link>
                            </td>
                            <td className="py-3 px-2 text-right font-semibold">{total}</td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-6 flex rounded overflow-hidden">
                                  {forPct > 0 && (
                                    <div
                                      className="h-full"
                                      style={{ 
                                        width: `${forPct}%`, 
                                        backgroundColor: '#00CC00'
                                      }}
                                      title={`For: ${vote.for} (${forPct.toFixed(1)}%)`}
                                    />
                                  )}
                                  {abstentionPct > 0 && (
                                    <div
                                      className="h-full"
                                      style={{ 
                                        width: `${abstentionPct}%`, 
                                        backgroundColor: '#FFCC00'
                                      }}
                                      title={`Undlod: ${vote.abstention} (${abstentionPct.toFixed(1)}%)`}
                                    />
                                  )}
                                  {againstPct > 0 && (
                                    <div
                                      className="h-full"
                                      style={{ 
                                        width: `${againstPct}%`, 
                                        backgroundColor: '#FF0000'
                                      }}
                                      title={`Imod: ${vote.against} (${againstPct.toFixed(1)}%)`}
                                    />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-semibold">
                                {majority.pct.toFixed(0)}% {majority.label}
                              </span>
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
                        if (next.has(groupKey)) {
                          next.delete(groupKey);
                        } else {
                          next.add(groupKey);
                        }
                        return next;
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-blue-600 cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-500 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                    />
                    {isExpanded
                      ? "Skjul øvrige afstemninger"
                      : `Vis ${group.votes.length - 1} øvrige afstemninger`}
                  </button>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Forrige
          </button>
          <span className="text-gray-700 font-semibold">
            Side {currentPage} af {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Næste
          </button>
        </div>

        {paginatedGroups.length === 0 && (
          <div className="mt-6 text-gray-600">Ingen afstemninger fundet.</div>
        )}
      </div>
    </div>
  );
}
