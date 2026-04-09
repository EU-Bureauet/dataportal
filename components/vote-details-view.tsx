"use client"

import React from 'react';
import { Card } from "@/components/ui/card";
import { VoteDetails, type CommitteeAndGroupNames } from "@/types/data";
import committeeNamesData from "@/data/committee_and_group_names.json";
import { VoteResultChart } from "@/components/vote-result-chart";
import { GroupBreakdownTable, CountryBreakdownTable, MEPVotesList, RelatedVotesTable, WinningCoalitionCard, MetadataCard } from "@/components/vote-details-sections";

const committeeNames = committeeNamesData as CommitteeAndGroupNames;



interface VoteDetailsViewProps {
  data: VoteDetails;
}

export function VoteDetailsView({ data }: VoteDetailsViewProps) {
  // Pre-compute result values to simplify JSX
  const forVotes = data.Result?.For ?? 0;
  const againstVotes = data.Result?.Against ?? 0;
  const abstentionVotes = data.Result?.Abstention ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">
            {data["Short Title"] || data["Document Title"] || `Afstemning #${data["Vote ID"]}`}
          </h1>
        </div>
        <p className="text-lg text-gray-700">{data["Vote Description"]}</p>
        {data["Document Title"] && (
          <div className="text-lg text-gray-700">{data["Document Title"]}</div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {data["Document Link"] && (
            <a
              href={data["Document Link"]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Se dokument
            </a>
          )}
        </div>
        <div className="text-sm text-gray-600">Dato: {data["Sitting Date"]}</div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Deltagelse</div>
          <div className="text-3xl font-bold">
            {data.Participation != null ? data.Participation.toFixed(1) + "%" : "N/A"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Afgivne stemmer</div>
          <div className="text-3xl font-bold">
            {data.Result ? forVotes + againstVotes + abstentionVotes : "N/A"}
          </div>
        </Card>
        {data.Result && (
          <Card className="p-4">
            <VoteResultChart 
              forVotes={forVotes}
              againstVotes={againstVotes}
              abstentionVotes={abstentionVotes}
            />
          </Card>
        )}
      </div>

      {/* Metadata */}
      <MetadataCard
        committees={data.Committees}
        subjectmatter={data.Subjectmatter}
        eurovocTopics={data["Eurovoc Topics"]}
        committeeNames={committeeNames.committee_names}
      />

      {/* Winning Coalition */}
      {data["Winning Coalition"] && (
        <WinningCoalitionCard coalition={data["Winning Coalition"]} />
      )}

      {/* Breakdown by Group */}
      <GroupBreakdownTable byGroup={data["By Group"]} />

      {/* Breakdown by Country */}
      <CountryBreakdownTable byCountry={data["By Country"]} />

      {/* MEP Votes */}
      {data["Votes by MEP"] && data["Votes by MEP"].length > 0 && (
        <MEPVotesList votes={data["Votes by MEP"]} byGroup={data["By Group"] || {}} />
      )}

      {/* Related Votes */}
      {data["Related Votes"] && data["Related Votes"].length > 0 && (
        <RelatedVotesTable votes={data["Related Votes"]} />
      )}
    </div>
  );
}
