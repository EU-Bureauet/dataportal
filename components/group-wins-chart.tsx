"use client"

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { GroupWinsData, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";

const committeeNames = committeeNamesData as CommitteeAndGroupNames;

interface GroupWinsChartProps {
  data: GroupWinsData;
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
  "NI": "#999999"
};

export function GroupWinsChart({ data }: GroupWinsChartProps) {
  const [selectedCommittee, setSelectedCommittee] = useState<string>("TOTAL");

  // Get all available committees
  const committees = Object.keys(data).sort((a, b) => {
    if (a === "TOTAL") return -1;
    if (b === "TOTAL") return 1;
    return a.localeCompare(b);
  });

  // Handle different data structures: TOTAL has total_group_wins wrapper, committees are direct arrays
  const getRawData = (committee: string) => {
    const committeeData = data[committee];
    if (!committeeData) return [];

    // TOTAL has total_group_wins wrapper
    if (committee === "TOTAL" && 'total_group_wins' in committeeData) {
      return committeeData.total_group_wins;
    }

    // Other committees are direct arrays
    if (Array.isArray(committeeData)) {
      return committeeData;
    }

    return [];
  };

  const currentData = getRawData(selectedCommittee);

  // If no data available for this committee, show message
  if (currentData.length === 0) {
    return (
      <div className="space-y-6">
        {/* Committee selector */}
        <Card className="p-4">
          <label className="block text-sm font-medium mb-2">Vælg udvalg:</label>
          <select
            value={selectedCommittee}
            onChange={(e) => setSelectedCommittee(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {committees.map(committee => (
              <option key={committee} value={committee}>
                {committee === "TOTAL" ? "TOTAL - Alle afstemninger" : `${committee} - ${committeeNames.committee_names[committee] || committee}`}
              </option>
            ))}
          </select>
        </Card>

        <Card className="p-6">
          <p className="text-gray-600">Ingen data tilgængelig for dette udvalg.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Committee selector */}
      <Card className="p-4">
        <label className="block text-sm font-medium mb-2">Vælg udvalg:</label>
        <select
          value={selectedCommittee}
          onChange={(e) => setSelectedCommittee(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {committees.map(committee => (
            <option key={committee} value={committee}>
              {committee === "TOTAL" ? "TOTAL - Alle afstemninger" : `${committee} - ${committeeNames.committee_names[committee] || committee}`}
            </option>
          ))}
        </select>
      </Card>

      {/* Bar chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Vindende Koalitioner per Gruppe
          {selectedCommittee !== "TOTAL" && ` - ${committeeNames.committee_names[selectedCommittee] || selectedCommittee}`}
        </h2>
        <div className="space-y-3">
          {currentData.map((group, index) => (
            <div key={index} className="space-y-1">
              {/* Group name and percentage */}
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: GROUP_COLORS[group["Group ID"]] || '#999999' }}
                  />
                  <span className="font-semibold">{group["Group ID"]}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{group["Win Count"]} sejre</span>
                  <span className="font-bold text-lg min-w-[60px] text-right">
                    {group["Win Percentage"]}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                  style={{
                    width: `${group["Win Percentage"]}%`,
                    backgroundColor: GROUP_COLORS[group["Group ID"]] || '#999999',
                    opacity: 0.8
                  }}
                >
                  {group["Win Percentage"] > 15 && (
                    <span className="text-white font-bold text-sm drop-shadow">
                      {group["Win Percentage"]}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Statistics */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Statistik</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Højeste sejrsrate</div>
            <div className="text-2xl font-bold" style={{ color: '#80d8a8' }}>
              {currentData[0]?.["Group ID"]} - {currentData[0]?.["Win Percentage"]}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Laveste sejrsrate</div>
            <div className="text-2xl font-bold" style={{ color: '#adcdea' }}>
              {currentData[currentData.length - 1]?.["Group ID"]} - {currentData[currentData.length - 1]?.["Win Percentage"]}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Gennemsnitlig sejrsrate</div>
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
              {Math.round(currentData.reduce((sum, g) => sum + g["Win Percentage"], 0) / currentData.length)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Antal grupper</div>
            <div className="text-2xl font-bold" style={{ color: '#80d8a8' }}>
              {currentData.length}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
