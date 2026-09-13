/**
 * Types for the /national-party-disagreements feature.
 *
 * Backed by two file shapes produced by `analyze_national_party_disagreements()`
 * in analysis.py (see data/National_Party_Disagreements_CHANGELOG.md):
 *
 *  - `data/National_Party_Disagreements.json` — the lightweight index (no
 *    `disagreements`), used for the overview/ranking list.
 *  - `data/national_party_disagreements/{country_code}_{party_code}.json` —
 *    one file per party with the full `disagreements` list, fetched lazily
 *    when a party row is expanded.
 *
 * `vote_breakdown` (who voted what) is no longer embedded per vote — it's
 * looked up on demand from the existing `data/mep_{mep_id}.json` files via
 * `IndexedVotesDoc` / `voteNumberToType` in lib/danish-mep-votes-helpers.ts.
 */

export interface NPDMep {
  mep_id: string;
  name: string;
}

export interface NPDPartySummary {
  id: string;
  national_party: string;
  country: string;
  country_code: string;
  party_code: string;
  political_groups: string[];
  meps: NPDMep[];
  total_votes_with_participation: number;
  disagreement_count: number;
  disagreement_rate_percent: number;
}

export interface NPDIndex {
  metadata: {
    generated: string;
    total_parties_analyzed: number;
    total_votes_in_dataset: number;
  };
  parties: NPDPartySummary[];
}

export interface NPDDisagreement {
  vote_id: number;
  sitting_date: string;
  short_title: string;
  document_link: string;
  committee: string[];
  eurovoc_keywords: string[];
}

export interface NPDPartyDetail extends NPDPartySummary {
  disagreements: NPDDisagreement[];
}

/** Stable key used for expand-state, SWR cache keys, etc. */
export function npdPartyKey(party: Pick<NPDPartySummary, "country_code" | "party_code">): string {
  return `${party.country_code}_${party.party_code}`;
}

/**
 * File name for a party's detail file, matching the backend's own naming
 * convention exactly (verified against all 129 files on disk): whitespace
 * and "/" become "_", everything else (umlauts, "&", ".", "-") is kept
 * as-is. The result is then percent-encoded as one unit for use in a URL -
 * decodes back to the literal on-disk filename.
 */
export function npdPartyFileName(party: Pick<NPDPartySummary, "country_code" | "party_code">): string {
  const sanitizedCode = party.party_code.replace(/[\s/]+/g, "_");
  const raw = `${party.country_code}_${sanitizedCode}`;
  return `${encodeURIComponent(raw)}.json`;
}
