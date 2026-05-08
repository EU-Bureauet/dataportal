"use client"

import React from 'react';
import { MEPsOverview } from "@/components/meps-overview";
import { MEPResponse } from "@/types/data";
import { Card } from "@/components/ui/card";
import { ParliamentHemicycle } from "@/components/parliament-hemicycle";
import useSWR from "swr";

export default function MEPsPage() {
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
          <h1 className="text-3xl font-bold mb-4">Europa-Parlamentets medlemmer</h1>
          <p className="text-gray-600">Indlæser data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    console.error("Error loading MEPs data:", error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold mb-4">Europa-Parlamentets medlemmer</h1>
          <p className="text-red-600">Kunne ikke indlæse data</p>
          {error && <p className="text-sm text-gray-600 mt-2">Fejl: {error.message || String(error)}</p>}
        </div>
      </div>
    );
  }

  // Filter to only show MEPs with active parliament membership
  const activeMEPs = data.meps.filter(mep => {
    const parliamentMemberships = mep.memberships?.["UNKNOWN"] || [];
    return parliamentMemberships.some(membership => 
      membership.organization_name === "Europa-Parlamentet" && membership.active === 1
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Europa-Parlamentets medlemmer</h1>

        {/* Info Card */}
        <Card className="p-6 mb-8">
          <p className="text-gray-700 leading-relaxed">
            Europa-Parlamentet består af <span className="font-semibold text-gray-900">720 folkevalgte medlemmer</span> fra hele EU.
            Her kan du udforske alle medlemmerne, filtrere dem efter land, parti eller politisk gruppe og få indblik i deres stemmeaktivitet og deltagelsesgrad.
          </p>
        </Card>

        {/* Parliament Hemicycle */}
        <Card className="p-6 mb-8">
          <ParliamentHemicycle />
        </Card>

        <MEPsOverview data={activeMEPs} />
      </div>
    </div>
  );
}
