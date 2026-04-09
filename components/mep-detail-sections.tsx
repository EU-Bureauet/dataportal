"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { MEPData, getCurrentCommitteeMemberships, getPreviousCommitteeMemberships, formatRole } from "@/types/data";
import { GROUP_COLORS } from "@/lib/group-colors";

function formatName(fullName: string): string {
  return fullName
    .split(' ')
    .map(part => part.split('-').map(sub => sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase()).join('-'))
    .join(' ');
}

const extractCountryCode = (countryUrl: string): string => {
  const match = countryUrl.match(/country\/([A-Z]{3})$/);
  return match ? match[1] : countryUrl;
};

const COUNTRY_NAMES: Record<string, string> = {
  "AUT": "Østrig", "BEL": "Belgien", "BGR": "Bulgarien", "HRV": "Kroatien",
  "CYP": "Cypern", "CZE": "Tjekkiet", "DNK": "Danmark", "EST": "Estland",
  "FIN": "Finland", "FRA": "Frankrig", "DEU": "Tyskland", "GRC": "Grækenland",
  "HUN": "Ungarn", "IRL": "Irland", "ITA": "Italien", "LVA": "Letland",
  "LTU": "Litauen", "LUX": "Luxembourg", "MLT": "Malta", "NLD": "Holland",
  "POL": "Polen", "PRT": "Portugal", "ROU": "Rumænien", "SVK": "Slovakiet",
  "SVN": "Slovenien", "ESP": "Spanien", "SWE": "Sverige"
};

/* ── Header Card ──────────────────────────────────────────── */

export function MEPHeaderCard({ mep }: { mep: MEPData }) {
  const countryCode = extractCountryCode(mep.country_code);
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;
  const birthdate = mep.birthdate || "Ikke tilgængelig";
  const partyName = mep.national_party_id?.name || "ukendt parti";
  const groupName = mep.current_group_id?.name || "ukendt gruppe";

  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mep.photo_url}
            alt={mep.full_name}
            className="w-48 h-48 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-4">{formatName(mep.full_name)}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Land</div>
              <div className="text-lg font-semibold">{countryName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Fødselsdato</div>
              <div className="text-lg font-semibold">{birthdate}</div>
            </div>
            {mep.place_of_birth && (
              <div>
                <div className="text-sm text-gray-600">Fødested</div>
                <div className="text-lg font-semibold">{mep.place_of_birth}</div>
              </div>
            )}
          </div>
          {mep.links && (
            <div className="mt-4 flex gap-3">
              {mep.links.ep_profile && (
                <a href={mep.links.ep_profile} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">EP Profil</a>
              )}
              {mep.links.homepage && (
                <a href={mep.links.homepage} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm">Hjemmeside</a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 pt-6 border-t">
        <p className="text-gray-700 leading-relaxed">
          {formatName(mep.full_name)} er medlem af Europa-Parlamentet for {countryName} og repræsenterer {partyName} i den politiske gruppe {groupName}. Her kan du få et samlet overblik over hendes/hans parlamentariske arbejde, stemmeadfærd og udvalgsposter.
        </p>
      </div>
    </Card>
  );
}

/* ── Political Affiliations ───────────────────────────────── */

export function PoliticalAffiliationsCards({ mep }: { mep: MEPData }) {
  const groupColor = GROUP_COLORS[mep.current_group_id?.code || ''] || '#999999';
  const groupName = mep.current_group_id?.name || "Ukendt";
  const groupCode = mep.current_group_id?.code || "N/A";
  const partyName = mep.national_party_id?.name || "Ukendt parti";
  const partyCode = mep.national_party_id?.code || "N/A";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Politisk gruppe i Europa-Parlamentet</h2>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: groupColor }} />
          <div>
            <div className="font-semibold text-lg">{groupName}</div>
            <div className="text-sm text-gray-600">{groupCode}</div>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Nationalt parti</h2>
        <div>
          <div className="font-semibold text-lg">{partyName}</div>
          <div className="text-sm text-gray-600">{partyCode}</div>
        </div>
      </Card>
    </div>
  );
}

/* ── Voting Statistics ────────────────────────────────────── */

export function VotingStatsCard({ mep }: { mep: MEPData }) {
  const nVotes = mep.n_votes?.toLocaleString() || "0";
  const participation = mep.participation_pct?.toFixed(1) || "0";
  const groupLoyalty = mep.group_loyalty?.toFixed(1) || "0";
  const nVotesAgainst = mep.n_votes_against_group?.toLocaleString() || "0";
  const nVotesWith = mep.n_votes_with_group?.toLocaleString() || "0";

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Afstemningsstatistik</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Total stemmer</div>
          <div className="text-3xl font-bold" style={{ color: '#80d8a8' }}>{nVotes}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Deltagelse</div>
          <div className="text-3xl font-bold" style={{ color: '#adcdea' }}>{participation}%</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Gruppe-loyalitet</div>
          <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{groupLoyalty}%</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Stemmer mod gruppe</div>
          <div className="text-3xl font-bold text-red-600">{nVotesAgainst}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-gray-700">Stemmer med gruppe</span>
          <span className="text-lg font-bold text-green-700">{nVotesWith}</span>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <span className="text-sm text-gray-700">Stemmer imod gruppe</span>
          <span className="text-lg font-bold text-red-700">{nVotesAgainst}</span>
        </div>
      </div>
    </Card>
  );
}

/* ── Current Committees ───────────────────────────────────── */

export function CurrentCommitteesSection({ mep }: { mep: MEPData }) {
  const currentCommittees = getCurrentCommitteeMemberships(mep);
  if (currentCommittees.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Nuværende udvalgsmedlemskaber ({currentCommittees.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentCommittees.map((committee, index) => (
          <Link key={index} href={`/committee?code=${committee.organizationCode}`}
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="font-semibold">{committee.organizationName}</div>
            <div className="text-sm text-gray-600 mt-1">{formatRole(committee.role)} • {committee.organizationCode}</div>
            <div className="text-xs text-gray-500 mt-1">Siden {committee.startDate}</div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/* ── Current Delegations ──────────────────────────────────── */

export function CurrentDelegationsSection({ mep }: { mep: MEPData }) {
  const delegations = mep.memberships?.["def/ep-entities/DELEGATION_PARLIAMENTARY"]?.filter(d => d.active === 1) || [];
  if (delegations.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Nuværende delegationer ({delegations.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {delegations.map((delegation, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="font-semibold">{delegation.organization_name}</div>
            <div className="text-sm text-gray-600 mt-1">{formatRole(delegation.role)} • {delegation.organization_code}</div>
            <div className="text-xs text-gray-500 mt-1">Siden {delegation.startDate}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Group History (Collapsible) ──────────────────────────── */

export function GroupHistorySection({ mep }: { mep: MEPData }) {
  const [isOpen, setIsOpen] = useState(false);
  const groupHistory = mep.memberships?.["def/ep-entities/EU_POLITICAL_GROUP"] || [];
  if (groupHistory.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 cursor-pointer flex items-center justify-between hover:text-blue-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}>
        <span>Politisk gruppe i Europa-Parlamentet – historik</span>
        <span className="text-2xl">{isOpen ? '−' : '+'}</span>
      </h2>
      {isOpen && (
        <div className="space-y-3">
          {groupHistory
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
            .map((group, index) => (
              <div key={index} className={`p-4 border rounded-lg ${group.active === 1 ? 'bg-green-50 border-green-300' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border-2 border-white shadow-sm"
                      style={{ backgroundColor: GROUP_COLORS[group.organization_code] || '#999999' }} />
                    <div>
                      <div className="font-semibold">{group.organization_name}</div>
                      <div className="text-sm text-gray-600">{group.organization_code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{group.startDate} - {group.endDate || "nu"}</div>
                    {group.active === 1 && (
                      <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">Aktiv</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}

/* ── Previous Committees (Collapsible) ────────────────────── */

export function PreviousCommitteesSection({ mep }: { mep: MEPData }) {
  const [isOpen, setIsOpen] = useState(false);
  const previousCommittees = getPreviousCommitteeMemberships(mep);
  if (previousCommittees.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 cursor-pointer flex items-center justify-between hover:text-blue-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}>
        <span>Tidligere udvalgsmedlemskaber ({previousCommittees.length})</span>
        <span className="text-2xl">{isOpen ? '−' : '+'}</span>
      </h2>
      {isOpen && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {previousCommittees.map((committee, index) => (
            <div key={index} className="p-3 border rounded-lg bg-gray-50">
              <div className="font-semibold text-sm">{committee.organizationName}</div>
              <div className="text-xs text-gray-600 mt-1">{formatRole(committee.role)} • {committee.organizationCode}</div>
              <div className="text-xs text-gray-500 mt-1">{committee.startDate}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Previous Delegations (Collapsible) ───────────────────── */

export function PreviousDelegationsSection({ mep }: { mep: MEPData }) {
  const [isOpen, setIsOpen] = useState(false);
  const previousDelegations = mep.memberships?.["def/ep-entities/DELEGATION_PARLIAMENTARY"]?.filter(d => d.active === 0) || [];
  if (previousDelegations.length === 0) return null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4 cursor-pointer flex items-center justify-between hover:text-blue-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}>
        <span>Tidligere delegationer ({previousDelegations.length})</span>
        <span className="text-2xl">{isOpen ? '−' : '+'}</span>
      </h2>
      {isOpen && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {previousDelegations
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
            .map((delegation, index) => (
              <div key={index} className="p-3 border rounded-lg bg-gray-50">
                <div className="font-semibold text-sm">{delegation.organization_name}</div>
                <div className="text-xs text-gray-600 mt-1">{formatRole(delegation.role)} • {delegation.organization_code}</div>
                <div className="text-xs text-gray-500 mt-1">{delegation.startDate} - {delegation.endDate || "ukendt"}</div>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
