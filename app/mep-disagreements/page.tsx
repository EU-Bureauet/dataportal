"use client"

import React from 'react';
import { MEPDisagreementsView } from "@/components/mep-disagreements-view";
import { MEPPartyDisagreements } from "@/types/data";
import useSWR from "swr";

export default function MEPDisagreementsPage() {
  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch disagreement data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/Danske_MEPs_brud_med_partigruppelinjen.json`;
  const { data, error, isLoading } = useSWR<MEPPartyDisagreements>(
    url,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Danske MEP&apos;ers brud med politisk gruppe</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading disagreement data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Danske MEP&apos;ers brud med politisk gruppe</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Danske MEP&apos;ers brud med politisk gruppe</h1>
        <p className="text-gray-600 mb-8">
          Oversigt over hvor ofte danske medlemmer af Europa-Parlamentet stemmer imod deres politiske gruppe
        </p>
        <MEPDisagreementsView data={data} />
      </div>
    </div>
  );
}
