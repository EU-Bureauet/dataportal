"use client"

import { Suspense } from "react";
import React from 'react';
import { useSearchParams } from "next/navigation";
import { VoteDetailsView } from "@/components/vote-details-view";
import { VoteDetails } from "@/types/data";
import useSWR from "swr";

function VotePage() {
  const searchParams = useSearchParams();
  const voteId = searchParams.get("id");

  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch vote details through proxy in dev, or from basePath in production
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = voteId ? `/${basePath}/data/vote_details_${voteId}.json` : null;
  const { data, error, isLoading } = useSWR<VoteDetails>(
    url,
    fetcher
  );

  if (!voteId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Afstemning</h1>
          <p className="text-red-600">Ingen afstemnings-ID angivet</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">
            Afstemning #{voteId}
          </h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading vote data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">
            Afstemning #{voteId}
          </h1>
          <p className="text-red-600">Kunne ikke indlæse data for denne afstemning</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <VoteDetailsView data={data} />
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
            <VotePage/>
        </Suspense>
    )
}
