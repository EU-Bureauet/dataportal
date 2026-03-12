"use client"

import React, { useState, Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { compareGroups } from "@/lib/vote-comparison";
import { voteValueToLabel, voteValueToBgColor } from "@/types/data";
import { useRouter } from 'next/navigation';

// List of political groups
const POLITICAL_GROUPS = [
  { id: "EPP", name: "Group of the European People's Party (Christian Democrats)" },
  { id: "S&D", name: "Progressive Alliance of Socialists and Democrats" },
  { id: "Renew", name: "Renew Europe Group" },
  { id: "Greens-EFA", name: "Greens/European Free Alliance" },
  { id: "ECR", name: "European Conservatives and Reformists Group" },
  { id: "The-Left", name: "The Left group in the European Parliament - GUE/NGL" },
  { id: "PfE", name: "Patriots for Europe Group" },
  { id: "ESN", name: "Europe of Sovereign Nations Group" },
  { id: "NI", name: "Non-attached Members" }
];

interface GroupComparison {
  group1_info: { total_meps: number };
  group2_info: { total_meps: number };
  agreement_rate: number;
  disagreement_rate: number;
  total_comparable_votes: number;
  agreement_count: number;
  disagreement_count: number;
  agreements: Array<{ vote_id: string; entity1_vote: number | null; entity2_vote: number | null }>;
  disagreements: Array<{ vote_id: string; entity1_vote: number | null; entity2_vote: number | null }>;
}

function CompareGroupsPage() {
  const router = useRouter();
  const [group1Id, setGroup1Id] = useState<string>("");
  const [group2Id, setGroup2Id] = useState<string>("");
  const [comparison, setComparison] = useState<GroupComparison | null>(null);
  const [comparedGroup1Id, setComparedGroup1Id] = useState<string>("");
  const [comparedGroup2Id, setComparedGroup2Id] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAgreements, setShowAgreements] = useState(true);
  const [showDisagreements, setShowDisagreements] = useState(true);

  const handleCompare = async () => {
    if (!group1Id || !group2Id) {
      setError("Please select both groups");
      return;
    }

    if (group1Id === group2Id) {
      setError("Please select two different groups");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await compareGroups(group1Id, group2Id);
      setComparison(result);
      setComparedGroup1Id(group1Id);
      setComparedGroup2Id(group2Id);
    } catch (err) {
      setError(`Failed to compare groups: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const getGroupName = (groupId: string) => {
    return POLITICAL_GROUPS.find(g => g.id === groupId)?.name || groupId;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Sammenlign Politiske Grupper</h1>
        <p className="text-gray-600 mb-8">
          Sammenlign afstemningsmønstre for to politiske grupper i Europa-Parlamentet
        </p>

        {/* Group Selection */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Vælg første gruppe:</label>
              <select
                value={group1Id}
                onChange={(e) => setGroup1Id(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Vælg gruppe...</option>
                {POLITICAL_GROUPS.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Vælg anden gruppe:</label>
              <select
                value={group2Id}
                onChange={(e) => setGroup2Id(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Vælg gruppe...</option>
                {POLITICAL_GROUPS.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || !group1Id || !group2Id}
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
                  <h3 className="font-semibold text-lg mb-2">{getGroupName(comparedGroup1Id)}</h3>
                  <div className="text-sm text-gray-600">
                    {comparison.group1_info.total_meps} medlemmer
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">{getGroupName(comparedGroup2Id)}</h3>
                  <div className="text-sm text-gray-600">
                    {comparison.group2_info.total_meps} medlemmer
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
                            {getGroupName(comparedGroup1Id)}: {voteValueToLabel(vote.entity1_vote)}
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity2_vote)}`}>
                            {getGroupName(comparedGroup2Id)}: {voteValueToLabel(vote.entity2_vote)}
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
                            {getGroupName(comparedGroup1Id)}: {voteValueToLabel(vote.entity1_vote)}
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${voteValueToBgColor(vote.entity2_vote)}`}>
                            {getGroupName(comparedGroup2Id)}: {voteValueToLabel(vote.entity2_vote)}
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
      <CompareGroupsPage />
    </Suspense>
  );
}
