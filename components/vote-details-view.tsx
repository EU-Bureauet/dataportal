"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { VoteDetails, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";
import { VoteResultChart } from "@/components/vote-result-chart";
import * as flags from 'country-flag-icons/react/3x2';

const committeeNames = committeeNamesData as CommitteeAndGroupNames;

// Map country names to ISO codes for flags
const COUNTRY_CODES: { [key: string]: keyof typeof flags } = {
  "Austria": "AT",
  "Belgium": "BE",
  "Bulgaria": "BG",
  "Croatia": "HR",
  "Cyprus": "CY",
  "Czech Republic": "CZ",
  "Czechia": "CZ",
  "Denmark": "DK",
  "Estonia": "EE",
  "Finland": "FI",
  "France": "FR",
  "Germany": "DE",
  "Greece": "GR",
  "Hungary": "HU",
  "Ireland": "IE",
  "Italy": "IT",
  "Latvia": "LV",
  "Lithuania": "LT",
  "Luxembourg": "LU",
  "Malta": "MT",
  "Netherlands": "NL",
  "Holland": "NL",
  "Poland": "PL",
  "Portugal": "PT",
  "Romania": "RO",
  "Slovakia": "SK",
  "Slovenia": "SI",
  "Spain": "ES",
  "Sweden": "SE",

    "Østrig": "AT",
  "Belgien": "BE",
  "Bulgarien": "BG",
  "Kroatien": "HR",
  "Cypern": "CY",
  "Tjekkiet": "CZ",
  "Danmark": "DK",
  "Estland": "EE",
  "Frankrig": "FR",
  "Tyskland": "DE",
  "Grækenland": "GR",
  "Ungarn": "HU",
  "Irland": "IE",
  "Italien": "IT",
  "Letland": "LV",
  "Litauen": "LT",
  "Nederlandene": "NL",
  "Polen": "PL",
  "Rumænien": "RO",
  "Slovakiet": "SK",
  "Slovenien": "SI",
  "Spanien": "ES",
  "Sverige": "SE"

};

// Map group names to logo file names
const GROUP_LOGOS: { [key: string]: string } = {
  "PPE": "/dataportal/img/ppe.png",
  "S&D": "/dataportal/img/sd.png",
  "Renew": "/dataportal/img/renew.png",
  "Verts/ALE": "/dataportal/img/vertsale.png",
  "ECR": "/dataportal/img/ecr.png",
  "The Left": "/dataportal/img/theleft.png",
  "ESN": "/dataportal/img/esn.png",
  "PfE": "/dataportal/img/pfe.png",
};

interface VoteDetailsViewProps {
  data: VoteDetails;
}

// EU Parliamentary group colors
const GROUP_COLORS: { [key: string]: string } = {
  "PPE": "#3399FF",
  "S&D": "#FF0000",
  "Renew": "#FFCC00",
  "Verts/ALE": "#00CC00",
  "ECR": "#0066CC",
  "The Left": "#990000",
  "ESN": "#000066",
  "PfE": "#006699",
  "Greens/EFA": "#00CC00",
  "PPE-DE": "#3399FF",
  "AfD": "#000066",
  "NI": "#999999"
};

// Vote type colors
const VOTE_COLORS: { [key: string]: string } = {
  "For": "#00CC00",
  "Against": "#FF0000",
  "Abstention": "#FFCC00",
  "Did not vote": "#999999"
};

const normalizeVoteLabel = (voteLabel?: string): 'For' | 'Against' | 'Abstention' | null => {
  if (!voteLabel) return null;

  const normalized = voteLabel.trim().toLowerCase();

  if (normalized === 'for') return 'For';
  if (normalized === 'against' || normalized === 'imod') return 'Against';
  if (normalized === 'abstention' || normalized === 'undlod') return 'Abstention';

  return null;
};

export function VoteDetailsView({ data }: VoteDetailsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupSortBy, setGroupSortBy] = useState<'name' | 'votes'>('votes');
  const [groupSortOrder, setGroupSortOrder] = useState<'asc' | 'desc'>('desc');
  const [countrySortBy, setCountrySortBy] = useState<'name' | 'votes'>('name');
  const [countrySortOrder, setCountrySortOrder] = useState<'asc' | 'desc'>('asc');

  // Transform "By Group" object to array and sort
  const groupBreakdown: { Group: string; For: number; Against: number; Abstention: number }[] = data["By Group"]
    ? Object.entries(data["By Group"])
        .map(([group, votes]) => ({
          Group: group,
          For: votes.For,
          Against: votes.Against,
          Abstention: votes.Abstention
        }))
        .sort((a, b) => {
          if (groupSortBy === 'name') {
            const comparison = a.Group.localeCompare(b.Group);
            return groupSortOrder === 'asc' ? comparison : -comparison;
          } else {
            const totalA = a.For + a.Against + a.Abstention;
            const totalB = b.For + b.Against + b.Abstention;
            const comparison = totalA - totalB;
            return groupSortOrder === 'asc' ? comparison : -comparison;
          }
        })
    : [];

  // Handler for group table sorting
  const handleGroupSort = (sortBy: 'name' | 'votes') => {
    if (groupSortBy === sortBy) {
      setGroupSortOrder(groupSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setGroupSortBy(sortBy);
      setGroupSortOrder(sortBy === 'name' ? 'asc' : 'desc');
    }
  };

  // Transform "By Country" object to array and sort
  const countryBreakdown = data["By Country"]
    ? Object.entries(data["By Country"])
        .map(([country, votes]) => ({
          Country: country,
          For: votes.For,
          Against: votes.Against,
          Abstention: votes.Abstention,
          "Did not vote": votes["Did not vote"],
          "Potential Disagreement": votes["Potential Disagreement"],
          Disagreements: votes.Disagreements || 0
        }))
        .sort((a, b) => {
          if (countrySortBy === 'name') {
            const comparison = a.Country.localeCompare(b.Country);
            return countrySortOrder === 'asc' ? comparison : -comparison;
          } else {
            const totalA = a.For + a.Against + a.Abstention;
            const totalB = b.For + b.Against + b.Abstention;
            const comparison = totalA - totalB;
            return countrySortOrder === 'asc' ? comparison : -comparison;
          }
        })
    : [];

  // Handler for country table sorting
  const handleCountrySort = (sortBy: 'name' | 'votes') => {
    if (countrySortBy === sortBy) {
      setCountrySortOrder(countrySortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCountrySortBy(sortBy);
      setCountrySortOrder(sortBy === 'name' ? 'asc' : 'desc');
    }
  };

  // Filter MEP votes based on search
  const filteredMEPVotes = (data["Votes by MEP"] || []).filter(vote =>
    vote["MEP Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.Country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote["Political Group"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote["National Party"]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupMajorityVotes = Object.entries(data["By Group"] || {}).reduce((acc, [groupName, groupVotes]) => {
    const voteCounts = [
      { vote: 'For' as const, count: groupVotes.For ?? 0 },
      { vote: 'Against' as const, count: groupVotes.Against ?? 0 },
      { vote: 'Abstention' as const, count: groupVotes.Abstention ?? 0 },
    ];

    const highestCount = Math.max(...voteCounts.map(({ count }) => count));
    const topVotes = voteCounts.filter(({ count }) => count === highestCount);

    acc[groupName] = topVotes.length === 1 ? topVotes[0].vote : null;
    return acc;
  }, {} as Record<string, 'For' | 'Against' | 'Abstention' | null>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">
            {data["Short Title"] || data["Document Title"] || `Afstemning #${data["Vote ID"]}`}
          </h1>
        </div>
        <p className="text-lg text-gray-700">{data["Vote Description"]}</p>
        {data["Document Title"] && (
          <div className="text-lg text-gray-700">{data["Document Title"]}</div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {data["Document Link"] && (
            <>
              <a
                href={data["Document Link"]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Se dokument
              </a>
            </>
          )}
        </div>
        <div className="text-sm text-gray-600">Dato: {data["Sitting Date"]}</div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Deltagelse</div>
          <div className="text-3xl font-bold">
            {data.Participation != null ? data.Participation.toFixed(1) + "%" : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Afgivne stemmer</div>
          <div className="text-3xl font-bold">
            {data.Result ? (data.Result.For ?? 0) + (data.Result.Against ?? 0) + (data.Result.Abstention ?? 0) : "N/A"}
          </div>
        </Card>
        {data.Result && (
          <Card className="p-4">
            <VoteResultChart 
              forVotes={data.Result.For ?? 0}
              againstVotes={data.Result.Against ?? 0}
              abstentionVotes={data.Result.Abstention ?? 0}
            />
          </Card>
        )}
      </div>

      {/* Metadata */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Udvalg</div>
            <div className="font-medium">
              {data.Committees && data.Committees.length > 0
                ? data.Committees.map(c => c.name || committeeNames.committee_names[c.code] || c.code).join(", ")
                : "Ikke angivet"}
            </div>
            <div className="text-sm text-gray-600 mb-1">Emne</div>
            <div className="font-medium">
              {data.Subjectmatter && data.Subjectmatter.length > 0
                ? data.Subjectmatter.map(sm => sm.code).join(", ")
                : "Ikke angivet"}
            </div>
          </div>
        </div>
        {data["Eurovoc Topics"] && data["Eurovoc Topics"].length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Eurovoc Emner</div>
            <div className="flex flex-wrap gap-2">
              {data["Eurovoc Topics"].map((topic, index) => (
                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {topic.label || topic.id}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Winning Coalition */}
      {data["Winning Coalition"]?.["Winning Coalition"] && data["Winning Coalition"]["Winning Coalition"].length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Vindende koalition</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {data["Winning Coalition"]["Winning Coalition"].map((group, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border-2 border-white shadow-sm"
                    style={{ backgroundColor: GROUP_COLORS[group] || '#999999' }}
                    title={group}
                  />
                  <span className="font-medium">{group}</span>
                  {index < (data["Winning Coalition"]?.["Winning Coalition"]?.length || 0) - 1 && (
                    <span className="text-gray-400 mx-1">+</span>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">Flertal</div>
                <div className="font-semibold">{data["Winning Coalition"]["Majority Vote"]}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">Frekvens</div>
                <div className="font-semibold">{data["Winning Coalition"]["Coalition Frequency"]}%</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">Klassifikation</div>
                <div className="font-semibold">{data["Winning Coalition"]["Coalition Classification"]}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Breakdown by Group */}
      {groupBreakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Fordeling efter politisk gruppe</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left py-3 px-2 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleGroupSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Gruppe</span>
                      {groupSortBy === 'name' && (
                        <span className="text-xs">
                          {groupSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right py-3 px-2 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleGroupSort('votes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stemmer</span>
                      {groupSortBy === 'votes' && (
                        <span className="text-xs">
                          {groupSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 min-w-[200px]">Fordeling</th>
                  <th className="text-right py-3 px-2">Flertal</th>
                </tr>
              </thead>
              <tbody>
                {groupBreakdown.map((group, index) => {
                  const total = (group.For ?? 0) + (group.Against ?? 0) + (group.Abstention ?? 0);
                  const forPct = total > 0 ? ((group.For ?? 0) / total) * 100 : 0;
                  const abstentionPct = total > 0 ? ((group.Abstention ?? 0) / total) * 100 : 0;
                  const againstPct = total > 0 ? ((group.Against ?? 0) / total) * 100 : 0;
                  
                  // Find majority vote
                  const votes = [
                    { label: 'for', count: group.For, pct: forPct },
                    { label: 'undlod', count: group.Abstention, pct: abstentionPct },
                    { label: 'imod', count: group.Against, pct: againstPct }
                  ];
                  const majority = votes.reduce((max, vote) => (vote.count ?? 0) > (max.count ?? 0) ? vote : max, votes[0]);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          {GROUP_LOGOS[group.Group] ? (
                            <Image
                              src={GROUP_LOGOS[group.Group]}
                              alt={group.Group}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded border-2 border-white shadow-sm"
                              style={{ backgroundColor: GROUP_COLORS[group.Group] || '#999999' }}
                            />
                          )}
                          <span className="font-semibold">{group.Group}</span>
                        </div>
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
                                  backgroundColor: VOTE_COLORS.For 
                                }}
                                title={`For: ${group.For ?? 0} (${forPct.toFixed(1)}%)`}
                              />
                            )}
                            {abstentionPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${abstentionPct}%`, 
                                  backgroundColor: VOTE_COLORS.Abstention 
                                }}
                                title={`Undlod: ${group.Abstention} (${abstentionPct.toFixed(1)}%)`}
                              />
                            )}
                            {againstPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${againstPct}%`, 
                                  backgroundColor: VOTE_COLORS.Against 
                                }}
                                title={`Imod: ${group.Against} (${againstPct.toFixed(1)}%)`}
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
        </Card>
      )}

      {/* Breakdown by Country */}
      {countryBreakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Fordeling efter land</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left py-3 px-2 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleCountrySort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Land</span>
                      {countrySortBy === 'name' && (
                        <span className="text-xs">
                          {countrySortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right py-3 px-2 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleCountrySort('votes')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stemmer</span>
                      {countrySortBy === 'votes' && (
                        <span className="text-xs">
                          {countrySortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left py-3 px-2 min-w-[200px]">Fordeling</th>
                  <th className="text-center py-3 px-2">Brud med gruppe</th>
                  <th className="text-right py-3 px-2">Flertal</th>
                </tr>
              </thead>
              <tbody>
                {countryBreakdown.map((country, index) => {
                  const total = (country.For ?? 0) + (country.Against ?? 0) + (country.Abstention ?? 0);
                  const forPct = total > 0 ? ((country.For ?? 0) / total) * 100 : 0;
                  const abstentionPct = total > 0 ? ((country.Abstention ?? 0) / total) * 100 : 0;
                  const againstPct = total > 0 ? ((country.Against ?? 0) / total) * 100 : 0;
                  
                  // Find majority vote
                  const votes = [
                    { label: 'for', count: country.For, pct: forPct },
                    { label: 'undlod', count: country.Abstention, pct: abstentionPct },
                    { label: 'imod', count: country.Against, pct: againstPct }
                  ];
                  const majority = votes.reduce((max, vote) => vote.count > max.count ? vote : max, votes[0]);
                  
                  // Get flag component
                  const countryCode = COUNTRY_CODES[country.Country];
                  const FlagComponent = countryCode ? flags[countryCode] : null;
                  
                  return (
                    <tr 
                      key={index} 
                      className={`border-b hover:bg-gray-50 ${
                        country["Potential Disagreement"] ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {FlagComponent && (
                            <FlagComponent className="w-6 h-4 rounded shadow-sm" />
                          )}
                          <span className="font-semibold">{country.Country}</span>
                          {country["Potential Disagreement"] && (
                            <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded">
                              Uenighed
                            </span>
                          )}
                        </div>
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
                                  backgroundColor: VOTE_COLORS.For 
                                }}
                                title={`For: ${country.For} (${forPct.toFixed(1)}%)`}
                              />
                            )}
                            {abstentionPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${abstentionPct}%`, 
                                  backgroundColor: VOTE_COLORS.Abstention 
                                }}
                                title={`Undlod: ${country.Abstention} (${abstentionPct.toFixed(1)}%)`}
                              />
                            )}
                            {againstPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${againstPct}%`, 
                                  backgroundColor: VOTE_COLORS.Against 
                                }}
                                title={`Imod: ${country.Against} (${againstPct.toFixed(1)}%)`}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {country.Disagreements > 0 ? (
                          <span className="font-semibold text-orange-600">
                            {country.Disagreements}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
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
        </Card>
      )}

      {/* MEP Votes */}
      {data["Votes by MEP"]?.length && data["Votes by MEP"].length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Alle MEP stemmer ({data["Votes by MEP"]?.length || 0})
          </h2>

          {/* Search filter */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Søg efter navn, land, gruppe eller parti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-gray-600 mb-2">
            Viser {filteredMEPVotes.length} af {data["Votes by MEP"]?.length || 0} stemmer
          </div>

          <div className="text-xs text-gray-600 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
            <span>Orange prik = afviger fra gruppens flertal</span>
          </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredMEPVotes.map((vote, index) => {
            const mepVote = normalizeVoteLabel(vote.Vote);
            const groupMajorityVote = groupMajorityVotes[vote["Political Group"]] ?? null;
            const breaksGroupMajority = !!(mepVote && groupMajorityVote && mepVote !== groupMajorityVote);

            return (
            <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: GROUP_COLORS[vote["Political Group"]] || '#999999' }}
                    title={vote["Political Group"]}
                  />
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{vote["MEP Name"]}</span>
                      {breaksGroupMajority && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-orange-500"
                          title="Afviger fra gruppens flertal"
                          aria-label="Afviger fra gruppens flertal"
                        />
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {vote.Country} • {vote["Political Group"]} • {vote["National Party"]}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-sm font-bold"
                    style={{ color: VOTE_COLORS[vote.Vote] || '#000' }}
                  >
                    {vote.Vote}
                  </span>
                </div>
              </div>
            </div>
          )})}
        </div>
      </Card>
      )}

      {/* Related Votes */}
      {data["Related Votes"]?.length && data["Related Votes"].length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Relaterede afstemninger ({data["Related Votes"]?.length || 0})
          </h2>
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
                {data["Related Votes"]
                  ?.sort((a, b) => parseInt(b["Vote ID"]) - parseInt(a["Vote ID"]))
                  .map((vote, index) => {
                  const total = (vote.For || 0) + (vote.Against || 0) + (vote.Abstention || 0);
                  const forPct = total > 0 ? ((vote.For || 0) / total) * 100 : 0;
                  const abstentionPct = total > 0 ? ((vote.Abstention || 0) / total) * 100 : 0;
                  const againstPct = total > 0 ? ((vote.Against || 0) / total) * 100 : 0;
                  
                  // Find majority vote
                  const votes = [
                    { label: 'for', count: vote.For || 0, pct: forPct },
                    { label: 'undlod', count: vote.Abstention || 0, pct: abstentionPct },
                    { label: 'imod', count: vote.Against || 0, pct: againstPct }
                  ];
                  const majority = votes.reduce((max, v) => v.count > max.count ? v : max, votes[0]);
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <Link
                          href={`/vote?id=${vote["Vote ID"]}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {vote["Vote Description"] || `Afstemning #${vote["Vote ID"]}`}
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
                                  backgroundColor: VOTE_COLORS.For 
                                }}
                                title={`For: ${vote.For || 0} (${forPct.toFixed(1)}%)`}
                              />
                            )}
                            {abstentionPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${abstentionPct}%`, 
                                  backgroundColor: VOTE_COLORS.Abstention 
                                }}
                                title={`Undlod: ${vote.Abstention || 0} (${abstentionPct.toFixed(1)}%)`}
                              />
                            )}
                            {againstPct > 0 && (
                              <div
                                className="h-full"
                                style={{ 
                                  width: `${againstPct}%`, 
                                  backgroundColor: VOTE_COLORS.Against 
                                }}
                                title={`Imod: ${vote.Against || 0} (${againstPct.toFixed(1)}%)`}
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
        </Card>
      )}
    </div>
  );
}
