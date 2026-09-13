"use client"

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DisagreementBar, FlagIcon, GroupBadge } from "@/components/national-party-disagreements-shared";
import { PartyDetail } from "@/components/national-party-disagreements-detail";
import { npdPartyKey, type NPDIndex, type NPDPartySummary } from "@/types/national-party-disagreements";

const ALL = "__all__";

interface NationalPartyDisagreementsViewProps {
  data: NPDIndex;
}

export function NationalPartyDisagreementsView({ data }: NationalPartyDisagreementsViewProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(ALL);
  const [selectedGroup, setSelectedGroup] = useState(ALL);
  const [expandedParty, setExpandedParty] = useState<string | null>(null);

  const countries = useMemo(() => {
    const set = new Map<string, string>(); // country_code -> country name
    for (const p of data.parties) set.set(p.country_code, p.country);
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1], "da"));
  }, [data]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const p of data.parties) for (const g of p.political_groups) set.add(g);
    return Array.from(set).sort();
  }, [data]);

  const filteredParties = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let list = data.parties;

    if (selectedCountry !== ALL) list = list.filter((p) => p.country_code === selectedCountry);
    if (selectedGroup !== ALL) list = list.filter((p) => p.political_groups.includes(selectedGroup));
    if (term) {
      list = list.filter(
        (p) => p.national_party.toLowerCase().includes(term) || p.country.toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => b.disagreement_rate_percent - a.disagreement_rate_percent);
  }, [data, searchTerm, selectedCountry, selectedGroup]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Søg efter parti eller land..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={ALL}>Alle lande</option>
            {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={ALL}>Alle grupper</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="flex items-center mt-3">
          <span className="text-sm text-gray-400 ml-auto">Viser {filteredParties.length} partier</span>
        </div>
      </Card>

      {/* Party list */}
      <div className="space-y-2">
        {filteredParties.map((party) => (
          <PartyRow
            key={npdPartyKey(party)}
            party={party}
            basePath={basePath}
            isExpanded={expandedParty === npdPartyKey(party)}
            onToggle={() =>
              setExpandedParty((prev) => (prev === npdPartyKey(party) ? null : npdPartyKey(party)))
            }
          />
        ))}
      </div>

      {filteredParties.length === 0 && (
        <Card className="p-6">
          <p className="text-gray-600 text-center">Ingen partier fundet med de valgte filtre</p>
        </Card>
      )}

      {/* Metadata */}
      <p className="text-sm text-gray-500">
        {data.metadata.total_parties_analyzed} partier · {data.metadata.total_votes_in_dataset.toLocaleString("da-DK")} afstemninger i alt · genereret {data.metadata.generated}
      </p>
    </div>
  );
}

function PartyRow({
  party,
  basePath,
  isExpanded,
  onToggle,
}: Readonly<{
  party: NPDPartySummary;
  basePath: string;
  isExpanded: boolean;
  onToggle: () => void;
}>) {
  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        isExpanded ? "border-blue-300 shadow-md" : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      <button onClick={onToggle} className="w-full text-left p-4 cursor-pointer">
        <div className="flex items-start gap-3">
          <FlagIcon
            countryCode={party.country_code}
            title={party.country}
            className="w-6 h-auto rounded-sm flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                <h3 className="font-semibold text-gray-900">{party.national_party}</h3>
                {party.political_groups.map((g) => <GroupBadge key={g} code={g} />)}
              </div>
              <span className="text-gray-400 flex-shrink-0">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {party.meps.length} medlemmer · {party.disagreement_count.toLocaleString("da-DK")} uenigheder ud af {party.total_votes_with_participation.toLocaleString("da-DK")} afstemninger
            </p>
            <div className="mt-2">
              <DisagreementBar ratePercent={party.disagreement_rate_percent} />
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <PartyDetail party={party} basePath={basePath} />
        </div>
      )}
    </div>
  );
}
