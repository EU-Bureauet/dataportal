"use client"

import { Suspense } from "react";
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import React from 'react';

import { useSearchParams } from "next/navigation";
import { CommitteeOverview } from "@/components/committee-overview";
import { CommitteeMetadata, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";

const committeeNames = committeeNamesData as CommitteeAndGroupNames;
import useSWR from "swr";

function CommitteePage() {
  const searchParams = useSearchParams();
  const committeeCode = searchParams.get("code")?.toUpperCase();

  const fetcher = (url: string) => {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  };

  // Fetch committee metadata
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
  const url = committeeCode ? `/${basePath}/data/${committeeCode}_Metadata.json` : null;
  const { data, error, isLoading } = useSWR<CommitteeMetadata>(
    url,
    fetcher
  );

  if(committeeCode === null || committeeCode === undefined) {
    const committees = Object.entries(committeeNames.committee_names)
      .filter(([code]) => code !== "all")
      .sort((a, b) => a[1].localeCompare(b[1])); // Sort by Danish name
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-6">Parlamentariske Udvalg</h1>

          {/* Info Card */}
          <Card className="p-6 mb-8">
            <p className="text-gray-700 leading-relaxed">
              Europa-Parlamentet har 22 stående parlamentariske udvalg, der behandler lovforslag og rapporter inden for deres specifikke ansvarsområder.
              Hvert udvalg består af medlemmer fra alle politiske grupper og spiller en afgørende rolle i den lovgivende proces.
              Klik på et udvalg for at se dets medlemmer, afstemninger og aktiviteter.
            </p>
          </Card>

          {/* Committees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {committees.map(([code, name]) => (
              <Link
                key={code}
                href={`/committee?code=${code}`}
                className="block"
              >
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-700">{code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{name}</h3>
                      <div className="text-sm text-gray-600">{code}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!committeeCode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Udvalg</h1>
          <p className="text-red-600">Intet udvalg angivet</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">
            {committeeNames.committee_names[committeeCode] || committeeCode}
          </h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading committee data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">
            {committeeNames.committee_names[committeeCode] || committeeCode}
          </h1>
          <p className="text-red-600">Kunne ikke indlæse data for dette udvalg</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <CommitteeOverview data={data} />
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
            <CommitteePage/>
        </Suspense>
    )
}
