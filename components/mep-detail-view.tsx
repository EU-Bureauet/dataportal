"use client"

import React from 'react';
import { MEPData } from "@/types/data";
import {
  MEPHeaderCard,
  PoliticalAffiliationsCards,
  VotingStatsCard,
  CurrentCommitteesSection,
  CurrentDelegationsSection,
  GroupHistorySection,
  PreviousCommitteesSection,
  PreviousDelegationsSection,
} from "@/components/mep-detail-sections";

interface MEPDetailViewProps {
  mep: MEPData;
}

export function MEPDetailView({ mep }: MEPDetailViewProps) {
  return (
    <div className="space-y-6">
      <MEPHeaderCard mep={mep} />
      <PoliticalAffiliationsCards mep={mep} />
      <VotingStatsCard mep={mep} />
      <CurrentCommitteesSection mep={mep} />
      <CurrentDelegationsSection mep={mep} />
      <GroupHistorySection mep={mep} />
      <PreviousCommitteesSection mep={mep} />
      <PreviousDelegationsSection mep={mep} />
    </div>
  );
}
