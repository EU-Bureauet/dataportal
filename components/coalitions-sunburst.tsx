"use client"

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Coalition } from "@/types/data";
import { GROUP_COLORS } from "@/lib/group-colors";

interface CoalitionsSunburstProps {
  data: Coalition[];
}

// Frequency category colors (using theme colors)
const CATEGORY_COLORS = {
  "Dominant": "#80d8a8",     // Strong green - >20%
  "Common": "#a8e0b8",       // Medium green - 5-20%
  "Uncommon": "#ffff80",     // Yellow - 2-5%
  "Rare": "#adcdea"          // Blue - <2%
};

type FrequencyCategory = "Dominant" | "Common" | "Uncommon" | "Rare";

// Danish translations for category names
const CATEGORY_NAMES_DA: { [key in FrequencyCategory]: string } = {
  "Dominant": "Dominerende",
  "Common": "Almindelig",
  "Uncommon": "Mindre Almindelig",
  "Rare": "Sjælden"
};

// Categorize coalitions by frequency
const categorizeCoalition = (percentage: number): FrequencyCategory => {
  if (percentage >= 20) return "Dominant";
  if (percentage >= 5) return "Common";
  if (percentage >= 2) return "Uncommon";
  return "Rare";
};

export function CoalitionsSunburst({ data }: CoalitionsSunburstProps) {
  const [selectedCategory, setSelectedCategory] = useState<FrequencyCategory | null>(null);

  // Group coalitions by category
  const groupedData = data.map(coalition => ({
    ...coalition,
    category: categorizeCoalition(coalition.Percentage)
  }));

  // Count by category
  const categoryStats = {
    "Dominant": groupedData.filter(c => c.category === "Dominant"),
    "Common": groupedData.filter(c => c.category === "Common"),
    "Uncommon": groupedData.filter(c => c.category === "Uncommon"),
    "Rare": groupedData.filter(c => c.category === "Rare")
  };

  const categoryOrder: FrequencyCategory[] = ["Dominant", "Common", "Uncommon", "Rare"];

  // Filter data if a category is selected
  const displayData = selectedCategory
    ? groupedData.filter(c => c.category === selectedCategory)
    : groupedData.slice(0, 15); // Show top 15 by default

  return (
    <div className="space-y-6">
      {/* Sunburst-style visualization */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-center">Fordeling af Koalitioner</h2>

        {/* Inner Ring - Categories */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          <div className="text-sm text-gray-600 mb-2">Vælg en kategori for at se detaljer:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
            {categoryOrder.map((category) => {
              const stats = categoryStats[category];
              const totalPercentage = stats.reduce((sum, c) => sum + c.Percentage, 0);
              const isSelected = selectedCategory === category;

              // Category descriptions
              const descriptions: { [key in FrequencyCategory]: string } = {
                "Dominant": stats.length === 1
                  ? "Meget almindelig koalition der forekommer i mindst 1 ud af 5 afstemninger"
                  : "Meget almindelige koalitioner der forekommer i mindst 1 ud af 5 afstemninger",
                "Common": stats.length === 1
                  ? "Almindelig koalition der forekommer regelmæssigt"
                  : "Almindelige koalitioner der forekommer regelmæssigt",
                "Uncommon": stats.length === 1
                  ? "Mindre almindelig koalition der forekommer af og til"
                  : "Mindre almindelige koalitioner der forekommer af og til",
                "Rare": stats.length === 1
                  ? "Sjælden koalition der kun forekommer i få afstemninger"
                  : "Sjældne koalitioner der kun forekommer i få afstemninger"
              };

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(isSelected ? null : category)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                    isSelected ? 'ring-4 ring-blue-500 border-blue-500' : 'border-gray-300'
                  }`}
                  style={{
                    backgroundColor: CATEGORY_COLORS[category],
                    opacity: selectedCategory && !isSelected ? 0.5 : 1
                  }}
                >
                  <div className="font-bold text-lg mb-1">{CATEGORY_NAMES_DA[category]}</div>
                  <div className="text-xs text-gray-700 mb-2 leading-tight">
                    {descriptions[category]}
                  </div>
                  <div className="text-sm">
                    {stats.length} {stats.length === 1 ? 'koalition' : 'koalitioner'}
                  </div>
                  <div className="text-xs font-semibold mt-1">
                    {totalPercentage.toFixed(1)}% af stemmer
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear filter button */}
        {selectedCategory && (
          <div className="text-center mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
            >
              Vis alle kategorier
            </button>
          </div>
        )}
      </Card>

      {/* Outer Ring - Individual Coalitions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {selectedCategory ? `${CATEGORY_NAMES_DA[selectedCategory]} Koalitioner` : 'Hyppigste Koalitioner'}
        </h2>
        <div className="space-y-3">
          {displayData.map((coalition, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border transition-all hover:shadow-md"
              style={{
                backgroundColor: CATEGORY_COLORS[coalition.category],
                opacity: 0.9,
                borderColor: CATEGORY_COLORS[coalition.category]
              }}
            >
              {/* Coalition groups */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {coalition["Winning Coalition"].map((group, gIndex) => (
                    <div key={gIndex} className="flex items-center gap-1">
                      <div
                        className="w-6 h-6 rounded border-2 border-white shadow-sm"
                        style={{ backgroundColor: GROUP_COLORS[group] || '#999999' }}
                        title={group}
                      />
                      <span className="text-sm font-medium text-gray-800">{group}</span>
                      {gIndex < coalition["Winning Coalition"].length - 1 && (
                        <span className="text-gray-600 mx-1">+</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="px-2 py-1 bg-white bg-opacity-70 rounded font-semibold">
                    {CATEGORY_NAMES_DA[coalition.category]}
                  </span>
                  <span className="text-gray-700">
                    {coalition.Count} afstemninger
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-lg text-gray-900">
                    {coalition.Percentage}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!selectedCategory && displayData.length < groupedData.length && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Viser top {displayData.length} af {groupedData.length} koalitioner. Vælg en kategori for at se mere.
          </div>
        )}
      </Card>
    </div>
  );
}
