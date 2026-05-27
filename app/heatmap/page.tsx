"use client"

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { HeatmapGrid } from "@/components/heatmap-grid";
import { PairwiseCoalitionsData, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";

const committeeNames = committeeNamesData as CommitteeAndGroupNames;
import { Card } from "@/components/ui/card";
import useSWR from "swr";

const THEME_LABELS: Record<string, string> = {
  theme_energi_industri: "Energi og industri",
  theme_miljo_sundhed: "Miljø og sundhed",
  theme_forsvar_sikkerhed: "Forsvar og sikkerhed",
};

const THEME_VOTES_FILES: Record<string, string> = {
  theme_energi_industri: "theme_votes_energi_industri.json",
  theme_miljo_sundhed: "theme_votes_miljo_sundhed.json",
  theme_forsvar_sikkerhed: "theme_votes_forsvar_sikkerhed.json",
};

interface ThemeVotesData {
  metadata?: {
    votes_total?: number;
  };
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Enighed mellem Politiske Grupper</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    }>
      <HeatmapContent />
    </Suspense>
  );
}

function HeatmapContent() {
  const searchParams = useSearchParams();
  const themeKey = searchParams.get("theme");
  const themeLabel = themeKey ? THEME_LABELS[themeKey] : null;
  const isThemeMode = Boolean(themeKey && themeLabel);
  const [selectedCommittee, setSelectedCommittee] = useState<string>('TOTAL');

  // Initialize committee filter from URL query param (e.g. ?committee=SEDE)
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  useEffect(() => {
    if (initializedFromUrl) return;
    const qCommittee = searchParams.get("committee");
    if (qCommittee) {
      setSelectedCommittee(qCommittee);
    }
    setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);

  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch pairwise coalition data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/All_Pairwise_coalitions.json`;
  console.log("Fetching from URL:", url);
  const { data, error, isLoading } = useSWR<PairwiseCoalitionsData>(
    url,
    fetcher
  );

  const themeVotesUrl = isThemeMode && themeKey
    ? `/${basePath}/data/${THEME_VOTES_FILES[themeKey]}`
    : null;
  const { data: themeVotesData, isLoading: themeVotesLoading } = useSWR<ThemeVotesData>(
    themeVotesUrl,
    fetcher
  );

  // Get available committees from the data (excluding theme groupings)
  const availableCommittees = useMemo(() => {
    if (!data) return [];
    return Object.keys(data)
      .filter(key => key !== 'TOTAL' && !key.startsWith('theme_'))
      .sort()
      .map(code => ({
        code,
        name: committeeNames.committee_names[code] || code
      }));
  }, [data]);

  // Get the data for the selected committee
  const selectedData = useMemo(() => {
    if (!data) return null;
    if (isThemeMode && themeKey) {
      if (data[themeKey]) {
        const result = data[themeKey];
        console.log(`Selected key: ${themeKey}, data length: ${result?.length || 0}`);
        return result;
      }

      const sourceRows = data.TOTAL ?? [];
      const themeId = themeKey.replace(/^theme_/, "");
      const themeTotal = themeVotesData?.metadata?.votes_total;
      if (!sourceRows.length || !themeTotal) return null;

      const derivedRows = sourceRows.map((row) => {
        const themeCount = row.theme_counts?.[themeId] ?? 0;
        return {
          ...row,
          Total: themeTotal,
          Count: themeCount,
          Percentage: themeTotal > 0 ? Math.round((themeCount / themeTotal) * 1000) / 10 : 0,
        };
      });

      console.log(`Derived theme data from TOTAL for ${themeKey}, data length: ${derivedRows.length}`);
      return derivedRows;
    }

    const key = selectedCommittee;
    const result = data[key] || data.TOTAL;
    console.log(`Selected key: ${key}, data length: ${result?.length || 0}`);
    return result;
  }, [data, selectedCommittee, isThemeMode, themeKey, themeVotesData]);

  if (isLoading || (isThemeMode && themeVotesLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Enighed mellem Politiske Grupper</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading data:", error);
    console.log("Data:", data);
    console.log("Fetch URL:", `/${process.env.NEXT_PUBLIC_BASEPATH}/data/All_Pairwise_coalitions.json`);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Enighed mellem Politiske Grupper</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  const renderScopeSentence = () => {
    const total = selectedData?.[0]?.Total || 0;
    if (isThemeMode && themeLabel) {
      return (
        <> Oversigten er filtreret til temaet <strong>{themeLabel}</strong> og er baseret på {total} afstemninger.</>
      );
    }
    if (selectedCommittee === 'TOTAL') {
      return <> Oversigten er baseret på {total} afstemninger og viser enighed mellem alle par af grupper.</>;
    }
    return (
      <> Oversigten er filtreret til udvalget <strong>{committeeNames.committee_names[selectedCommittee]}</strong> og er baseret på {total} afstemninger.</>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">
          Enighed mellem Politiske Grupper{isThemeMode && themeLabel ? `: ${themeLabel}` : ''}
        </h1>

        <div className="mb-8 space-y-3">
          <p className="text-gray-700">
            Denne visualisering viser hvor ofte de forskellige politiske grupper i Europa-Parlamentet stemmer ens.
            {renderScopeSentence()}
          </p>
          <p className="text-gray-700">
            Hver celle i matricen viser procentdelen af afstemninger hvor to grupper stemte det samme (enten begge for, begge imod, eller begge undlod).
            Høje værdier (grønne) indikerer stærk enighed, mens lave værdier (blå) indikerer sjælden enighed.
          </p>
          <p className="text-gray-700">
            Diagonalen viser 100% da hver gruppe altid er enig med sig selv.
          </p>
        </div>

        {isThemeMode && !selectedData && (
          <Card className="p-4 border-amber-300 bg-amber-50 text-amber-900">
            Tema-data mangler i <strong>All_Pairwise_coalitions.json</strong> for nøglen <strong>{themeKey}</strong>.
            Heatmap kan derfor ikke vises for dette tema endnu.
          </Card>
        )}

        {selectedData && (
          <HeatmapGrid
            data={selectedData}
            filterComponent={
              isThemeMode ? undefined : (
                <Card className="p-4">
                  <label className="block text-sm font-medium mb-2">Filtrer efter udvalg:</label>
                  <select
                    value={selectedCommittee}
                    onChange={(e) => setSelectedCommittee(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TOTAL">Alle afstemninger</option>
                    {availableCommittees.map(committee => (
                      <option key={committee.code} value={committee.code}>
                        {committee.code} - {committee.name}
                      </option>
                    ))}
                  </select>
                </Card>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
