"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { type MEPVote, type RelatedVote, type WinningCoalitionInfo } from "@/types/data";
import { GROUP_COLORS } from "@/lib/group-colors";
import { getMajorityLabel, normalizeVoteLabel } from "@/lib/data-transforms";
import * as flags from 'country-flag-icons/react/3x2';

// Vote type colors
const VOTE_COLORS: Record<string, string> = {
  "For": "#00CC00",
  "Against": "#FF0000",
  "Abstention": "#FFCC00",
  "Did not vote": "#999999"
};

// Map group names to logo file names
const GROUP_LOGOS: Record<string, string> = {
  "PPE": "/dataportal/img/ppe.png",
  "S&D": "/dataportal/img/sd.png",
  "Renew": "/dataportal/img/renew.png",
  "Verts/ALE": "/dataportal/img/vertsale.png",
  "ECR": "/dataportal/img/ecr.png",
  "The Left": "/dataportal/img/theleft.png",
  "ESN": "/dataportal/img/esn.png",
  "PfE": "/dataportal/img/pfe.png",
};

// Map country names to ISO codes for flags
const COUNTRY_CODES: Record<string, keyof typeof flags> = {
  "Austria": "AT", "Belgium": "BE", "Bulgaria": "BG", "Croatia": "HR",
  "Cyprus": "CY", "Czech Republic": "CZ", "Czechia": "CZ", "Denmark": "DK",
  "Estonia": "EE", "Finland": "FI", "France": "FR", "Germany": "DE",
  "Greece": "GR", "Hungary": "HU", "Ireland": "IE", "Italy": "IT",
  "Latvia": "LV", "Lithuania": "LT", "Luxembourg": "LU", "Malta": "MT",
  "Netherlands": "NL", "Holland": "NL", "Poland": "PL", "Portugal": "PT",
  "Romania": "RO", "Slovakia": "SK", "Slovenia": "SI", "Spain": "ES", "Sweden": "SE",
  "Østrig": "AT", "Belgien": "BE", "Bulgarien": "BG", "Kroatien": "HR",
  "Cypern": "CY", "Tjekkiet": "CZ", "Danmark": "DK", "Estland": "EE",
  "Frankrig": "FR", "Tyskland": "DE", "Grækenland": "GR", "Ungarn": "HU",
  "Irland": "IE", "Italien": "IT", "Letland": "LV", "Litauen": "LT",
  "Nederlandene": "NL", "Polen": "PL", "Rumænien": "RO", "Slovakiet": "SK",
  "Slovenien": "SI", "Spanien": "ES", "Sverige": "SE",
};

/* ── Shared vote distribution bar ─────────────────────────── */

function VoteBar({ forCount, againstCount, abstentionCount }: {
  forCount: number; againstCount: number; abstentionCount: number;
}) {
  const total = forCount + againstCount + abstentionCount;
  if (total === 0) return null;
  const forPct = (forCount / total) * 100;
  const abstPct = (abstentionCount / total) * 100;
  const againstPct = (againstCount / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-6 flex rounded overflow-hidden">
        {forPct > 0 && (
          <div className="h-full" style={{ width: `${forPct}%`, backgroundColor: VOTE_COLORS.For }}
            title={`For: ${forCount} (${forPct.toFixed(1)}%)`} />
        )}
        {abstPct > 0 && (
          <div className="h-full" style={{ width: `${abstPct}%`, backgroundColor: VOTE_COLORS.Abstention }}
            title={`Undlod: ${abstentionCount} (${abstPct.toFixed(1)}%)`} />
        )}
        {againstPct > 0 && (
          <div className="h-full" style={{ width: `${againstPct}%`, backgroundColor: VOTE_COLORS.Against }}
            title={`Imod: ${againstCount} (${againstPct.toFixed(1)}%)`} />
        )}
      </div>
    </div>
  );
}

/* ── Sortable table header helper ─────────────────────────── */

function SortHeader({ label, active, order, onClick }: {
  label: string; active: boolean; order: 'asc' | 'desc'; onClick: () => void;
}) {
  return (
    <th className="py-3 px-2 cursor-pointer hover:bg-gray-100 select-none" onClick={onClick}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {active && <span className="text-xs">{order === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </th>
  );
}

/* ── Winning Coalition Card ────────────────────────────────── */

export function WinningCoalitionCard({ coalition }: { coalition: WinningCoalitionInfo }) {
  if (!coalition["Winning Coalition"] || coalition["Winning Coalition"].length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Vindende koalition</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {coalition["Winning Coalition"].map((group, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: GROUP_COLORS[group] || '#999999' }}
                title={group}
              />
              <span className="font-medium">{group}</span>
              {index < coalition["Winning Coalition"].length - 1 && (
                <span className="text-gray-400 mx-1">+</span>
              )}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Flertal</div>
            <div className="font-semibold">{coalition["Majority Vote"]}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Frekvens</div>
            <div className="font-semibold">{coalition["Coalition Frequency"]}%</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-xs text-gray-600">Klassifikation</div>
            <div className="font-semibold">{coalition["Coalition Classification"]}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Metadata Card ────────────────────────────────────────── */

interface MetadataCardProps {
  committees?: Array<{code: string; name: string}>;
  subjectmatter?: Array<{code: string; name?: string}>;
  eurovocTopics?: Array<{id: string; label: string}>;
  committeeNames: Record<string, string>;
}

export function MetadataCard({ committees, subjectmatter, eurovocTopics, committeeNames }: MetadataCardProps) {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">Udvalg</div>
          <div className="font-medium">
            {committees && committees.length > 0
              ? committees.map(c => c.name || committeeNames[c.code] || c.code).join(", ")
              : "Ikke angivet"}
          </div>
          <div className="text-sm text-gray-600 mb-1">Emne</div>
          <div className="font-medium">
            {subjectmatter && subjectmatter.length > 0
              ? subjectmatter.map(sm => sm.code).join(", ")
              : "Ikke angivet"}
          </div>
        </div>
      </div>
      {eurovocTopics && eurovocTopics.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Eurovoc Emner</div>
          <div className="flex flex-wrap gap-2">
            {eurovocTopics.map((topic, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {topic.label || topic.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Group Breakdown Table ────────────────────────────────── */

export function GroupBreakdownTable({ byGroup }: {
  byGroup?: {[groupName: string]: {For: number; Against: number; Abstention: number}};
}) {
  const [sortBy, setSortBy] = useState<'name' | 'votes'>('votes');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const groups = byGroup
    ? Object.entries(byGroup).map(([group, votes]) => ({
        Group: group, For: votes.For, Against: votes.Against, Abstention: votes.Abstention
      }))
    : [];

  const handleSort = (by: 'name' | 'votes') => {
    if (sortBy === by) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(by); setSortOrder(by === 'name' ? 'asc' : 'desc'); }
  };

  const sorted = [...groups].sort((a, b) => {
    if (sortBy === 'name') {
      const cmp = a.Group.localeCompare(b.Group);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    const cmp = (a.For + a.Against + a.Abstention) - (b.For + b.Against + b.Abstention);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  if (groups.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Fordeling efter politisk gruppe</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <SortHeader label="Gruppe" active={sortBy === 'name'} order={sortOrder} onClick={() => handleSort('name')} />
              <SortHeader label="Stemmer" active={sortBy === 'votes'} order={sortOrder} onClick={() => handleSort('votes')} />
              <th className="text-left py-3 px-2 min-w-[200px]">Fordeling</th>
              <th className="text-right py-3 px-2">Flertal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((group, index) => {
              const total = group.For + group.Against + group.Abstention;
              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      {GROUP_LOGOS[group.Group] ? (
                        <Image src={GROUP_LOGOS[group.Group]} alt={group.Group} width={32} height={32} className="object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded border-2 border-white shadow-sm"
                          style={{ backgroundColor: GROUP_COLORS[group.Group] || '#999999' }} />
                      )}
                      <span className="font-semibold">{group.Group}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">{total}</td>
                  <td className="py-3 px-2">
                    <VoteBar forCount={group.For} againstCount={group.Against} abstentionCount={group.Abstention} />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-semibold">{getMajorityLabel(group.For, group.Against, group.Abstention)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── Country Breakdown Table ──────────────────────────────── */

export function CountryBreakdownTable({ byCountry }: {
  byCountry?: {[countryName: string]: {For: number; Against: number; Abstention: number; "Did not vote"?: number; "Potential Disagreement"?: boolean; Disagreements?: number}};
}) {
  const [sortBy, setSortBy] = useState<'name' | 'votes'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const countries = byCountry
    ? Object.entries(byCountry).map(([country, votes]) => ({
        Country: country, For: votes.For, Against: votes.Against, Abstention: votes.Abstention,
        "Did not vote": votes["Did not vote"] ?? 0, "Potential Disagreement": votes["Potential Disagreement"] ?? false,
        Disagreements: votes.Disagreements ?? 0
      }))
    : [];

  const handleSort = (by: 'name' | 'votes') => {
    if (sortBy === by) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(by); setSortOrder(by === 'name' ? 'asc' : 'desc'); }
  };

  const sorted = [...countries].sort((a, b) => {
    if (sortBy === 'name') {
      const cmp = a.Country.localeCompare(b.Country);
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    const cmp = (a.For + a.Against + a.Abstention) - (b.For + b.Against + b.Abstention);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  if (countries.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Fordeling efter land</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <SortHeader label="Land" active={sortBy === 'name'} order={sortOrder} onClick={() => handleSort('name')} />
              <SortHeader label="Stemmer" active={sortBy === 'votes'} order={sortOrder} onClick={() => handleSort('votes')} />
              <th className="text-left py-3 px-2 min-w-[200px]">Fordeling</th>
              <th className="text-center py-3 px-2">Brud med gruppe</th>
              <th className="text-right py-3 px-2">Flertal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((country, index) => {
              const total = country.For + country.Against + country.Abstention;
              const countryCode = COUNTRY_CODES[country.Country];
              const FlagComponent = countryCode ? flags[countryCode] : null;
              return (
                <tr key={index} className={`border-b hover:bg-gray-50 ${country["Potential Disagreement"] ? 'bg-yellow-50' : ''}`}>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {FlagComponent && <FlagComponent className="w-6 h-4 rounded shadow-sm" />}
                      <span className="font-semibold">{country.Country}</span>
                      {country["Potential Disagreement"] && (
                        <span className="text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded">Uenighed</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">{total}</td>
                  <td className="py-3 px-2">
                    <VoteBar forCount={country.For} againstCount={country.Against} abstentionCount={country.Abstention} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    {country.Disagreements > 0
                      ? <span className="font-semibold text-orange-600">{country.Disagreements}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-semibold">{getMajorityLabel(country.For, country.Against, country.Abstention)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── MEP Votes List ───────────────────────────────────────── */

export function MEPVotesList({ votes, byGroup }: {
  votes: MEPVote[];
  byGroup: {[groupName: string]: {For: number; Against: number; Abstention: number}};
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Compute group majority votes for break indicators
  const groupMajorityVotes = Object.entries(byGroup).reduce((acc, [groupName, groupVotes]) => {
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

  const filtered = votes.filter(vote =>
    vote["MEP Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.Country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote["Political Group"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote["National Party"]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (votes.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Alle MEP stemmer ({votes.length})</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Søg efter navn, land, gruppe eller parti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="text-xs text-gray-600 mb-2">Viser {filtered.length} af {votes.length} stemmer</div>
      <div className="text-xs text-gray-600 mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500" aria-hidden="true" />
        <span>Orange prik = afviger fra gruppens flertal</span>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map((vote, index) => {
          const mepVote = normalizeVoteLabel(vote.Vote);
          const groupMajority = groupMajorityVotes[vote["Political Group"]] ?? null;
          const breaksGroup = !!(mepVote && groupMajority && mepVote !== groupMajority);
          return (
            <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: GROUP_COLORS[vote["Political Group"]] || '#999999' }}
                    title={vote["Political Group"]} />
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{vote["MEP Name"]}</span>
                      {breaksGroup && (
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500"
                          title="Afviger fra gruppens flertal" aria-label="Afviger fra gruppens flertal" />
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {vote.Country} • {vote["Political Group"]} • {vote["National Party"]}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: VOTE_COLORS[vote.Vote] || '#000' }}>
                  {vote.Vote}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Related Votes Table ──────────────────────────────────── */

export function RelatedVotesTable({ votes }: { votes: RelatedVote[] }) {
  if (votes.length === 0) return null;

  const sorted = [...votes].sort((a, b) => parseInt(b["Vote ID"]) - parseInt(a["Vote ID"]));

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Relaterede afstemninger ({votes.length})</h2>
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
            {sorted.map((vote, index) => {
              const total = (vote.For || 0) + (vote.Against || 0) + (vote.Abstention || 0);
              return (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <Link href={`/vote?id=${vote["Vote ID"]}`} className="text-blue-600 hover:underline font-medium">
                      {vote["Vote Description"] || `Afstemning #${vote["Vote ID"]}`}
                    </Link>
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">{total}</td>
                  <td className="py-3 px-2">
                    <VoteBar forCount={vote.For || 0} againstCount={vote.Against || 0} abstentionCount={vote.Abstention || 0} />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="font-semibold">{getMajorityLabel(vote.For || 0, vote.Against || 0, vote.Abstention || 0)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
