"use client"

import React from 'react';
import { CoalitionsSunburst } from "@/components/coalitions-sunburst";
import { CoalitionsData } from "@/types/data";
import useSWR from "swr";

export default function WinningCoalitionsPage() {
  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch winning coalitions data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/All_Winning_coalitions.json`;
  const { data, error, isLoading } = useSWR<CoalitionsData>(
    url,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Koalitioner i Europa-Parlamentet</h1>
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
          <h1 className="text-3xl font-bold mb-4">Koalitioner i Europa-Parlamentet</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Koalitioner i Europa-Parlamentet</h1>
        <p className="text-gray-600 mb-8">
          Se hvilke partigrupper der oftest stemmer sammen i Europa-Parlamentet.
          Koalitionerne er kategoriseret efter hvor hyppigt de forekommer i afstemningerne.
        </p>
        <CoalitionsSunburst data={data.TOTAL.total_coalitions} />
      </div>
    </div>
  );
}
