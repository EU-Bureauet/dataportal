"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { MEPData, voteValueToLabel, voteValueToBgColor } from "@/types/data";

const COUNTRY_NAMES: Record<string, string> = {
  "AUT": "Østrig", "BEL": "Belgien", "BGR": "Bulgarien", "HRV": "Kroatien",
  "CYP": "Cypern", "CZE": "Tjekkiet", "DNK": "Danmark", "EST": "Estland",
  "FIN": "Finland", "FRA": "Frankrig", "DEU": "Tyskland", "GRC": "Grækenland",
  "HUN": "Ungarn", "IRL": "Irland", "ITA": "Italien", "LVA": "Letland",
  "LTU": "Litauen", "LUX": "Luxembourg", "MLT": "Malta", "NLD": "Holland",
  "POL": "Polen", "PRT": "Portugal", "ROU": "Rumænien", "SVK": "Slovakiet",
  "SVN": "Slovenien", "ESP": "Spanien", "SWE": "Sverige"
};

/* ── MEP Selector ─────────────────────────────────────────── */

interface MEPSelectorProps {
  label: string;
  selectedId: string;
  onSelectId: (id: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  filteredMeps: MEPData[];
  groupedMeps: Map<string, Map<string, MEPData[]>>;
  totalMepsCount: number;
}

export function MEPSelector({
  label, selectedId, onSelectId, searchTerm, onSearchTermChange,
  filteredMeps, groupedMeps, totalMepsCount,
}: MEPSelectorProps) {
  const getCountryName = (countryCodeOrUrl: string): string => {
    if (!countryCodeOrUrl) return 'Unknown';
    if (countryCodeOrUrl.includes('/')) {
      const parts = countryCodeOrUrl.split('/');
      return COUNTRY_NAMES[parts[parts.length - 1] || ''] || parts[parts.length - 1] || 'Unknown';
    }
    return COUNTRY_NAMES[countryCodeOrUrl] || countryCodeOrUrl;
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        type="text"
        placeholder="Søg efter navn, parti eller land..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={selectedId}
        onChange={(e) => onSelectId(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        size={10}
      >
        <option value="">Vælg MEP...</option>
        {searchTerm ? (
          filteredMeps.map(mep => (
            <option key={mep.mep_id} value={mep.mep_id}>
              {mep.full_name} ({mep.national_party_id.name}) - {getCountryName(mep.country_code)}
            </option>
          ))
        ) : (
          Array.from(groupedMeps.entries())
            .sort(([countryA], [countryB]) => {
              if (countryA === 'DNK') return -1;
              if (countryB === 'DNK') return 1;
              const nameA = COUNTRY_NAMES[countryA] || countryA;
              const nameB = COUNTRY_NAMES[countryB] || countryB;
              return nameA.localeCompare(nameB);
            })
            .flatMap(([country, partyGroups]) =>
              Array.from(partyGroups.entries())
                .sort(([partyA], [partyB]) => (partyA || '').localeCompare(partyB || ''))
                .map(([party, meps]) => (
                  <optgroup key={`${country}-${party}`} label={`${COUNTRY_NAMES[country] || country} - ${party}`}>
                    {meps.map((mep: MEPData) => (
                      <option key={mep.mep_id} value={mep.mep_id}>
                        {mep.full_name}
                      </option>
                    ))}
                  </optgroup>
                ))
            )
        )}
      </select>
      {searchTerm && (
        <div className="text-xs text-gray-500 mt-1">
          Viser {filteredMeps.length} af {totalMepsCount} MEP&apos;er
        </div>
      )}
    </div>
  );
}

/* ── Vote List ────────────────────────────────────────────── */

interface VoteItem {
  vote_id: string;
  entity1_vote: number | null;
  entity2_vote: number | null;
}

interface VoteListProps {
  title: string;
  votes: VoteItem[];
  mep1Name: string;
  mep2Name: string;
}

export function VoteList({ title, votes, mep1Name, mep2Name }: VoteListProps) {
  const router = useRouter();
  if (votes.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xl font-bold mb-4">{title} ({votes.length})</h3>
      <div className="space-y-2">
        {votes.slice(0, 50).map((vote, index: number) => (
          <Card
            key={index}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/vote?id=${vote.vote_id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm text-gray-600">Afstemning ID: {vote.vote_id}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity1_vote)}`}>
                  {mep1Name}: {voteValueToLabel(vote.entity1_vote)}
                </div>
                <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity2_vote)}`}>
                  {mep2Name}: {voteValueToLabel(vote.entity2_vote)}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {votes.length > 50 && (
          <div className="text-center text-gray-600 py-4">
            Viser 50 af {votes.length} {title.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}
