"use client"

import { Suspense } from "react";
import React from 'react';
import { useSearchParams } from "next/navigation";
import { MEPDetailView } from "@/components/mep-detail-view";
import { MEPResponse } from "@/types/data";
import useSWR from "swr";

function MEPDetailPage() {
  const searchParams = useSearchParams();
  const mepId = searchParams.get("id");

  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch MEPs data
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = `/${basePath}/data/meps_clean.json`;
  const { data, error, isLoading } = useSWR<MEPResponse>(
    url,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">MEP Detaljer</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading MEP data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">MEP Detaljer</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  // Find the specific MEP
  const mep = data.meps.find(m => m.mep_id === mepId);

  if (!mep) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">MEP Detaljer</h1>
          <p className="text-red-600">MEP ikke fundet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <MEPDetailView mep={mep} />
      </div>
    </div>
  );
}

// To use useSearchParams without a server you need to wrap the component using
// it in a Suspense.
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
// https://stackoverflow.com/a/78169784
export default function Page() {
    return (
        <Suspense>
            <MEPDetailPage/>
        </Suspense>
    )
}
