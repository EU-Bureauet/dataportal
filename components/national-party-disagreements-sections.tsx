"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { GROUP_COLORS } from "@/lib/group-colors";

interface PartyMep {
  mep_id: string;
  name: string;
  political_group: string;
}

interface DisagreementVote {
  vote_id: string;
  vote_description: string;
  sitting_date: string;
  participating_meps: number;
  total_party_meps: number;
  vote_breakdown: {
    For?: string[];
    Against?: string[];
    Abstention?: string[];
  };
}

interface PartyData {
  party_info: {
    total_meps: number;
    meps: PartyMep[];
  };
  disagreement_statistics: {
    disagreement_rate_percent: number;
    total_disagreements: number;
    total_votes_analyzed: number;
  };
  disagreement_votes: DisagreementVote[];
}

interface PartyWithCountry {
  fullPartyName: string;
  partyName: string;
  country: string;
  data: PartyData;
}

const getGroupColor = (groupName: string): string => {
  if (GROUP_COLORS[groupName]) return GROUP_COLORS[groupName];
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

/* ── Vote Breakdown Badges ────────────────────────────────── */

function VoteBreakdownBadges({ label, names, colorClass }: { label: string; names: string[]; colorClass: string }) {
  if (names.length === 0) return null;
  return (
    <div>
      <div className={`text-sm font-semibold mb-2 ${colorClass}`}>
        {label} ({names.length}):
      </div>
      <div className="flex flex-wrap gap-2">
        {names.map((mepName) => (
          <span key={mepName} className={`px-3 py-1 rounded-full text-sm ${colorClass.replace('text-', 'bg-').replace('-700', '-100')} ${colorClass.replace('-700', '-800')}`}>
            {mepName}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Party Detail View ────────────────────────────────────── */

interface PartyDetailViewProps {
  partyData: PartyWithCountry;
  expandedVote: string | null;
  setExpandedVote: (voteId: string | null) => void;
  onBack: () => void;
}

export function PartyDetailView({ partyData, expandedVote, setExpandedVote, onBack }: PartyDetailViewProps) {
  const router = useRouter();

  return (
    <>
      <Card className="p-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
        >
          ← Tilbage til oversigt
        </button>

        <div className="border-b pb-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-2xl font-bold">{partyData.partyName}</h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
              {partyData.country}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {partyData.data.disagreement_statistics.disagreement_rate_percent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Uenighedsprocent</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {partyData.data.disagreement_statistics.total_disagreements}
              </div>
              <div className="text-sm text-gray-600">Totale uenigheder</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {partyData.data.disagreement_statistics.total_votes_analyzed}
              </div>
              <div className="text-sm text-gray-600">Afstemninger analyseret</div>
            </div>
          </div>
        </div>

        {/* Party Members */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Partimedlemmer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {partyData.data.party_info.meps.map((mep) => {
              const groupColor = getGroupColor(mep.political_group);
              return (
                <div key={mep.mep_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: groupColor }}
                    title={mep.political_group}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{mep.name}</div>
                    <div className="text-xs text-gray-600 truncate">{mep.political_group}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Disagreement Votes */}
      <div>
        <h3 className="text-xl font-bold mb-4">
          Afstemninger med uenighed ({partyData.data.disagreement_votes.length})
        </h3>
        <div className="space-y-4">
          {partyData.data.disagreement_votes.map((vote) => (
            <Card
              key={vote.vote_id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/vote?id=${vote.vote_id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600">
                    {vote.vote_description}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{vote.sitting_date}</span>
                    <span>•</span>
                    <span>{vote.participating_meps} af {vote.total_party_meps} medlemmer deltog</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedVote(expandedVote === vote.vote_id ? null : vote.vote_id);
                  }}
                  className="ml-4 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm font-medium text-blue-700"
                >
                  {expandedVote === vote.vote_id ? "Skjul detaljer" : "Vis detaljer"}
                </button>
              </div>

              {/* Vote Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                {vote.vote_breakdown.For && vote.vote_breakdown.For.length > 0 && (
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-lg font-bold text-green-700">{vote.vote_breakdown.For.length}</div>
                    <div className="text-xs text-gray-600">For</div>
                  </div>
                )}
                {vote.vote_breakdown.Against && vote.vote_breakdown.Against.length > 0 && (
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-lg font-bold text-red-700">{vote.vote_breakdown.Against.length}</div>
                    <div className="text-xs text-gray-600">Imod</div>
                  </div>
                )}
                {vote.vote_breakdown.Abstention && vote.vote_breakdown.Abstention.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="text-lg font-bold text-yellow-700">{vote.vote_breakdown.Abstention.length}</div>
                    <div className="text-xs text-gray-600">Undlod</div>
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {expandedVote === vote.vote_id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <VoteBreakdownBadges label="Stemte for" names={vote.vote_breakdown.For || []} colorClass="text-green-700" />
                  <VoteBreakdownBadges label="Stemte imod" names={vote.vote_breakdown.Against || []} colorClass="text-red-700" />
                  <VoteBreakdownBadges label="Undlod at stemme" names={vote.vote_breakdown.Abstention || []} colorClass="text-yellow-700" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
