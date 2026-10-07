export interface MEPClean {
  mep_id: string;
  full_name: string;
  family_name: string;
  given_name: string;
  photo_url: string;
  country_code: string;
  national_party_id: { name: string; code: string };
  current_group_id?: { name: string; code: string };
  n_votes: number;
  n_votes_with_group: number;
  n_votes_against_group: number;
  group_loyalty: number;
  participation_pct: number;
}

export interface Disagreement {
  "Vote ID": string;
  "Vote Description": string;
  "Document Title": string;
  "Short Title": string;
  "Document Link": string;
  "MEP Name": string;
  "Vote Type": string;
  "Vote Type_Majority": string;
  "Group ID": string;
  "Group Majority Percentage": number;
  ECR: string;
  ESN: string;
  NI: string;
  PPE: string;
  PfE: string;
  Renew: string;
  "S&D": string;
  "The Left": string;
  "Verts/ALE": string;
}

export interface LatestVotesDoc {
  short_title: string;
  eurovoc_keywords: string[];
  votes: { vote_id: number; vote_description: string }[];
}

export interface ThemeVoteIdsDoc {
  vote_ids: string[];
}

export interface IndexedVotesDoc {
  vote_ids: string[];
  votes: number[];
}

export interface AllyCount {
  group: string;
  count: number;
  pct: number;
}

export interface MEPSummary {
  mep: MEPClean;
  totalDisagreements: number;
  filteredDisagreements: Disagreement[];
  topAllies: AllyCount[];
  topicVoteCount: number;
  /**
   * Number of votes within the active topic filter where this MEP actually
   * has a recorded vote AND the group's majority is known — i.e. the real
   * denominator for "brud" rates within the topic. Always 0 when there is
   * no topic filter.
   */
  topicParticipatedCount: number;
}

export const GROUP_CODES = [
  "ECR",
  "ESN",
  "NI",
  "PPE",
  "PfE",
  "Renew",
  "S&D",
  "The Left",
  "Verts/ALE",
] as const;

export const GROUP_FILE_BY_CODE: Record<(typeof GROUP_CODES)[number], string | null> = {
  ECR: "group_ECR.json",
  ESN: "group_ESN.json",
  NI: null,
  PPE: "group_EPP.json",
  PfE: "group_PfE.json",
  Renew: "group_Renew.json",
  "S&D": "group_S&D.json",
  "The Left": "group_The-Left.json",
  "Verts/ALE": "group_Greens-EFA.json",
};

export function voteNumberToType(voteNumber: number | undefined): string {
  if (voteNumber === 1) return "For";
  if (voteNumber === -1) return "Against";
  if (voteNumber === 0) return "Abstention";
  return "Unknown";
}

export function buildSearchRegex(searchFilter: string | undefined): RegExp | null {
  if (!searchFilter) return null;
  return new RegExp(searchFilter.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export function buildVoteMetaMap(latestVotes?: { documents: LatestVotesDoc[] }): Map<string, { voteDescription: string; shortTitle: string }> | null {
  if (!latestVotes) return null;
  const map = new Map<string, { voteDescription: string; shortTitle: string }>();
  for (const doc of latestVotes.documents) {
    for (const v of doc.votes) {
      map.set(String(v.vote_id), {
        voteDescription: v.vote_description,
        shortTitle: doc.short_title,
      });
    }
  }
  return map;
}

export function buildVoteTopicMap(latestVotes: { documents: LatestVotesDoc[] } | undefined, isThemeMode: boolean): Map<string, string[]> | null {
  if (isThemeMode || !latestVotes) return null;
  const map = new Map<string, string[]>();
  for (const doc of latestVotes.documents) {
    for (const v of doc.votes) {
      map.set(String(v.vote_id), doc.eurovoc_keywords ?? []);
    }
  }
  return map;
}

export function buildTopicVoteIds(params: {
  hasTopicFilter: boolean;
  isThemeMode: boolean;
  themeVoteIdsData?: ThemeVoteIdsDoc;
  voteTopicMap: Map<string, string[]> | null;
  eurovocFilter: string | undefined;
  searchRegex: RegExp | null;
}): Set<string> | null {
  const {
    hasTopicFilter,
    isThemeMode,
    themeVoteIdsData,
    voteTopicMap,
    eurovocFilter,
    searchRegex,
  } = params;

  if (!hasTopicFilter) return null;

  if (isThemeMode) {
    if (!themeVoteIdsData?.vote_ids) return null;
    return new Set(themeVoteIdsData.vote_ids.map(String));
  }

  if (!voteTopicMap) {
    return null;
  }

  const ids = new Set<string>();
  for (const [vid, keywords] of voteTopicMap.entries()) {
    if (eurovocFilter && keywords.some((kw) => kw.toLowerCase() === eurovocFilter.toLowerCase())) {
      ids.add(vid);
      continue;
    }
    if (searchRegex && keywords.some((kw) => searchRegex.test(kw))) {
      ids.add(vid);
    }
  }

  return ids;
}

export function buildGroupVoteMaps(groupIndexedVotesByCode?: Record<string, IndexedVotesDoc>): Record<(typeof GROUP_CODES)[number], Map<string, number>> | null {
  if (!groupIndexedVotesByCode) return null;
  const maps = {} as Record<(typeof GROUP_CODES)[number], Map<string, number>>;
  for (const gc of GROUP_CODES) {
    const doc = groupIndexedVotesByCode[gc];
    const map = new Map<string, number>();
    if (doc) {
      const len = Math.min(doc.vote_ids.length, doc.votes.length);
      for (let i = 0; i < len; i++) {
        map.set(String(doc.vote_ids[i]), doc.votes[i]);
      }
    }
    maps[gc] = map;
  }
  return maps;
}

export function buildMepSummaries(params: {
  meps: MEPClean[];
  mepIndexedVotesById?: Record<string, IndexedVotesDoc>;
  groupVoteMaps: Record<(typeof GROUP_CODES)[number], Map<string, number>> | null;
  topicVoteIds: Set<string> | null;
  hasTopicFilter: boolean;
  voteMetaMap: Map<string, { voteDescription: string; shortTitle: string }> | null;
}): MEPSummary[] {
  const {
    meps,
    mepIndexedVotesById,
    groupVoteMaps,
    topicVoteIds,
    hasTopicFilter,
    voteMetaMap,
  } = params;

  if (!mepIndexedVotesById || !groupVoteMaps) return [];

  const dkMeps = meps.filter((m) => m.country_code.includes("DNK") && m.current_group_id);

  return dkMeps.map((mep) => {
    const mepVotesDoc = mepIndexedVotesById[mep.mep_id] ?? { vote_ids: [], votes: [] };
    const mepGroupCode = mep.current_group_id?.code as (typeof GROUP_CODES)[number] | undefined;
    const mepGroupVoteMap = mepGroupCode ? groupVoteMaps[mepGroupCode] : null;
    const filtered: Disagreement[] = [];
    let totalDisagreements = 0;
    let topicParticipatedCount = 0;

    if (mepGroupVoteMap && mepGroupCode) {
      const len = Math.min(mepVotesDoc.vote_ids.length, mepVotesDoc.votes.length);
      for (let index = 0; index < len; index++) {
        const voteId = String(mepVotesDoc.vote_ids[index]);
        const mepVoteNumber = mepVotesDoc.votes[index];
        if (typeof mepVoteNumber !== "number") continue;

        const groupVoteNumber = mepGroupVoteMap.get(voteId);
        if (groupVoteNumber === undefined) continue;

        const isDisagreement = mepVoteNumber !== groupVoteNumber;
        if (isDisagreement) {
          totalDisagreements++;
        }

        let isInTopic = true;
        if (hasTopicFilter) {
          isInTopic = topicVoteIds ? topicVoteIds.has(voteId) : false;
        }

        // Count every vote within the topic where this MEP and their group
        // both have a recorded position — this is the real denominator for
        // "brud" rates within the topic (NOT the same as topicVoteIds.size,
        // which also includes topic votes the MEP was absent for).
        if (hasTopicFilter && isInTopic) {
          topicParticipatedCount++;
        }

        if (!isDisagreement || !isInTopic) {
          continue;
        }

        const voteMeta = voteMetaMap?.get(voteId);
        const disagreement: Disagreement = {
          "Vote ID": voteId,
          "Vote Description": voteMeta?.voteDescription ?? `Afstemning ${voteId}`,
          "Document Title": voteMeta?.shortTitle ?? "Ingen reference",
          "Short Title": voteMeta?.shortTitle ?? "Ingen reference",
          "Document Link": "Ingen reference",
          "MEP Name": mep.family_name,
          "Vote Type": voteNumberToType(mepVoteNumber),
          "Vote Type_Majority": voteNumberToType(groupVoteNumber),
          "Group ID": mepGroupCode,
          "Group Majority Percentage": 0,
          ECR: voteNumberToType(groupVoteMaps.ECR.get(voteId)),
          ESN: voteNumberToType(groupVoteMaps.ESN.get(voteId)),
          NI: voteNumberToType(groupVoteMaps.NI.get(voteId)),
          PPE: voteNumberToType(groupVoteMaps.PPE.get(voteId)),
          PfE: voteNumberToType(groupVoteMaps.PfE.get(voteId)),
          Renew: voteNumberToType(groupVoteMaps.Renew.get(voteId)),
          "S&D": voteNumberToType(groupVoteMaps["S&D"].get(voteId)),
          "The Left": voteNumberToType(groupVoteMaps["The Left"].get(voteId)),
          "Verts/ALE": voteNumberToType(groupVoteMaps["Verts/ALE"].get(voteId)),
        };
        filtered.push(disagreement);
      }
    }

    const allyMap: Record<string, number> = {};
    for (const d of filtered) {
      const mepVote = d["Vote Type"];
      for (const gc of GROUP_CODES) {
        if (gc === mepGroupCode) continue;
        if (d[gc as keyof Disagreement] === mepVote) {
          allyMap[gc] = (allyMap[gc] || 0) + 1;
        }
      }
    }

    const topAllies: AllyCount[] = Object.entries(allyMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([group, count]) => ({
        group,
        count,
        pct: filtered.length > 0 ? (count / filtered.length) * 100 : 0,
      }));

    return {
      mep,
      totalDisagreements,
      filteredDisagreements: filtered,
      topAllies,
      topicVoteCount: topicVoteIds ? topicVoteIds.size : 0,
      topicParticipatedCount,
    };
  });
}
