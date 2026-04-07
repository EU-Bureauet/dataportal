"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { WinningCoalitionColumnChart } from "@/components/winning-coalition-column-chart";
import { FrequentCoalitionsBarChart } from "@/components/frequent-coalitions-bar-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function CoalitionsContent() {
  const searchParams = useSearchParams();
  const committee = searchParams.get("committee") ?? undefined;
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: namesData } = useSWR<{ committee_names: Record<string, string> }>(
    committee ? `${basePath}/data/committee_and_group_names.json` : null,
    fetcher
  );

  const themeLabel = committee && namesData?.committee_names?.[committee]
    ? namesData.committee_names[committee]
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 inline sm:block">
          Koalitioner og alliancer{themeLabel ? `: ${themeLabel}` : ""}
        </h1>
        <p className="text-gray-600 mt-1 max-w-4xl leading-snug text-sm sm:text-base">
          Udforsk hvilke politiske grupper der oftest stemmer sammen — og hvordan alliancerne skifter fra emne til emne.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <WinningCoalitionColumnChart committee={committee} themeLabel={themeLabel} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <FrequentCoalitionsBarChart committee={committee} themeLabel={themeLabel} />
        </div>
      </div>
    </div>
  );
}

export default function ThemeWinningCoalitionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }
      >
        <CoalitionsContent />
      </Suspense>
    </div>
  );
}
