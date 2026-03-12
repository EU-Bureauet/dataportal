import { MEPVoteData, GroupVoteData, ComparisonResult, VoteComparison } from "@/types/data";

// Cache for loaded data
const cache: { [key: string]: MEPVoteData | GroupVoteData } = {};

// Get base path for data URLs
function getDataBasePath(): string {
  if (typeof window !== 'undefined') {
    const basePath = process.env.NEXT_PUBLIC_BASEPATH || 'dataportal';
    return `/${basePath}/data`;
  }
  return '/dataportal/data';
}

/**
 * Load MEP vote data from API
 */
export async function loadMEPVoteData(mepId: string): Promise<MEPVoteData> {
  const cacheKey = `mep_${mepId}`;

  if (cache[cacheKey]) {
    return cache[cacheKey] as MEPVoteData;
  }

  const basePath = getDataBasePath();
  const response = await fetch(`${basePath}/mep_${mepId}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load MEP data: ${response.status}`);
  }

  const data = await response.json();
  cache[cacheKey] = data;
  return data;
}

/**
 * Load Group vote data from API
 */
export async function loadGroupVoteData(groupId: string): Promise<GroupVoteData> {
  const cacheKey = `group_${groupId}`;

  if (cache[cacheKey]) {
    return cache[cacheKey] as GroupVoteData;
  }

  const basePath = getDataBasePath();
  const response = await fetch(`${basePath}/group_${groupId}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load Group data: ${response.status}`);
  }

  const data = await response.json();
  cache[cacheKey] = data;
  return data;
}

/**
 * Compare two MEPs' voting patterns
 */
export async function compareMEPs(mepId1: string, mepId2: string): Promise<ComparisonResult & { mep1_info: MEPVoteData['mep_info'], mep2_info: MEPVoteData['mep_info'] }> {
  const [mep1, mep2] = await Promise.all([
    loadMEPVoteData(mepId1),
    loadMEPVoteData(mepId2)
  ]);

  const agreements: VoteComparison[] = [];
  const disagreements: VoteComparison[] = [];

  for (let i = 0; i < Math.min(mep1.votes.length, mep2.votes.length); i++) {
    const vote1 = mep1.votes[i];
    const vote2 = mep2.votes[i];

    // Only compare if both voted (not null)
    if (vote1 !== null && vote2 !== null) {
      const comparison: VoteComparison = {
        vote_id: mep1.vote_ids[i],
        index: i,
        entity1_vote: vote1,
        entity2_vote: vote2,
        agreement: vote1 === vote2
      };

      if (vote1 === vote2) {
        agreements.push(comparison);
      } else {
        disagreements.push(comparison);
      }
    }
  }

  const totalComparable = agreements.length + disagreements.length;
  const agreementRate = totalComparable > 0 ? (agreements.length / totalComparable) * 100 : 0;

  return {
    mep1_info: mep1.mep_info,
    mep2_info: mep2.mep_info,
    agreement_rate: parseFloat(agreementRate.toFixed(1)),
    disagreement_rate: parseFloat((100 - agreementRate).toFixed(1)),
    total_comparable_votes: totalComparable,
    agreement_count: agreements.length,
    disagreement_count: disagreements.length,
    agreements,
    disagreements
  };
}

/**
 * Compare two Groups' voting patterns
 */
export async function compareGroups(groupId1: string, groupId2: string): Promise<ComparisonResult & { group1_info: GroupVoteData['group_info'], group2_info: GroupVoteData['group_info'] }> {
  const [group1, group2] = await Promise.all([
    loadGroupVoteData(groupId1),
    loadGroupVoteData(groupId2)
  ]);

  const agreements: VoteComparison[] = [];
  const disagreements: VoteComparison[] = [];

  for (let i = 0; i < Math.min(group1.votes.length, group2.votes.length); i++) {
    const vote1 = group1.votes[i];
    const vote2 = group2.votes[i];

    // Only compare if both voted (not null)
    if (vote1 !== null && vote2 !== null) {
      const comparison: VoteComparison = {
        vote_id: group1.vote_ids[i],
        index: i,
        entity1_vote: vote1,
        entity2_vote: vote2,
        agreement: vote1 === vote2
      };

      if (vote1 === vote2) {
        agreements.push(comparison);
      } else {
        disagreements.push(comparison);
      }
    }
  }

  const totalComparable = agreements.length + disagreements.length;
  const agreementRate = totalComparable > 0 ? (agreements.length / totalComparable) * 100 : 0;

  return {
    group1_info: group1.group_info,
    group2_info: group2.group_info,
    agreement_rate: parseFloat(agreementRate.toFixed(1)),
    disagreement_rate: parseFloat((100 - agreementRate).toFixed(1)),
    total_comparable_votes: totalComparable,
    agreement_count: agreements.length,
    disagreement_count: disagreements.length,
    agreements,
    disagreements
  };
}

/**
 * Compare MEP with Group
 */
export async function compareMEPWithGroup(mepId: string, groupId: string): Promise<ComparisonResult & { mep_info: MEPVoteData['mep_info'], group_info: GroupVoteData['group_info'] }> {
  const [mep, group] = await Promise.all([
    loadMEPVoteData(mepId),
    loadGroupVoteData(groupId)
  ]);

  const agreements: VoteComparison[] = [];
  const disagreements: VoteComparison[] = [];

  for (let i = 0; i < Math.min(mep.votes.length, group.votes.length); i++) {
    const vote1 = mep.votes[i];
    const vote2 = group.votes[i];

    // Only compare if both voted (not null)
    if (vote1 !== null && vote2 !== null) {
      const comparison: VoteComparison = {
        vote_id: mep.vote_ids[i],
        index: i,
        entity1_vote: vote1,
        entity2_vote: vote2,
        agreement: vote1 === vote2
      };

      if (vote1 === vote2) {
        agreements.push(comparison);
      } else {
        disagreements.push(comparison);
      }
    }
  }

  const totalComparable = agreements.length + disagreements.length;
  const agreementRate = totalComparable > 0 ? (agreements.length / totalComparable) * 100 : 0;

  return {
    mep_info: mep.mep_info,
    group_info: group.group_info,
    agreement_rate: parseFloat(agreementRate.toFixed(1)),
    disagreement_rate: parseFloat((100 - agreementRate).toFixed(1)),
    total_comparable_votes: totalComparable,
    agreement_count: agreements.length,
    disagreement_count: disagreements.length,
    agreements,
    disagreements
  };
}

/**
 * Filter vote comparisons by committee
 * Requires vote details to be loaded separately
 */
export function filterByCommittee(
  comparisons: VoteComparison[],
  voteDetails: Record<string, { Committees?: Array<{ code: string }> }>,
  committee: string
): VoteComparison[] {
  return comparisons.filter(comparison => {
    const voteInfo = voteDetails[comparison.vote_id];
    if (!voteInfo || !voteInfo.Committees) return false;

    // Check if committee code is in the committees array
    return voteInfo.Committees.some((c: { code: string }) => c.code === committee);
  });
}

/**
 * Clear cache (useful for development/debugging)
 */
export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}
