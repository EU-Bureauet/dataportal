"use client"

import React, { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { VoteGroupCard, FilterPanel, useDocDeepLink, type VoteGroup } from "./components";

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

/** When the latest-votes page is reached from a theme card, the URL carries
 * a fixed (search, eurovoc) combo. We swap the global `latest_votes.json`
 * for the theme's curated dataset and surface the theme label in the page
 * heading. Keys are `"<search>|<eurovoc>"` (lower-cased) and must match the
 * `href` defined on the theme JSON's "Liste over afstemninger" visualisation. */
interface ThemeDatasetEntry {
  file: string;
  label: string;
}
const THEME_DATASETS: Record<string, ThemeDatasetEntry> = {
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

function matchThemeDataset(search: string | null, eurovoc: string | null): ThemeDatasetEntry | null {
  if (!search || !eurovoc) return null;
  return THEME_DATASETS[`${search.toLowerCase()}|${eurovoc.toLowerCase()}`] ?? null;
}

/** Theme datasets store the date once on the document but omit per-vote
 * `sitting_date`. Inject it so downstream code (sorting, grouping) can stay
 * unchanged. */
function normalizeThemeData(data: LatestVotesData): LatestVotesData {
  return {
    ...data,
    documents: data.documents.map((doc) => {
      const docDate = (doc.document_sitting_date || "").split(/[T ]/)[0];
      return {
        ...doc,
        votes: doc.votes.map((v) => ({
          ...v,
          sitting_date: v.sitting_date || docDate,
        })),
      };
    }),
  };
}

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

interface Disagreement {
  "Vote ID": string;
  "MEP Name": string;
}
interface BrudData {
  mep_vs_party: { disagreements: Disagreement[] };
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

  const [selectedMep, setSelectedMep] = useState<string | null>(null);

  // Initialize filters from URL query params. When the URL matches a theme
  // card link, swap the data source to the theme dataset and skip the
  // search/eurovoc filter init (they describe the theme, not a user filter).
  const themeDataset = useMemo(
    () => matchThemeDataset(searchParams.get("search"), searchParams.get("eurovoc")),
    [searchParams],
  );
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  useEffect(() => {
    if (initializedFromUrl) return;
    const qSearch = searchParams.get("search");
    const qEurovoc = searchParams.get("eurovoc");
    const qCommittee = searchParams.get("committee");
    const qMep = searchParams.get("mep");
    if (!themeDataset) {
      if (qSearch) setSearchQuery(qSearch);
      if (qEurovoc) setSelectedEurovoc(qEurovoc);
    }
    if (qCommittee) setSelectedCommittee(qCommittee);
    if (qMep) setSelectedMep(qMep);
    setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl, themeDataset]);
  const url = themeDataset
    ? `/${basePath}/data/${themeDataset.file}`
    : `/${basePath}/data/latest_votes.json`;
  const { data: rawData, error, isLoading } = useSWR<LatestVotesData>(url, fetcher);
  const data = themeDataset && rawData ? normalizeThemeData(rawData) : rawData;

  // Fetch disagreements data for MEP filtering
  const { data: brudData } = useSWR<BrudData>(
    selectedMep ? `/${basePath}/data/Danske_MEPs_brud_med_partigruppelinjen.json` : null,
    fetcher
  );

  // Build set of vote IDs where the selected MEP broke with their group
  const mepBreakVoteIds = useMemo(() => {
    if (!selectedMep || !brudData) return null;
    const ids = new Set<string>();
    for (const d of brudData.mep_vs_party.disagreements) {
      if (d["MEP Name"] === selectedMep) {
        ids.add(String(d["Vote ID"]));
      }
    }
    return ids;
  }, [selectedMep, brudData]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedQuery.length >= 2;
  const searchRegex = useMemo(() => {
    if (!hasActiveSearch) return null;
    const escaped = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // eslint-disable-next-line security/detect-non-literal-regexp -- user input is fully escaped above
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

    // Filter by MEP break votes: keep only votes where the MEP broke with their group
    if (mepBreakVoteIds && mepBreakVoteIds.size > 0) {
      filtered = filtered
        .map((group) => ({
          ...group,
          votes: group.votes.filter((v) => mepBreakVoteIds.has(String(v.vote_id))),
        }))
        .filter((group) => group.votes.length > 0);
    }
    
    return filtered;
  }, [groupedVotes, selectedCommittee, selectedEurovoc, searchRegex, mepBreakVoteIds]);

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

  // Reset page and display limits when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
    setEurovocDisplayLimit(10);
    setCommitteeDisplayLimit(10);
  }, [selectedCommittee, selectedEurovoc, searchQuery, selectedMep]);

  // Deep-link to a specific document via ?doc=<reference>.
  useDocDeepLink({
    docParam: searchParams.get("doc"),
    hasData: Boolean(data),
    filteredGroups,
    itemsPerPage: ITEMS_PER_PAGE,
    currentPage,
    setCurrentPage,
    setExpandedGroups,
  });

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
          <h1 className="text-3xl font-bold">
            {themeDataset ? `Afstemninger — ${themeDataset.label}` : "Seneste afstemninger"}
          </h1>
        </div>

        <FilterPanel
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCommittee={selectedCommittee}
          setSelectedCommittee={setSelectedCommittee}
          selectedEurovoc={selectedEurovoc}
          setSelectedEurovoc={setSelectedEurovoc}
          selectedMep={selectedMep}
          setSelectedMep={setSelectedMep}
          committeeCounts={committeeCounts}
          hasMoreCommittees={hasMoreCommittees}
          onShowMoreCommittees={() => setCommitteeDisplayLimit(prev => prev + 15)}
          eurovocCounts={eurovocCounts}
          hasMoreEurovoc={hasMoreEurovoc}
          onShowMoreEurovoc={() => setEurovocDisplayLimit(prev => prev + 15)}
          hasActiveSearch={hasActiveSearch}
          totalVotesFound={totalVotesFound}
          filteredGroupsCount={filteredGroups.length}
        />

        <div className="space-y-8">
          {paginatedGroups.map(group => (
            <VoteGroupCard
              key={`${group.document_reference}-${normalizeSittingDate(group.document_sitting_date)}`}
              group={group}
              expandedGroups={expandedGroups}
              setExpandedGroups={setExpandedGroups}
            />
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
