"use client";

import useSWR from "swr";
import { ThemeDonutChart, type ThemeVotesData } from "@/components/theme-donut-chart";

interface ThemeDonutSectionProps {
  themeVotesFilename?: string;
  accentColor: string;
  latestVotesSearch?: string;
  latestVotesEurovoc?: string;
}

const fetcher = async (url: string): Promise<ThemeVotesData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kunne ikke hente data: ${response.status}`);
  }
  return response.json() as Promise<ThemeVotesData>;
};

export function ThemeDonutSection({
  themeVotesFilename,
  accentColor,
  latestVotesSearch,
  latestVotesEurovoc,
}: ThemeDonutSectionProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";
  const datasetUrl = themeVotesFilename ? `${basePath}/data/${themeVotesFilename}` : null;

  const { data, error } = useSWR<ThemeVotesData>(datasetUrl, fetcher, {
    revalidateOnFocus: false,
  });

  if (!themeVotesFilename) return null;

  if (error) {
    return (
      <div className="mt-4 bg-white rounded-xl shadow-md border border-gray-100 px-6 sm:px-8 py-3 sm:py-4">
        <p className="text-sm text-gray-600">
          Kunne ikke hente afstemningsdata for temaet lige nu.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 bg-white rounded-xl shadow-md border border-gray-100 px-6 sm:px-8 py-3 sm:py-4">
        <p className="text-sm text-gray-500">Henter afstemningsdata...</p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-xl shadow-md border border-gray-100 px-6 sm:px-8 py-3 sm:py-4">
      <ThemeDonutChart
        data={data}
        accentColor={accentColor}
        latestVotesSearch={latestVotesSearch}
        latestVotesEurovoc={latestVotesEurovoc}
      />
    </div>
  );
}
