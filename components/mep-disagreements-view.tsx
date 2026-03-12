"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { MEPPartyDisagreements } from "@/types/data";
import { PARTY_COLORS } from "@/types/data";

interface MEPDisagreementsViewProps {
  data: MEPPartyDisagreements;
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

export function MEPDisagreementsView({ data }: MEPDisagreementsViewProps) {
  const router = useRouter();
  const [selectedMEP, setSelectedMEP] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get disagreements for selected MEP
  const selectedMEPDisagreements = useMemo(() => {
    if (!selectedMEP || !data?.mep_vs_party?.disagreements) return [];
    return data.mep_vs_party.disagreements.filter(
      d => d["MEP Name"] === selectedMEP
    );
  }, [selectedMEP, data]);

  // Get selected MEP's political group
  const selectedMEPPoliticalGroup = useMemo(() => {
    if (!selectedMEP || !data?.mep_vs_party?.mep_disagreement_counts) return null;
    const mepInfo = data.mep_vs_party.mep_disagreement_counts.find(
      m => m["MEP Name"] === selectedMEP
    );
    return mepInfo?.["Political_Group"] || null;
  }, [selectedMEP, data]);

  // Filter MEPs by search term
  const filteredMEPs = useMemo(() => {
    if (!data?.mep_vs_party?.mep_disagreement_counts) return [];
    if (!searchTerm) return data.mep_vs_party.mep_disagreement_counts;
    return data.mep_vs_party.mep_disagreement_counts.filter(mep =>
      mep["MEP Name"].toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep["National_Group"].toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, data]);

  // Sort MEPs by disagreement count
  const sortedMEPs = useMemo(() => {
    if (!filteredMEPs || filteredMEPs.length === 0) return [];
    return [...filteredMEPs].sort((a, b) =>
      b["Disagreement_Count"] - a["Disagreement_Count"]
    );
  }, [filteredMEPs]);

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      {!selectedMEP && (
        <>
          {/* Search */}
          <Card className="p-6">
            <label className="block text-sm font-medium mb-2">Søg:</label>
            <input
              type="text"
              placeholder="Søg efter MEP navn eller parti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 text-sm text-gray-600">
              Viser {sortedMEPs.length} medlemmer
            </div>
          </Card>

          {/* MEP Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMEPs.map((mep) => {
              const partyColor = PARTY_COLORS[mep["National_Group"]] || "#6B7280";
              const groupCode = mep["Political_Group"].includes("Renew") ? "Renew"
                              : mep["Political_Group"].includes("S&D") ? "S&D"
                              : mep["Political_Group"].includes("PPE") ? "PPE"
                              : mep["Political_Group"].includes("Verts") ? "Verts/ALE"
                              : mep["Political_Group"].includes("ECR") ? "ECR"
                              : mep["Political_Group"].includes("Left") ? "The Left"
                              : "NI";
              const groupColor = GROUP_COLORS[groupCode] || "#999999";

              return (
                <Card
                  key={mep["MEP Name"]}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedMEP(mep["MEP Name"])}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold">{mep["MEP Name"]}</h3>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: groupColor }}
                      title={mep["Political_Group"]}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: partyColor }}
                      />
                      <span className="text-sm text-gray-700">{mep["National_Group"]}</span>
                    </div>

                    <div className="text-xs text-gray-600">{mep["Political_Group"]}</div>

                    <div className="pt-3 border-t">
                      <div className="text-2xl font-bold text-red-600">
                        {mep["Disagreement_Count"]}
                      </div>
                      <div className="text-xs text-gray-600">Uenigheder med politisk gruppe</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Detailed View for Selected MEP */}
      {selectedMEP && (
        <>
          <Card className="p-6">
            <button
              onClick={() => setSelectedMEP(null)}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
            >
              ← Tilbage til oversigt
            </button>

            <div className="border-b pb-4 mb-4">
              <h2 className="text-2xl font-bold mb-2">{selectedMEP}</h2>
              <div className="text-gray-600">
                {selectedMEPDisagreements.length} uenigheder med politisk gruppe
              </div>
            </div>
          </Card>

          {/* Disagreement List */}
          <div className="space-y-4">
            {selectedMEPDisagreements.map((disagreement, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/vote?id=${disagreement["Vote ID"]}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold hover:text-blue-600">
                        {disagreement["Vote Description"]}
                      </h3>
                    </div>

                    {disagreement["Document Title"] && (
                      <div className="text-sm text-gray-700 mb-2">
                        {disagreement["Document Title"]}
                      </div>
                    )}

                    {disagreement["Document Link"] && (
                      <a
                        href={disagreement["Document Link"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Se dokument →
                      </a>
                    )}
                  </div>
                </div>

                {/* Voting details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">MEPs stemme:</div>
                    <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      disagreement["Vote Type"] === "For" ? "bg-green-100 text-green-800" :
                      disagreement["Vote Type"] === "Against" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {disagreement["Vote Type"]}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Flertal af politisk gruppe ({selectedMEPPoliticalGroup || disagreement["Group ID"]}):
                    </div>
                    <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                      disagreement["Vote Type_Majority"] === "For" ? "bg-green-100 text-green-800" :
                      disagreement["Vote Type_Majority"] === "Against" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {disagreement["Vote Type_Majority"]}
                    </div>
                  </div>
                </div>

                {/* EU Group Voting Breakdown */}
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium text-gray-700 mb-3">Hvordan EU-grupperne stemte:</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Object.entries(disagreement).filter(([key]) =>
                      ["PPE", "S&D", "Renew", "Verts/ALE", "ECR", "The Left", "ESN", "PfE", "NI"].includes(key)
                    ).map(([group, vote]) => {
                      if (!vote) return null;
                      return (
                        <div key={group} className="text-xs">
                          <span className="font-medium">{group}:</span>
                          <span className={`ml-1 ${
                            vote === "For" ? "text-green-700" :
                            vote === "Against" ? "text-red-700" :
                            "text-yellow-700"
                          }`}>
                            {vote as string}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {sortedMEPs.length === 0 && !selectedMEP && (
        <Card className="p-6">
          <p className="text-gray-600 text-center">Ingen medlemmer fundet med de valgte filtre</p>
        </Card>
      )}
    </div>
  );
}
