"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { CommitteeMetadata, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";
import { GROUP_COLORS } from "@/lib/group-colors";

const committeeNames = committeeNamesData as CommitteeAndGroupNames;

interface CommitteeOverviewProps {
  data: CommitteeMetadata;
}

// List of all committees
const ALL_COMMITTEES = [
  "AFCO", "AFET", "AGRI", "BUDG", "CONT", "CULT", "DEVE", "ECON",
  "EMPL", "ENVI", "FEMM", "IMCO", "INTA", "ITRE", "JURI", "LIBE",
  "PECH", "PETI", "REGI", "TRAN"
];

export function CommitteeOverview({ data }: CommitteeOverviewProps) {
  const router = useRouter();
  const info = data.committee_info;
  const votes = data.documents_and_cases.votes.votes;
  const members = data.committee_membership.members;
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const handleCommitteeChange = (code: string) => {
    router.push(`/committee?code=${code}`);
  };

  // Get unique countries from members
  const countries = useMemo(() => {
    const uniqueCountries = new Set(members.map(m => m.country));
    return Array.from(uniqueCountries).sort();
  }, [members]);

  // Filter members by country
  const filteredMembers = useMemo(() => {
    if (countryFilter === 'all') return members;
    return members.filter(m => m.country === countryFilter);
  }, [members, countryFilter]);

  return (
    <div className="space-y-6">
      {/* Committee Selector */}
      <Card className="p-4">
        <label className="block text-sm font-medium mb-2">Vælg udvalg:</label>
        <select
          value={info.code}
          onChange={(e) => handleCommitteeChange(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ALL_COMMITTEES.map(code => (
            <option key={code} value={code}>
              {code} - {committeeNames.committee_names[code] || code}
            </option>
          ))}
        </select>
      </Card>

      {/* Header with committee info */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{info.name}</h1>
        <p className="text-gray-600">Udvalg: {info.code}</p>
      </div>

      {/* Info Card */}
      <Card className="p-6">
        <p className="text-gray-700 leading-relaxed">
          {info.name} behandler lovforslag og rapporter inden for sit specifikke ansvarsområde.
          Udvalget består af <span className="font-semibold text-gray-900">{data.committee_membership.total_members} medlemmer</span> fra alle politiske grupper.
          Her kan du se udvalgets afstemninger, medlemmer, sager og analyser af behandlede emner.
        </p>
      </Card>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total afstemninger</div>
          <div className="text-3xl font-bold" style={{ color: '#80d8a8' }}>
            {info.total_votes}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Stemmer i alt</div>
          <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>
            {info.total_vote_instances.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Andel af alle stemmer</div>
          <div className="text-3xl font-bold" style={{ color: '#adcdea' }}>
            {info.percentage_of_all_votes}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Medlemmer</div>
          <div className="text-3xl font-bold" style={{ color: '#80d8a8' }}>
            {data.committee_membership.total_members}
          </div>
        </Card>
      </div>

      {/* Time Period */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Tidsperiode</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Første afstemning</div>
            <div className="text-lg font-bold">{data.time_period.first_vote}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Seneste afstemning</div>
            <div className="text-lg font-bold">{data.time_period.last_vote}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Aktive dage</div>
            <div className="text-lg font-bold">{data.time_period.active_days}</div>
          </div>
        </div>
      </Card>

      {/* Roles Distribution */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Roller Fordeling</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(data.committee_membership.roles_summary).map(([role, count]) => (
            <div key={role} className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">{role}</div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Members */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Udvalgsmedlemmer ({members.length})</h2>
        <div className="text-xs text-gray-600 mb-4">{data.committee_membership.note}</div>

        {/* Country Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filtrer efter land:</label>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle lande ({members.length})</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country} ({members.filter(m => m.country === country).length})
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600 mb-3">
          Viser {filteredMembers.length} af {members.length} medlemmer
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredMembers.map((member, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: GROUP_COLORS[member.political_group] || '#999999' }}
                  title={member.political_group}
                />
                <div>
                  <div className="font-semibold text-sm">{member.name}</div>
                  <div className="text-xs text-gray-600">{member.country} • {member.political_group}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-700">{member.role}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Votes */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Afstemninger ({votes.length})</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {votes.map((vote, index) => (
            <div
              key={index}
              onClick={() => router.push(`/vote?id=${vote.vote_id}`)}
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">
                    {vote.short_title || (vote.title !== "Ukendt titel" ? vote.title : vote.description)}
                  </h3>
                  {(vote.short_title || vote.title !== "Ukendt titel") && (
                    <p className="text-xs text-gray-600">{vote.description}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-xs text-gray-600">{vote.date}</div>
                  <div className={`text-sm font-bold ${vote.majority_decision === "For" ? "text-green-600" : "text-red-600"}`}>
                    {vote.majority_decision}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-600">For: {vote.vote_distribution.For}</span>
                <span className="text-red-600">Imod: {vote.vote_distribution.Against}</span>
                <span className="text-gray-600">Undlod: {vote.vote_distribution.Abstention}</span>
                <span className="text-gray-500">Enighed: {(vote.consensus_measure * 100).toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Subject Matter Analysis */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Emneanalyse ({data.subject_matter_analysis.unique_subject_matters} unikke emner)
        </h2>
        <div className="space-y-2">
          {data.subject_matter_analysis.subject_matter_frequency.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium">{item.subject_matter}</span>
                  <span className="text-gray-600">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Eurovoc Analysis */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Eurovoc Termer ({data.eurovoc_analysis.unique_eurovoc_terms} unikke termer)
        </h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.eurovoc_analysis.eurovoc_frequency.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="font-medium">{item.eurovoc_term}</span>
                  <span className="text-gray-600">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
