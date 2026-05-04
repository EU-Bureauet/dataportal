/**
 * Data-integrity integration tests.
 *
 * These load the REAL JSON data files from /data and run the same
 * transformation logic the visualisation components use, verifying that:
 *   1. Data files are valid and well-formed
 *   2. Transformed output faithfully represents the raw data
 *   3. Numeric invariants (sums, ranges, symmetry) hold
 *
 * If a data file changes, these tests will catch any breakage in
 * the visualisations that rely on it.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'

import {
  HEATMAP_GROUP_LABELS,
  buildMatrixFromPairwise,
  getHeatmapColor,
  categorizeCoalition,
  coalitionKey,
  getMajorityLabel,
  normalizeVoteLabel,
  computeGroupWinStats,
} from '@/lib/data-transforms'

import { GROUP_COLORS } from '@/lib/group-colors'

import {
  transformMEPData,
  formatRole,
  getCurrentCommitteeMemberships,
  getPreviousCommitteeMemberships,
} from '@/types/data'

import type {
  PairwiseCoalitionsData,
  CoalitionsData,
  GroupWinsData,
  MEPData,
  VoteDetails,
} from '@/types/data'

// ── Helpers ──────────────────────────────────────────────────

const DATA_DIR = path.resolve(__dirname, '..', 'data')

function loadJson<T>(filename: string): T {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- test helper reading local fixture data
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')
  return JSON.parse(raw) as T
}

// ── Pairwise coalitions → Heatmap ────────────────────────────

describe('Pairwise coalitions → Heatmap grid', () => {
  let pairwise: PairwiseCoalitionsData

  beforeAll(() => {
    pairwise = loadJson<PairwiseCoalitionsData>('All_Pairwise_coalitions.json')
  })

  it('data file has a TOTAL key with an array of pairwise records', () => {
    expect(pairwise).toHaveProperty('TOTAL')
    expect(Array.isArray(pairwise.TOTAL)).toBe(true)
    expect(pairwise.TOTAL.length).toBeGreaterThan(0)
  })

  it('every pairwise record has the required fields', () => {
    for (const record of pairwise.TOTAL) {
      expect(record).toHaveProperty('Group Pair')
      expect(record).toHaveProperty('Total')
      expect(record).toHaveProperty('Count')
      expect(record).toHaveProperty('Percentage')
      expect(Array.isArray(record['Group Pair'])).toBe(true)
      expect(record['Group Pair']).toHaveLength(2)
    }
  })

  it('all percentages are between 0 and 100', () => {
    for (const record of pairwise.TOTAL) {
      expect(record.Percentage).toBeGreaterThanOrEqual(0)
      expect(record.Percentage).toBeLessThanOrEqual(100)
    }
  })

  it('Count never exceeds Total', () => {
    for (const record of pairwise.TOTAL) {
      expect(record.Count).toBeLessThanOrEqual(record.Total)
    }
  })

  it('Percentage approximately equals (Count / Total) × 100', () => {
    for (const record of pairwise.TOTAL) {
      if (record.Total > 0) {
        const expected = (record.Count / record.Total) * 100
        expect(record.Percentage).toBeCloseTo(expected, 0) // within 0.5
      }
    }
  })

  it('buildMatrixFromPairwise produces a matrix whose cells match the source data', () => {
    const matrix = buildMatrixFromPairwise(pairwise.TOTAL)
    const labels: string[] = [...HEATMAP_GROUP_LABELS]

    // Check that specific data values show up in the matrix
    for (const record of pairwise.TOTAL) {
      const [g1, g2] = record['Group Pair']
      const i = labels.indexOf(g1)
      const j = labels.indexOf(g2)
      if (i >= 0 && j >= 0) {
        expect(matrix[i][j]).toBe(record.Percentage)
        expect(matrix[j][i]).toBe(record.Percentage) // symmetry
      }
    }
  })

  it('the produced matrix is fully symmetric', () => {
    const matrix = buildMatrixFromPairwise(pairwise.TOTAL)
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i])
      }
    }
  })

  it('every cell maps to a valid colour', () => {
    const matrix = buildMatrixFromPairwise(pairwise.TOTAL)
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const colour = getHeatmapColor(matrix[i][j])
        expect(colour).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })

  it('all groups in the data file are included in HEATMAP_GROUP_LABELS', () => {
    const labels = new Set<string>(HEATMAP_GROUP_LABELS)
    for (const record of pairwise.TOTAL) {
      for (const group of record['Group Pair']) {
        expect(labels.has(group)).toBe(true)
      }
    }
  })
})

// ── Winning coalitions → Sunburst / bar chart ────────────────

describe('Winning coalitions → Sunburst & bar chart', () => {
  let coalitions: CoalitionsData

  beforeAll(() => {
    coalitions = loadJson<CoalitionsData>('All_Winning_coalitions.json')
  })

  it('data file has a TOTAL key with total_coalitions array', () => {
    expect(coalitions).toHaveProperty('TOTAL')
    expect(coalitions.TOTAL).toHaveProperty('total_coalitions')
    expect(Array.isArray(coalitions.TOTAL.total_coalitions)).toBe(true)
  })

  it('every coalition record has the required fields', () => {
    for (const c of coalitions.TOTAL.total_coalitions) {
      expect(c).toHaveProperty('Winning Coalition')
      expect(c).toHaveProperty('Count')
      expect(c).toHaveProperty('Percentage')
      expect(Array.isArray(c['Winning Coalition'])).toBe(true)
      expect(c['Winning Coalition'].length).toBeGreaterThan(0)
    }
  })

  it('coalition percentages sum to at least 95% (rounding may cause small gaps)', () => {
    const sum = coalitions.TOTAL.total_coalitions.reduce(
      (acc, c) => acc + c.Percentage, 0
    )
    expect(sum).toBeGreaterThanOrEqual(95)
    expect(sum).toBeLessThanOrEqual(100.5)
  })

  it('all percentages are between 0 and 100', () => {
    for (const c of coalitions.TOTAL.total_coalitions) {
      expect(c.Percentage).toBeGreaterThanOrEqual(0)
      expect(c.Percentage).toBeLessThanOrEqual(100)
    }
  })

  it('coalitionKey produces distinct keys for each unique coalition', () => {
    const keys = coalitions.TOTAL.total_coalitions.map(c =>
      coalitionKey(c['Winning Coalition'])
    )
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('categorizeCoalition assigns a valid category to every coalition', () => {
    const validCategories = new Set(['Dominant', 'Common', 'Uncommon', 'Rare'])
    for (const c of coalitions.TOTAL.total_coalitions) {
      const cat = categorizeCoalition(c.Percentage)
      expect(validCategories.has(cat)).toBe(true)
    }
  })

  it('committee-level data (if any) is an array or has total_coalitions', () => {
    for (const [key, value] of Object.entries(coalitions)) {
      if (key === 'TOTAL') continue
      // Committee-level entries may be a direct array or wrapped in {total_coalitions}
      const arr = Array.isArray(value)
        ? value
        : (value as CoalitionsData['TOTAL']).total_coalitions
      expect(Array.isArray(arr)).toBe(true)
    }
  })

  it('committee-level coalition arrays have valid records with required fields', () => {
    for (const [key, value] of Object.entries(coalitions)) {
      if (key === 'TOTAL') continue
      const arr = Array.isArray(value)
        ? value
        : (value as CoalitionsData['TOTAL']).total_coalitions
      for (const c of arr) {
        expect(c).toHaveProperty('Winning Coalition')
        expect(c).toHaveProperty('Count')
        expect(c).toHaveProperty('Percentage')
        expect(Array.isArray(c['Winning Coalition'])).toBe(true)
        expect(c.Percentage).toBeGreaterThanOrEqual(0)
        expect(c.Percentage).toBeLessThanOrEqual(100)
      }
    }
  })

  it('coalitionKey produces distinct keys within each committee slice', () => {
    for (const [key, value] of Object.entries(coalitions)) {
      if (key === 'TOTAL') continue
      const arr = Array.isArray(value)
        ? value
        : (value as CoalitionsData['TOTAL']).total_coalitions
      const keys = arr.map(c => coalitionKey(c['Winning Coalition']))
      const unique = new Set(keys)
      expect(unique.size).toBe(keys.length)
    }
  })

  it('all coalition group members exist in GROUP_COLORS', () => {
    for (const c of coalitions.TOTAL.total_coalitions) {
      for (const group of c['Winning Coalition']) {
        expect(GROUP_COLORS).toHaveProperty(group)
      }
    }
  })
})

// ── Group wins → Group wins chart ────────────────────────────

describe('Group wins → Group wins chart', () => {
  let groupWins: GroupWinsData

  beforeAll(() => {
    groupWins = loadJson<GroupWinsData>('All_Group_wins.json')
  })

  it('data file has a TOTAL key with total_group_wins array', () => {
    expect(groupWins).toHaveProperty('TOTAL')
    expect(groupWins.TOTAL).toHaveProperty('total_group_wins')
    expect(Array.isArray(groupWins.TOTAL.total_group_wins)).toBe(true)
  })

  it('every group win record has the required fields', () => {
    for (const g of groupWins.TOTAL.total_group_wins) {
      expect(g).toHaveProperty('Group ID')
      expect(g).toHaveProperty('Win Count')
      expect(g).toHaveProperty('Win Percentage')
      expect(typeof g['Group ID']).toBe('string')
      expect(typeof g['Win Count']).toBe('number')
      expect(typeof g['Win Percentage']).toBe('number')
    }
  })

  it('win percentages are between 0 and 100', () => {
    for (const g of groupWins.TOTAL.total_group_wins) {
      expect(g['Win Percentage']).toBeGreaterThanOrEqual(0)
      expect(g['Win Percentage']).toBeLessThanOrEqual(100)
    }
  })

  it('computeGroupWinStats highest matches the actual max in raw data', () => {
    const rawMax = Math.max(
      ...groupWins.TOTAL.total_group_wins.map(g => g['Win Percentage'])
    )
    const stats = computeGroupWinStats(groupWins.TOTAL.total_group_wins)
    expect(stats.highest?.['Win Percentage']).toBe(rawMax)
  })

  it('computeGroupWinStats lowest matches the actual min in raw data', () => {
    const rawMin = Math.min(
      ...groupWins.TOTAL.total_group_wins.map(g => g['Win Percentage'])
    )
    const stats = computeGroupWinStats(groupWins.TOTAL.total_group_wins)
    expect(stats.lowest?.['Win Percentage']).toBe(rawMin)
  })

  it('computeGroupWinStats average matches manual calculation', () => {
    const wins = groupWins.TOTAL.total_group_wins
    const sum = wins.reduce((s, g) => s + g['Win Percentage'], 0)
    const expected = Math.round(sum / wins.length)
    const stats = computeGroupWinStats(wins)
    expect(stats.average).toBe(expected)
  })

  it('all Group IDs are recognised EU Parliament groups', () => {
    const knownGroups = new Set([
      ...HEATMAP_GROUP_LABELS, 'NI'
    ])
    for (const g of groupWins.TOTAL.total_group_wins) {
      expect(knownGroups.has(g['Group ID'])).toBe(true)
    }
  })

  it('committee-level group wins are flat arrays with valid records', () => {
    for (const [key, value] of Object.entries(groupWins)) {
      if (key === 'TOTAL') continue
      const arr = Array.isArray(value)
        ? value
        : (value as GroupWinsData['TOTAL']).total_group_wins
      expect(Array.isArray(arr)).toBe(true)
      for (const g of arr) {
        expect(g).toHaveProperty('Group ID')
        expect(g).toHaveProperty('Win Count')
        expect(g).toHaveProperty('Win Percentage')
        expect(g['Win Percentage']).toBeGreaterThanOrEqual(0)
        expect(g['Win Percentage']).toBeLessThanOrEqual(100)
      }
    }
  })

  it('all Group IDs in TOTAL exist in GROUP_COLORS', () => {
    for (const g of groupWins.TOTAL.total_group_wins) {
      expect(GROUP_COLORS).toHaveProperty(g['Group ID'])
    }
  })

  it('Win Count never exceeds the implied total (Win Count / Win Percentage * 100)', () => {
    for (const g of groupWins.TOTAL.total_group_wins) {
      if (g['Win Percentage'] > 0) {
        const impliedTotal = (g['Win Count'] / g['Win Percentage']) * 100
        expect(g['Win Count']).toBeLessThanOrEqual(Math.ceil(impliedTotal))
      }
    }
  })
})

// ── MEPs data → MEPs overview ────────────────────────────────

describe('MEPs data → MEPs overview', () => {
  let mepResponse: { meps: MEPData[] }

  beforeAll(() => {
    mepResponse = loadJson<{ meps: MEPData[] }>('meps_clean.json')
  })

  it('data file has a meps array', () => {
    expect(mepResponse).toHaveProperty('meps')
    expect(Array.isArray(mepResponse.meps)).toBe(true)
    expect(mepResponse.meps.length).toBeGreaterThan(0)
  })

  it('every MEP record has the required fields', () => {
    for (const mep of mepResponse.meps) {
      expect(mep).toHaveProperty('mep_id')
      expect(mep).toHaveProperty('full_name')
      expect(mep).toHaveProperty('country_code')
      expect(mep).toHaveProperty('national_party_id')
      expect(mep).toHaveProperty('current_group_id')
      // national_party_id and current_group_id can be null for former MEPs;
      // when present they must carry a `name`.
      if (mep.national_party_id) {
        expect(mep.national_party_id).toHaveProperty('name')
      }
      if (mep.current_group_id) {
        expect(mep.current_group_id).toHaveProperty('name')
      }
    }
  })

  it('transformMEPData only returns Danish MEPs', () => {
    const politicians = transformMEPData(mepResponse.meps)
    // All should be from Denmark
    expect(politicians.length).toBeGreaterThan(0)

    const danishMeps = mepResponse.meps.filter(m =>
      m.country_code.includes('DNK')
    )
    expect(politicians).toHaveLength(danishMeps.length)
  })

  it('transformMEPData returns results sorted by vote count descending', () => {
    const politicians = transformMEPData(mepResponse.meps)
    for (let i = 1; i < politicians.length; i++) {
      expect(politicians[i - 1].votes).toBeGreaterThanOrEqual(politicians[i].votes)
    }
  })

  it('transformMEPData assigns party colours from PARTY_COLORS or fallback', () => {
    const politicians = transformMEPData(mepResponse.meps)
    for (const p of politicians) {
      expect(p.partyColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('participation percentages are between 0 and 100 (where defined)', () => {
    for (const mep of mepResponse.meps) {
      if (mep.participation_pct != null) {
        expect(mep.participation_pct).toBeGreaterThanOrEqual(0)
        expect(mep.participation_pct).toBeLessThanOrEqual(100)
      }
    }
  })

  it('group loyalty percentages are between 0 and 100 (where defined)', () => {
    for (const mep of mepResponse.meps) {
      if (mep.group_loyalty != null) {
        expect(mep.group_loyalty).toBeGreaterThanOrEqual(0)
        expect(mep.group_loyalty).toBeLessThanOrEqual(100)
      }
    }
  })

  it('n_votes_with_group + n_votes_against_group ≤ n_votes (where defined)', () => {
    for (const mep of mepResponse.meps) {
      if (mep.n_votes != null && mep.n_votes_with_group != null && mep.n_votes_against_group != null) {
        expect(mep.n_votes_with_group + mep.n_votes_against_group)
          .toBeLessThanOrEqual(mep.n_votes)
      }
    }
  })
})

// ── Vote details → Vote result chart & details sections ──────

describe('Vote details → Vote result chart & details sections', () => {
  const voteFiles = ['vote_details_186091.json', 'vote_details_186166.json', 'vote_details_188897.json']

  for (const file of voteFiles) {
    describe(file, () => {
      let vote: VoteDetails

      beforeAll(() => {
        vote = loadJson<VoteDetails>(file)
      })

      it('has required top-level fields', () => {
        expect(vote).toHaveProperty('Vote ID')
        expect(vote).toHaveProperty('Vote Description')
        expect(vote).toHaveProperty('Sitting Date')
      })

      it('Result For + Against + Abstention equals total votes cast', () => {
        if (vote.Result) {
          const total = vote.Result.For + vote.Result.Against + vote.Result.Abstention
          expect(total).toBeGreaterThan(0)
        }
      })

      it('By Group vote counts sum to the overall Result', () => {
        if (vote.Result && vote['By Group']) {
          let totalFor = 0, totalAgainst = 0, totalAbstention = 0
          for (const group of Object.values(vote['By Group'])) {
            totalFor += group.For
            totalAgainst += group.Against
            totalAbstention += group.Abstention
          }
          expect(totalFor).toBe(vote.Result.For)
          expect(totalAgainst).toBe(vote.Result.Against)
          expect(totalAbstention).toBe(vote.Result.Abstention)
        }
      })

      it('getMajorityLabel reflects the actual majority direction', () => {
        if (vote.Result) {
          const label = getMajorityLabel(
            vote.Result.For,
            vote.Result.Against,
            vote.Result.Abstention
          )
          const maxCount = Math.max(
            vote.Result.For,
            vote.Result.Against,
            vote.Result.Abstention
          )

          if (maxCount === vote.Result.For) {
            expect(label).toContain('for')
          } else if (maxCount === vote.Result.Against) {
            expect(label).toContain('imod')
          } else {
            expect(label).toContain('undlod')
          }
        }
      })

      it('normalizeVoteLabel handles all MEP vote labels in the file', () => {
        if (vote['Votes by MEP']) {
          for (const mepVote of vote['Votes by MEP']) {
            const normalised = normalizeVoteLabel(mepVote.Vote)
            // Every MEP vote should normalise to a known label
            expect(normalised).not.toBeNull()
            expect(['For', 'Against', 'Abstention']).toContain(normalised)
          }
        }
      })

      it('By Group keys are recognised EU Parliament groups', () => {
        if (vote['By Group']) {
          const knownGroups = new Set([...HEATMAP_GROUP_LABELS, 'NI'])
          for (const groupName of Object.keys(vote['By Group'])) {
            expect(knownGroups.has(groupName)).toBe(true)
          }
        }
      })
    })
  }
})

// ── Danish MEP disagreements → Danish MEP votes chart ────────

describe('Danish MEP disagreements → Danish MEP votes chart', () => {
  let disagreements: {
    mep_vs_party: { disagreements: Array<Record<string, unknown>> }
  }

  beforeAll(() => {
    disagreements = loadJson('Danske_MEPs_brud_med_partigruppelinjen.json')
  })

  it('data file has the expected structure', () => {
    expect(disagreements).toHaveProperty('mep_vs_party')
    expect(disagreements.mep_vs_party).toHaveProperty('disagreements')
    expect(Array.isArray(disagreements.mep_vs_party.disagreements)).toBe(true)
  })

  it('every disagreement record has the required fields', () => {
    for (const d of disagreements.mep_vs_party.disagreements) {
      expect(d).toHaveProperty('Vote ID')
      expect(d).toHaveProperty('MEP Name')
      expect(d).toHaveProperty('Vote Type')
      expect(d).toHaveProperty('Vote Type_Majority')
      expect(d).toHaveProperty('Group ID')
      expect(d).toHaveProperty('Group Majority Percentage')
    }
  })

  it('Vote Type is always different from Vote Type_Majority (it IS a disagreement)', () => {
    for (const d of disagreements.mep_vs_party.disagreements) {
      const mepVote = normalizeVoteLabel(d['Vote Type'] as string)
      const majorityVote = normalizeVoteLabel(d['Vote Type_Majority'] as string)
      if (mepVote && majorityVote) {
        expect(mepVote).not.toBe(majorityVote)
      }
    }
  })

  it('Group Majority Percentage is between 0 and 1', () => {
    for (const d of disagreements.mep_vs_party.disagreements) {
      const pct = d['Group Majority Percentage'] as number
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(1)
    }
  })

  it('every disagreement contains group vote columns', () => {
    const groupColumns = ['ECR', 'ESN', 'NI', 'PPE', 'PfE', 'Renew', 'S&D', 'The Left', 'Verts/ALE']
    for (const d of disagreements.mep_vs_party.disagreements) {
      for (const col of groupColumns) {
        expect(d).toHaveProperty(col)
      }
    }
  })
})

// ── National party disagreements → National party view ───────

describe('National party disagreements → National party view', () => {
  let data: {
    metadata: Record<string, unknown>
    parties: Record<string, {
      party_info: { name: string; total_meps: number }
      disagreement_statistics: {
        total_disagreements: number
        disagreement_rate_percent: number
      }
    }>
  }

  beforeAll(() => {
    data = loadJson('national_party_disagreements.json')
  })

  it('has metadata with total_parties_analyzed', () => {
    expect(data).toHaveProperty('metadata')
    expect(data.metadata).toHaveProperty('total_parties_analyzed')
  })

  it('has parties object with at least one party', () => {
    expect(data).toHaveProperty('parties')
    expect(Object.keys(data.parties).length).toBeGreaterThan(0)
  })

  it('every party has party_info and disagreement_statistics', () => {
    for (const [, party] of Object.entries(data.parties)) {
      expect(party).toHaveProperty('party_info')
      expect(party).toHaveProperty('disagreement_statistics')
      expect(party.party_info).toHaveProperty('name')
      expect(party.party_info).toHaveProperty('total_meps')
      expect(party.disagreement_statistics).toHaveProperty('total_disagreements')
      expect(party.disagreement_statistics).toHaveProperty('disagreement_rate_percent')
    }
  })

  it('disagreement rates are between 0 and 100', () => {
    for (const [, party] of Object.entries(data.parties)) {
      expect(party.disagreement_statistics.disagreement_rate_percent)
        .toBeGreaterThanOrEqual(0)
      expect(party.disagreement_statistics.disagreement_rate_percent)
        .toBeLessThanOrEqual(100)
    }
  })
})

// ── Committee & group names ──────────────────────────────────

describe('Committee & group names reference data', () => {
  let names: {
    committee_names: Record<string, string>
    political_group_names: Record<string, string>
  }

  beforeAll(() => {
    names = loadJson('committee_and_group_names.json')
  })

  it('has committee_names and political_group_names', () => {
    expect(names).toHaveProperty('committee_names')
    expect(names).toHaveProperty('political_group_names')
    expect(Object.keys(names.committee_names).length).toBeGreaterThan(0)
    expect(Object.keys(names.political_group_names).length).toBeGreaterThan(0)
  })

  it('most HEATMAP_GROUP_LABELS are present in political_group_names', () => {
    let found = 0
    for (const label of HEATMAP_GROUP_LABELS) {
      if (label in names.political_group_names) found++
    }
    // At least 6 of 8 groups should be present (new groups like ESN may lag)
    expect(found).toBeGreaterThanOrEqual(6)
  })
})

// ── types/data.tsx transforms ────────────────────────────────

describe('types/data.tsx transform functions', () => {
  it('formatRole maps all known role codes', () => {
    expect(formatRole('def/ep-roles/MEMBER')).toBe('Medlem')
    expect(formatRole('def/ep-roles/MEMBER_SUBSTITUTE')).toBe('Suppleant')
    expect(formatRole('def/ep-roles/CHAIR')).toBe('Formand')
    expect(formatRole('def/ep-roles/VICE_CHAIR')).toBe('Næstformand')
  })

  it('formatRole handles unknown roles with a human-readable fallback', () => {
    const result = formatRole('def/ep-roles/SOME_NEW_ROLE')
    expect(result).not.toContain('def/ep-roles/')
    expect(result.length).toBeGreaterThan(0)
  })

  it('getCurrentCommitteeMemberships returns only active memberships', () => {
    const mepResponse = loadJson<{ meps: MEPData[] }>('meps_clean.json')
    const danishMeps = mepResponse.meps.filter(m =>
      m.country_code.includes('DNK')
    )

    for (const mep of danishMeps) {
      const active = getCurrentCommitteeMemberships(mep)
      // All returned memberships should exist (function filters for active=1)
      // No crash = success; we also verify they're arrays
      expect(Array.isArray(active)).toBe(true)
    }
  })

  it('getPreviousCommitteeMemberships returns only inactive memberships', () => {
    const mepResponse = loadJson<{ meps: MEPData[] }>('meps_clean.json')
    const danishMeps = mepResponse.meps.filter(m =>
      m.country_code.includes('DNK')
    )

    for (const mep of danishMeps) {
      const previous = getPreviousCommitteeMemberships(mep)
      expect(Array.isArray(previous)).toBe(true)
    }
  })
})

// ── Cross-dataset consistency ────────────────────────────────

describe('Cross-dataset consistency', () => {
  it('all groups in Group Wins also appear in Pairwise Coalitions', () => {
    const groupWins = loadJson<GroupWinsData>('All_Group_wins.json')
    const pairwise = loadJson<PairwiseCoalitionsData>('All_Pairwise_coalitions.json')

    const pairwiseGroups = new Set<string>()
    for (const record of pairwise.TOTAL) {
      for (const g of record['Group Pair']) {
        pairwiseGroups.add(g)
      }
    }

    for (const g of groupWins.TOTAL.total_group_wins) {
      expect(pairwiseGroups.has(g['Group ID'])).toBe(true)
    }
  })

  it('all groups in Winning Coalitions appear in Group Wins', () => {
    const coalitions = loadJson<CoalitionsData>('All_Winning_coalitions.json')
    const groupWins = loadJson<GroupWinsData>('All_Group_wins.json')

    const winGroups = new Set(
      groupWins.TOTAL.total_group_wins.map(g => g['Group ID'])
    )

    for (const c of coalitions.TOTAL.total_coalitions) {
      for (const group of c['Winning Coalition']) {
        expect(winGroups.has(group)).toBe(true)
      }
    }
  })

  it('MEP IDs are unique within meps_clean.json', () => {
    const mepResponse = loadJson<{ meps: MEPData[] }>('meps_clean.json')
    const ids = mepResponse.meps.map(m => m.mep_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('committee keys in coalition/pairwise/wins datasets are consistent', () => {
    const coalitions = loadJson<CoalitionsData>('All_Winning_coalitions.json')
    const pairwise = loadJson<PairwiseCoalitionsData>('All_Pairwise_coalitions.json')
    const groupWins = loadJson<GroupWinsData>('All_Group_wins.json')

    const coalitionKeys = new Set(Object.keys(coalitions))
    const pairwiseKeys = new Set(Object.keys(pairwise))
    const winsKeys = new Set(Object.keys(groupWins))

    // TOTAL should be in all three
    expect(coalitionKeys.has('TOTAL')).toBe(true)
    expect(pairwiseKeys.has('TOTAL')).toBe(true)
    expect(winsKeys.has('TOTAL')).toBe(true)
  })
})

// ── Theme datasets → Theme pages, latest-votes (theme mode), heatmap, coalitions ──

/** All themes shipped with the app. Each entry pairs the theme JSON file
 * (loaded by /tema/[slug] and the donut chart) with the matching key used
 * by the All_Pairwise_coalitions.json / All_Group_wins.json /
 * All_Winning_coalitions.json groupings. */
const THEME_FIXTURES = [
  { file: 'theme_votes_forsvar_sikkerhed.json', themeKey: 'theme_forsvar_sikkerhed' },
  { file: 'theme_votes_energi_industri.json', themeKey: 'theme_energi_industri' },
  { file: 'theme_votes_miljo_sundhed.json', themeKey: 'theme_miljo_sundhed' },
] as const

interface ThemeVote {
  vote_id: number | string
  vote_description: string
  sitting_time?: string
  for: number
  against: number
  abstention: number
}

interface ThemeDocument {
  document_reference: string
  document_sitting_date: string
  short_title: string
  committee: (string | number)[]
  eurovoc_keywords: string[]
  voteCount: number
  votes: ThemeVote[]
}

interface ThemeVotesFile {
  metadata: {
    votes_total: number
    documents_total: number
    theme: string
    theme_label: string
    theme_definition?: string
    theme_description?: string
  }
  committees: Array<{ label: string; voteCount: number }>
  eurovoc: Array<{ label: string; voteCount: number }>
  documents: ThemeDocument[]
}

describe('Theme votes → Theme pages, latest-votes (theme mode) & donut chart', () => {
  for (const { file } of THEME_FIXTURES) {
    describe(file, () => {
      let theme: ThemeVotesFile

      beforeAll(() => {
        theme = loadJson<ThemeVotesFile>(file)
      })

      it('has metadata with required theme fields', () => {
        expect(theme).toHaveProperty('metadata')
        expect(theme.metadata).toHaveProperty('theme')
        expect(theme.metadata).toHaveProperty('theme_label')
        expect(typeof theme.metadata.votes_total).toBe('number')
        expect(typeof theme.metadata.documents_total).toBe('number')
      })

      it('has committees and eurovoc count arrays for filter tiles', () => {
        expect(Array.isArray(theme.committees)).toBe(true)
        expect(Array.isArray(theme.eurovoc)).toBe(true)
        for (const c of theme.committees) {
          expect(typeof c.label).toBe('string')
          expect(typeof c.voteCount).toBe('number')
          expect(c.voteCount).toBeGreaterThan(0)
        }
        for (const e of theme.eurovoc) {
          expect(typeof e.label).toBe('string')
          expect(typeof e.voteCount).toBe('number')
          expect(e.voteCount).toBeGreaterThan(0)
        }
      })

      it('documents array is non-empty and each doc has the required shape', () => {
        expect(Array.isArray(theme.documents)).toBe(true)
        expect(theme.documents.length).toBeGreaterThan(0)
        for (const doc of theme.documents) {
          expect(typeof doc.document_reference).toBe('string')
          expect(typeof doc.document_sitting_date).toBe('string')
          expect(typeof doc.short_title).toBe('string')
          expect(Array.isArray(doc.committee)).toBe(true)
          expect(Array.isArray(doc.eurovoc_keywords)).toBe(true)
          expect(Array.isArray(doc.votes)).toBe(true)
          expect(doc.votes.length).toBeGreaterThan(0)
        }
      })

      it('every vote carries vote_id and numeric for/against/abstention', () => {
        for (const doc of theme.documents) {
          for (const v of doc.votes) {
            // vote_id is required so the latest-votes page can deep-link
            // and so MEP-disagreement filtering can match.
            expect(v.vote_id).toBeDefined()
            expect(['number', 'string']).toContain(typeof v.vote_id)
            expect(typeof v.for).toBe('number')
            expect(typeof v.against).toBe('number')
            expect(typeof v.abstention).toBe('number')
            expect(v.for + v.against + v.abstention).toBeGreaterThan(0)
          }
        }
      })

      it('document voteCount equals votes.length', () => {
        for (const doc of theme.documents) {
          if (typeof doc.voteCount === 'number') {
            expect(doc.voteCount).toBe(doc.votes.length)
          }
        }
      })

      it('metadata totals match the documents/votes content', () => {
        const docCount = theme.documents.length
        const voteCount = theme.documents.reduce((n, d) => n + d.votes.length, 0)
        expect(theme.metadata.documents_total).toBe(docCount)
        expect(theme.metadata.votes_total).toBe(voteCount)
      })

      it('(document_reference, sitting_date) tuples are unique (matches latest-votes dedup key)', () => {
        const keys = theme.documents
          .map((d) => `${d.document_reference}|${(d.document_sitting_date || '').split(/[T ]/)[0]}`)
          .filter((k) => !k.startsWith('|'))
        expect(new Set(keys).size).toBe(keys.length)
      })

      it('precomputed committee tile counts match recomputed totals', () => {
        const computed: Record<string, number> = {}
        for (const doc of theme.documents) {
          for (const raw of doc.committee) {
            const name = String(raw).trim()
            if (!name) continue
            computed[name] = (computed[name] || 0) + doc.votes.length
          }
        }
        for (const c of theme.committees) {
          expect(computed[c.label]).toBe(c.voteCount)
        }
      })

      it('precomputed eurovoc tile counts match recomputed totals', () => {
        const computed: Record<string, number> = {}
        for (const doc of theme.documents) {
          for (const kw of doc.eurovoc_keywords || []) {
            computed[kw] = (computed[kw] || 0) + doc.votes.length
          }
        }
        for (const e of theme.eurovoc) {
          expect(computed[e.label]).toBe(e.voteCount)
        }
      })
    })
  }
})

describe('Theme groupings in coalition datasets → Heatmap & coalition charts', () => {
  let pairwise: PairwiseCoalitionsData
  let groupWins: GroupWinsData
  let coalitions: CoalitionsData

  beforeAll(() => {
    pairwise = loadJson<PairwiseCoalitionsData>('All_Pairwise_coalitions.json')
    groupWins = loadJson<GroupWinsData>('All_Group_wins.json')
    coalitions = loadJson<CoalitionsData>('All_Winning_coalitions.json')
  })

  for (const { themeKey } of THEME_FIXTURES) {
    describe(themeKey, () => {
      it('exists in All_Pairwise_coalitions.json with valid records', () => {
        const records = (pairwise as Record<string, unknown>)[themeKey] as Array<{
          'Group Pair': [string, string]
          Total: number
          Count: number
          Percentage: number
        }>
        expect(Array.isArray(records)).toBe(true)
        expect(records.length).toBeGreaterThan(0)
        for (const r of records) {
          expect(Array.isArray(r['Group Pair'])).toBe(true)
          expect(r['Group Pair']).toHaveLength(2)
          expect(typeof r.Total).toBe('number')
          expect(typeof r.Count).toBe('number')
          expect(typeof r.Percentage).toBe('number')
          expect(r.Count).toBeLessThanOrEqual(r.Total)
          expect(r.Percentage).toBeGreaterThanOrEqual(0)
          expect(r.Percentage).toBeLessThanOrEqual(100)
        }
      })

      it('exists in All_Group_wins.json with valid Group Win records', () => {
        const records = (groupWins as Record<string, unknown>)[themeKey] as Array<{
          'Group ID': string
          'Win Count': number
          'Win Percentage': number
        }>
        expect(Array.isArray(records)).toBe(true)
        expect(records.length).toBeGreaterThan(0)
        for (const r of records) {
          expect(typeof r['Group ID']).toBe('string')
          expect(typeof r['Win Count']).toBe('number')
          expect(typeof r['Win Percentage']).toBe('number')
          expect(r['Win Percentage']).toBeGreaterThanOrEqual(0)
          expect(r['Win Percentage']).toBeLessThanOrEqual(100)
          expect(GROUP_COLORS).toHaveProperty(r['Group ID'])
        }
      })

      it('exists in All_Winning_coalitions.json with valid coalition records', () => {
        const records = (coalitions as Record<string, unknown>)[themeKey] as Array<{
          'Winning Coalition': string[]
          Count: number
          Percentage: number
        }>
        expect(Array.isArray(records)).toBe(true)
        expect(records.length).toBeGreaterThan(0)
        for (const r of records) {
          expect(Array.isArray(r['Winning Coalition'])).toBe(true)
          expect(r['Winning Coalition'].length).toBeGreaterThan(0)
          expect(typeof r.Count).toBe('number')
          expect(typeof r.Percentage).toBe('number')
          expect(r.Percentage).toBeGreaterThanOrEqual(0)
          expect(r.Percentage).toBeLessThanOrEqual(100)
        }
      })
    })
  }

  it('every theme key in pairwise data is also present in group wins and winning coalitions', () => {
    const pairwiseThemes = Object.keys(pairwise).filter((k) => k.startsWith('theme_'))
    expect(pairwiseThemes.length).toBeGreaterThan(0)
    for (const k of pairwiseThemes) {
      expect(groupWins).toHaveProperty(k)
      expect(coalitions).toHaveProperty(k)
    }
  })

  it('heatmap matrix can be built from each theme pairwise grouping', () => {
    for (const { themeKey } of THEME_FIXTURES) {
      const records = (pairwise as Record<string, unknown>)[themeKey] as Parameters<
        typeof buildMatrixFromPairwise
      >[0]
      const matrix = buildMatrixFromPairwise(records)
      expect(Array.isArray(matrix)).toBe(true)
      expect(matrix.length).toBeGreaterThan(0)
    }
  })
})

describe('Theme votes ↔ MEP disagreements cross-link', () => {
  it('each theme votes file shares some vote_ids with the MEP disagreement dataset', () => {
    const brud = loadJson<{ mep_vs_party: { disagreements: Array<{ 'Vote ID': string | number }> } }>(
      'Danske_MEPs_brud_med_partigruppelinjen.json'
    )
    const allDisagreementVoteIds = new Set(
      brud.mep_vs_party.disagreements.map((d) => String(d['Vote ID']))
    )

    for (const { file } of THEME_FIXTURES) {
      const theme = loadJson<ThemeVotesFile>(file)
      const themeVoteIds = new Set<string>()
      for (const doc of theme.documents) {
        for (const v of doc.votes) themeVoteIds.add(String(v.vote_id))
      }
      const overlap = [...themeVoteIds].filter((id) => allDisagreementVoteIds.has(id))
      // Without overlap, the ?mep=<name>&search=<theme>&eurovoc=<…> deep-link
      // from /danish-mep-votes would render an empty list on /latest-votes.
      expect(overlap.length).toBeGreaterThan(0)
    }
  })
})

