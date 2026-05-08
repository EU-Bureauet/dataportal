"use client"

import React, { useState, useMemo, Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { compareMEPs } from "@/lib/vote-comparison";
import { MEPResponse, MEPData } from "@/types/data";
import useSWR from "swr";
import { MEPSelector, VoteList } from "./components";

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
    /* eslint-disable sonarjs/no-nested-functions -- standard nested iterators */
    grouped.forEach(countryGroup => {
      countryGroup.forEach(partyMeps => {
        partyMeps.sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
    });
    /* eslint-enable sonarjs/no-nested-functions */

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
            <MEPSelector
              label="Vælg første MEP:"
              selectedId={mep1Id}
              onSelectId={setMep1Id}
              searchTerm={searchTerm1}
              onSearchTermChange={setSearchTerm1}
              filteredMeps={filteredMeps1}
              groupedMeps={groupedMeps}
              totalMepsCount={mepsData.meps.length}
            />
            <MEPSelector
              label="Vælg anden MEP:"
              selectedId={mep2Id}
              onSelectId={setMep2Id}
              searchTerm={searchTerm2}
              onSearchTermChange={setSearchTerm2}
              filteredMeps={filteredMeps2}
              groupedMeps={groupedMeps}
              totalMepsCount={mepsData.meps.length}
            />
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

            {showAgreements && (
              <VoteList
                title="Enigheder"
                votes={comparison.agreements}
                mep1Name={getMEPName(comparedMep1Id)}
                mep2Name={getMEPName(comparedMep2Id)}
              />
            )}

            {showDisagreements && (
              <VoteList
                title="Uenigheder"
                votes={comparison.disagreements}
                mep1Name={getMEPName(comparedMep1Id)}
                mep2Name={getMEPName(comparedMep2Id)}
              />
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
