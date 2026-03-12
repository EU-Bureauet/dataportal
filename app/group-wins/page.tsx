"use client"

import React from 'react';
import { GroupWinsChart } from "@/components/group-wins-chart";
import { GroupWinsData } from "@/types/data";
import useSWR from "swr";

export default function GroupWinsPage() {
  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch group wins data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/All_Group_wins.json`;
  const { data, error, isLoading } = useSWR<GroupWinsData>(
    url,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Vindende Politiske Grupper</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Vindende Politiske Grupper</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Vindende Politiske Grupper</h1>
        <div className="mb-8 space-y-3">
          <p className="text-gray-700">
            Dette viser hvor ofte hver politisk gruppe er med i en vindende koalition. En gruppe vinder når de er en del af flertallet i en afstemning.
          </p>
          <p className="text-gray-700">
            Sejrsraten viser hvor stor en procentdel af alle afstemninger hvor gruppen var på den vindende side.
          </p>
        </div>
        <GroupWinsChart data={data} />
      </div>
    </div>
  );
}
