"use client"

import React, { useState, useMemo, Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { compareMEPs } from "@/lib/vote-comparison";
import { MEPResponse, MEPData, voteValueToLabel, voteValueToBgColor } from "@/types/data";
import { useRouter } from 'next/navigation';
import useSWR from "swr";

interface MEPComparison {
  mep1_info: { political_group: string; national_group: string; country: string };
  mep2_info: { political_group: string; national_group: string; country: string };
  agreement_rate: number;
  disagreement_rate: number;
  total_comparable_votes: number;
  agreement_count: number;
  disagreement_count: number;
  agreements: Array<{ vote_id: string; entity1_vote: number | null; entity2_vote: number | null }>;
  disagreements: Array<{ vote_id: string; entity1_vote: number | null; entity2_vote: number | null }>;
}

const COUNTRY_NAMES: { [key: string]: string } = {
  "AUT": "Østrig",
  "BEL": "Belgien",
  "BGR": "Bulgarien",
  "HRV": "Kroatien",
  "CYP": "Cypern",
  "CZE": "Tjekkiet",
  "DNK": "Danmark",
  "EST": "Estland",
  "FIN": "Finland",
  "FRA": "Frankrig",
  "DEU": "Tyskland",
  "GRC": "Grækenland",
  "HUN": "Ungarn",
  "IRL": "Irland",
  "ITA": "Italien",
  "LVA": "Letland",
  "LTU": "Litauen",
  "LUX": "Luxembourg",
  "MLT": "Malta",
  "NLD": "Holland",
  "POL": "Polen",
  "PRT": "Portugal",
  "ROU": "Rumænien",
  "SVK": "Slovakiet",
  "SVN": "Slovenien",
  "ESP": "Spanien",
  "SWE": "Sverige"
};

function CompareMEPsPage() {
  const router = useRouter();
  const [mep1Id, setMep1Id] = useState<string>("");
  const [mep2Id, setMep2Id] = useState<string>("");
  const [comparison, setComparison] = useState<MEPComparison | null>(null);
  const [comparedMep1Id, setComparedMep1Id] = useState<string>("");
  const [comparedMep2Id, setComparedMep2Id] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [showAgreements, setShowAgreements] = useState(true);
  const [showDisagreements, setShowDisagreements] = useState(true);

  // Fetch MEPs data
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const { data: mepsData, error: mepsError, isLoading: mepsLoading } = useSWR<MEPResponse>(
    `/${basePath}/data/meps_clean.json`,
    fetcher
  );

  // Helper function to extract country code from URL
  const getCountryCode = (countryCodeOrUrl: string): string => {
    if (!countryCodeOrUrl) return 'Unknown';
    // If it's a URL, extract the last part (e.g., "NLD" from ".../country/NLD")
    if (countryCodeOrUrl.includes('/')) {
      const parts = countryCodeOrUrl.split('/');
      return parts[parts.length - 1] || 'Unknown';
    }
    return countryCodeOrUrl;
  };

  // Helper function to get full country name
  const getCountryName = (countryCodeOrUrl: string): string => {
    const code = getCountryCode(countryCodeOrUrl);
    return COUNTRY_NAMES[code] || code;
  };

  // Group MEPs by country and party, then sort alphabetically
  const groupedMeps = useMemo(() => {
    if (!mepsData?.meps) return new Map<string, Map<string, MEPData[]>>();

    const grouped = new Map<string, Map<string, MEPData[]>>();

    mepsData.meps.forEach(mep => {
      const country = getCountryCode(mep.country_code);
      const party = mep.national_party_id?.name || 'Unknown Party';

      if (!grouped.has(country)) {
        grouped.set(country, new Map<string, MEPData[]>());
      }

      const countryGroup = grouped.get(country)!;
      if (!countryGroup.has(party)) {
        countryGroup.set(party, []);
      }

      countryGroup.get(party)!.push(mep);
    });

    // Sort MEPs within each party alphabetically by name
    grouped.forEach(countryGroup => {
      countryGroup.forEach(partyMeps => {
        partyMeps.sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
    });

    return grouped;
  }, [mepsData]);

  // Filter MEPs by search term
  const filteredMeps1 = useMemo(() => {
    if (!mepsData?.meps) return [];
    if (!searchTerm1) return mepsData.meps;
    const searchLower = searchTerm1.toLowerCase();
    return mepsData.meps.filter(mep => {
      const fullName = mep.full_name?.toLowerCase() || '';
      const partyName = mep.national_party_id?.name?.toLowerCase() || '';
      const code = getCountryCode(mep.country_code);
      const countryName = (COUNTRY_NAMES[code] || code).toLowerCase();
      return fullName.includes(searchLower) ||
             partyName.includes(searchLower) ||
             countryName.includes(searchLower);
    });
  }, [mepsData, searchTerm1]);

  const filteredMeps2 = useMemo(() => {
    if (!mepsData?.meps) return [];
    if (!searchTerm2) return mepsData.meps;
    const searchLower = searchTerm2.toLowerCase();
    return mepsData.meps.filter(mep => {
      const fullName = mep.full_name?.toLowerCase() || '';
      const partyName = mep.national_party_id?.name?.toLowerCase() || '';
      const code = getCountryCode(mep.country_code);
      const countryName = (COUNTRY_NAMES[code] || code).toLowerCase();
      return fullName.includes(searchLower) ||
             partyName.includes(searchLower) ||
             countryName.includes(searchLower);
    });
  }, [mepsData, searchTerm2]);

  const handleCompare = async () => {
    if (!mep1Id || !mep2Id) {
      setError("Vælg venligst begge MEP&apos;er");
      return;
    }

    if (mep1Id === mep2Id) {
      setError("Vælg venligst to forskellige MEP&apos;er");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await compareMEPs(mep1Id, mep2Id);
      setComparison(result);
      setComparedMep1Id(mep1Id);
      setComparedMep2Id(mep2Id);
    } catch (err) {
      setError(`Kunne ikke sammenligne MEP&apos;er: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const getMEPName = (mepId: string) => {
    const mep = mepsData?.meps.find(m => m.mep_id === mepId);
    return mep?.full_name || mepId;
  };

  if (mepsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Sammenlign MEP&apos;er</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (mepsError || !mepsData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Sammenlign MEP&apos;er</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Sammenlign MEP&apos;er</h1>
        <p className="text-gray-600 mb-8">
          Sammenlign afstemningsmønstrene for to medlemmer af Europa-Parlamentet
        </p>

        {/* MEP Selection */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First MEP */}
            <div>
              <label className="block text-sm font-medium mb-2">Vælg første MEP:</label>
              <input
                type="text"
                placeholder="Søg efter navn, parti eller land..."
                value={searchTerm1}
                onChange={(e) => setSearchTerm1(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={mep1Id}
                onChange={(e) => setMep1Id(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={10}
              >
                <option value="">Vælg MEP...</option>
                {searchTerm1 ? (
                  // When searching, show flat list
                  filteredMeps1.map(mep => (
                    <option key={mep.mep_id} value={mep.mep_id}>
                      {mep.full_name} ({mep.national_party_id.name}) - {getCountryName(mep.country_code)}
                    </option>
                  ))
                ) : (
                  // When not searching, show grouped by country and party
                  Array.from(groupedMeps.entries())
                    .sort(([countryA], [countryB]) => {
                      // Denmark (DNK) always comes first
                      if (countryA === 'DNK') return -1;
                      if (countryB === 'DNK') return 1;
                      // Then alphabetically by country name
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
              {searchTerm1 && (
                <div className="text-xs text-gray-500 mt-1">
                  Viser {filteredMeps1.length} af {mepsData.meps.length} MEP&apos;er
                </div>
              )}
            </div>

            {/* Second MEP */}
            <div>
              <label className="block text-sm font-medium mb-2">Vælg anden MEP:</label>
              <input
                type="text"
                placeholder="Søg efter navn, parti eller land..."
                value={searchTerm2}
                onChange={(e) => setSearchTerm2(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={mep2Id}
                onChange={(e) => setMep2Id(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                size={10}
              >
                <option value="">Vælg MEP...</option>
                {searchTerm2 ? (
                  // When searching, show flat list
                  filteredMeps2.map(mep => (
                    <option key={mep.mep_id} value={mep.mep_id}>
                      {mep.full_name} ({mep.national_party_id.name}) - {getCountryName(mep.country_code)}
                    </option>
                  ))
                ) : (
                  // When not searching, show grouped by country and party
                  Array.from(groupedMeps.entries())
                    .sort(([countryA], [countryB]) => {
                      // Denmark (DNK) always comes first
                      if (countryA === 'DNK') return -1;
                      if (countryB === 'DNK') return 1;
                      // Then alphabetically by country name
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
              {searchTerm2 && (
                <div className="text-xs text-gray-500 mt-1">
                  Viser {filteredMeps2.length} af {mepsData.meps.length} MEP&apos;er
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !mep1Id || !mep2Id}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? "Indlæser..." : "Sammenlign"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
        </Card>

        {/* Comparison Results */}
        {comparison && (
          <>
            {/* Overview Statistics */}
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Sammenligning</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{getMEPName(comparedMep1Id)}</h3>
                  <div className="text-sm text-gray-600">
                    {comparison.mep1_info.political_group}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comparison.mep1_info.national_group} - {comparison.mep1_info.country}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{getMEPName(comparedMep2Id)}</h3>
                  <div className="text-sm text-gray-600">
                    {comparison.mep2_info.political_group}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comparison.mep2_info.national_group} - {comparison.mep2_info.country}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-700">{comparison.agreement_rate}%</div>
                  <div className="text-sm text-gray-600">Enighed</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comparison.agreement_count} afstemninger
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-700">{comparison.disagreement_rate}%</div>
                  <div className="text-sm text-gray-600">Uenighed</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comparison.disagreement_count} afstemninger
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-700">{comparison.total_comparable_votes}</div>
                  <div className="text-sm text-gray-600">Sammenlignelige afstemninger</div>
                </div>
              </div>
            </Card>

            {/* Filter Controls */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Filtrer afstemninger</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAgreements}
                    onChange={(e) => setShowAgreements(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Vis enigheder ({comparison.agreement_count})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDisagreements}
                    onChange={(e) => setShowDisagreements(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Vis uenigheder ({comparison.disagreement_count})</span>
                </label>
              </div>
            </Card>

            {/* Agreements List */}
            {showAgreements && comparison.agreements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4">
                  Enigheder ({comparison.agreements.length})
                </h3>
                <div className="space-y-2">
                  {comparison.agreements.slice(0, 50).map((vote, index: number) => (
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
                            {getMEPName(comparedMep1Id)}: {voteValueToLabel(vote.entity1_vote)}
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity2_vote)}`}>
                            {getMEPName(comparedMep2Id)}: {voteValueToLabel(vote.entity2_vote)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {comparison.agreements.length > 50 && (
                    <div className="text-center text-gray-600 py-4">
                      Viser 50 af {comparison.agreements.length} enigheder
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disagreements List */}
            {showDisagreements && comparison.disagreements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-4">
                  Uenigheder ({comparison.disagreements.length})
                </h3>
                <div className="space-y-2">
                  {comparison.disagreements.slice(0, 50).map((vote, index: number) => (
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
                            {getMEPName(comparedMep1Id)}: {voteValueToLabel(vote.entity1_vote)}
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity2_vote)}`}>
                            {getMEPName(comparedMep2Id)}: {voteValueToLabel(vote.entity2_vote)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {comparison.disagreements.length > 50 && (
                    <div className="text-center text-gray-600 py-4">
                      Viser 50 af {comparison.disagreements.length} uenigheder
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense for static site generation
export default function Page() {
  return (
    <Suspense>
      <CompareMEPsPage />
    </Suspense>
  );
}
