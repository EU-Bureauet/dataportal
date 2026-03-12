"use client"

import React from 'react';
import { NationalPartyDisagreementsView } from "@/components/national-party-disagreements-view";
import { NationalPartyDisagreementsData } from "@/types/data";
import useSWR from "swr";

export default function NationalPartyDisagreementsPage() {
  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch national party disagreements data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/national_party_disagreements.json`;
  const { data, error, isLoading } = useSWR<NationalPartyDisagreementsData>(
    url,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Nationale Partiers Interne Uenigheder</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading national party disagreements data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Nationale Partiers Interne Uenigheder</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Nationale Partiers Interne Uenigheder</h1>
        <p className="text-gray-600 mb-8">
          Oversigt over hvor medlemmer af samme nationale parti har stemt forskelligt i Europa-Parlamentet
        </p>
        <NationalPartyDisagreementsView data={data} />
      </div>
    </div>
  );
}
