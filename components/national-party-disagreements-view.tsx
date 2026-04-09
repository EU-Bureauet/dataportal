"use client"

import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { NationalPartyDisagreementsData, extractCountryFromPartyName } from "@/types/data";
import { GROUP_COLORS } from "@/lib/group-colors";
import { PartyDetailView } from "@/components/national-party-disagreements-sections";

interface NationalPartyDisagreementsViewProps {
  data: NationalPartyDisagreementsData;
}

export function NationalPartyDisagreementsView({ data }: NationalPartyDisagreementsViewProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedVote, setExpandedVote] = useState<string | null>(null);

  // Extract all unique countries
  const countries = useMemo(() => {
    const countrySet = new Set<string>();
    Object.keys(data.parties).forEach(partyName => {
      const { country } = extractCountryFromPartyName(partyName);
      if (country) {
        countrySet.add(country);
      }
    });
    return ["all", ...Array.from(countrySet).sort()];
  }, [data]);

  // Transform parties data with country extraction
  const partiesWithCountry = useMemo(() => {
    return Object.entries(data.parties).map(([fullPartyName, partyData]) => {
      const { partyNameWithoutCountry, country } = extractCountryFromPartyName(fullPartyName);
      return {
        fullPartyName,
        partyName: partyNameWithoutCountry,
        country,
        data: partyData
      };
    });
  }, [data]);

  // Filter parties by selected country and search term
  const filteredParties = useMemo(() => {
    let filtered = partiesWithCountry;

    if (selectedCountry !== "all") {
      filtered = filtered.filter(p => p.country === selectedCountry);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.country.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) =>
      b.data.disagreement_statistics.disagreement_rate_percent -
      a.data.disagreement_statistics.disagreement_rate_percent
    );
  }, [partiesWithCountry, selectedCountry, searchTerm]);

  // Get selected party data
  const selectedPartyData = useMemo(() => {
    if (!selectedParty) return null;
    return filteredParties.find(p => p.fullPartyName === selectedParty);
  }, [selectedParty, filteredParties]);

  // Helper function to get color for a political group
  const getGroupColor = (groupName: string): string => {
    // Try direct match first
    if (GROUP_COLORS[groupName]) return GROUP_COLORS[groupName];

    // Try partial matches
    if (groupName.includes("People's Party") || groupName.includes("PPE")) return GROUP_COLORS["PPE"];
    if (groupName.includes("Socialists") || groupName.includes("S&D")) return GROUP_COLORS["S&D"];
    if (groupName.includes("Renew")) return GROUP_COLORS["Renew"];
    if (groupName.includes("Greens") || groupName.includes("Verts")) return GROUP_COLORS["Verts/ALE"];
    if (groupName.includes("Conservatives") || groupName.includes("ECR")) return GROUP_COLORS["ECR"];
    if (groupName.includes("Left") || groupName.includes("GUE")) return GROUP_COLORS["The Left"];
    if (groupName.includes("Sovereign") || groupName.includes("ESN")) return GROUP_COLORS["ESN"];
    if (groupName.includes("Patriots") || groupName.includes("PfE")) return GROUP_COLORS["PfE"];

    return GROUP_COLORS["NI"];
  };

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      {!selectedParty && (
        <>
          {/* Metadata Card */}
          <Card className="p-6 bg-blue-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Partier analyseret</div>
                <div className="text-2xl font-bold text-blue-900">
                  {data.metadata.total_parties_analyzed}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Afstemninger i datasæt</div>
                <div className="text-2xl font-bold text-blue-900">
                  {data.metadata.total_votes_in_dataset}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Data genereret</div>
                <div className="text-lg font-semibold text-blue-900">
                  {data.metadata.generated}
                </div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Filtrer på land:</label>
                <div className="flex flex-wrap gap-2">
                  {countries.map(country => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedCountry === country
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {country === "all" ? "Alle lande" : country}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Søg efter parti:</label>
                <input
                  type="text"
                  placeholder="Søg efter partinavn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-sm text-gray-600">
                Viser {filteredParties.length} partier
              </div>
            </div>
          </Card>

          {/* Party Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((party) => (
              <Card
                key={party.fullPartyName}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedParty(party.fullPartyName)}
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold flex-1">{party.partyName}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {party.country}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {party.data.party_info.total_meps} medlemmer
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {party.data.disagreement_statistics.disagreement_rate_percent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">Uenighedsprocent</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {party.data.disagreement_statistics.total_disagreements}
                      </div>
                      <div className="text-xs text-gray-600">Uenigheder</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {party.data.disagreement_statistics.total_votes_analyzed}
                      </div>
                      <div className="text-xs text-gray-600">Afstemninger</div>
                    </div>
                  </div>
                </div>

                {/* MEPs preview */}
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-gray-600 mb-2">Medlemmer:</div>
                  <div className="flex flex-wrap gap-1">
                    {party.data.party_info.meps.slice(0, 3).map((mep) => {
                      const groupColor = getGroupColor(mep.political_group);
                      return (
                        <div
                          key={mep.mep_id}
                          className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: groupColor }}
                          title={`${mep.name} - ${mep.political_group}`}
                        />
                      );
                    })}
                    {party.data.party_info.meps.length > 3 && (
                      <div className="w-5 h-5 rounded-full bg-gray-300 text-[10px] flex items-center justify-center text-gray-700 font-semibold">
                        +{party.data.party_info.meps.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Detailed View for Selected Party */}
      {selectedParty && selectedPartyData && (
        <PartyDetailView
          partyData={selectedPartyData}
          expandedVote={expandedVote}
          setExpandedVote={setExpandedVote}
          onBack={() => {
            setSelectedParty(null);
            setExpandedVote(null);
          }}
        />
      )}

      {filteredParties.length === 0 && !selectedParty && (
        <Card className="p-6">
          <p className="text-gray-600 text-center">Ingen partier fundet med de valgte filtre</p>
        </Card>
      )}
    </div>
  );
}
