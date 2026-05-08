/**
 * Unit tests for pure data-transformation functions used by visualisations.
 * These verify the contract between raw data shapes and what components display.
 */
import { describe, it, expect } from 'vitest'
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
import type { PairwiseCoalition } from '@/types/data'

// ── Heatmap ──────────────────────────────────────────────────

describe('HEATMAP_GROUP_LABELS', () => {
  it('contains exactly 8 groups', () => {
    expect(HEATMAP_GROUP_LABELS).toHaveLength(8)
  })

  it('includes the expected EU Parliament groups', () => {
    expect(HEATMAP_GROUP_LABELS).toContain('PPE')
    expect(HEATMAP_GROUP_LABELS).toContain('S&D')
    expect(HEATMAP_GROUP_LABELS).toContain('Renew')
    expect(HEATMAP_GROUP_LABELS).toContain('Verts/ALE')
    expect(HEATMAP_GROUP_LABELS).toContain('ECR')
    expect(HEATMAP_GROUP_LABELS).toContain('The Left')
    expect(HEATMAP_GROUP_LABELS).toContain('ESN')
    expect(HEATMAP_GROUP_LABELS).toContain('PfE')
  })
})

describe('buildMatrixFromPairwise', () => {
  it('returns an 8×8 matrix', () => {
    const matrix = buildMatrixFromPairwise([])
    expect(matrix).toHaveLength(8)
    matrix.forEach(row => expect(row).toHaveLength(8))
  })

  it('sets diagonal cells to 100 (self-agreement)', () => {
    const matrix = buildMatrixFromPairwise([])
    for (let i = 0; i < 8; i++) {
      expect(matrix[i][i]).toBe(100)
    }
  })

  it('fills non-diagonal cells from pairwise data', () => {
    const data: PairwiseCoalition[] = [
      { "Group Pair": ["PPE", "S&D"], Total: 100, Count: 60, Percentage: 60 },
    ]
    const matrix = buildMatrixFromPairwise(data)

    // PPE is index 0, S&D is index 1
    expect(matrix[0][1]).toBe(60)
    expect(matrix[1][0]).toBe(60) // symmetric
  })

  it('defaults missing pairs to 0', () => {
    const matrix = buildMatrixFromPairwise([])
    expect(matrix[0][1]).toBe(0)
    expect(matrix[2][5]).toBe(0)
  })

  it('is symmetric (matrix[i][j] === matrix[j][i])', () => {
    const data: PairwiseCoalition[] = [
      { "Group Pair": ["ECR", "Renew"], Total: 200, Count: 90, Percentage: 45 },
      { "Group Pair": ["PPE", "PfE"], Total: 150, Count: 75, Percentage: 50 },
    ]
    const matrix = buildMatrixFromPairwise(data)

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i])
      }
    }
  })
})

describe('getHeatmapColor', () => {
  it('returns the correct colour for each threshold tier', () => {
    expect(getHeatmapColor(100)).toBe('#80d8a8') // ≥80
    expect(getHeatmapColor(80)).toBe('#80d8a8')
    expect(getHeatmapColor(79)).toBe('#a8e0b8')  // ≥60
    expect(getHeatmapColor(60)).toBe('#a8e0b8')
    expect(getHeatmapColor(59)).toBe('#ffff80')   // ≥40
    expect(getHeatmapColor(40)).toBe('#ffff80')
    expect(getHeatmapColor(39)).toBe('#ffd9a8')   // ≥20
    expect(getHeatmapColor(20)).toBe('#ffd9a8')
    expect(getHeatmapColor(19)).toBe('#adcdea')   // <20
    expect(getHeatmapColor(0)).toBe('#adcdea')
  })

  it('covers all values from 0 to 100 without gaps', () => {
    for (let v = 0; v <= 100; v++) {
      expect(getHeatmapColor(v)).toBeTruthy()
    }
  })
})

// ── Coalitions sunburst ───────────────────────────────────────

describe('categorizeCoalition', () => {
  it('returns "Dominant" for ≥20%', () => {
    expect(categorizeCoalition(20)).toBe('Dominant')
    expect(categorizeCoalition(50)).toBe('Dominant')
    expect(categorizeCoalition(100)).toBe('Dominant')
  })

  it('returns "Common" for ≥5% and <20%', () => {
    expect(categorizeCoalition(5)).toBe('Common')
    expect(categorizeCoalition(19.9)).toBe('Common')
  })

  it('returns "Uncommon" for ≥2% and <5%', () => {
    expect(categorizeCoalition(2)).toBe('Uncommon')
    expect(categorizeCoalition(4.9)).toBe('Uncommon')
  })

  it('returns "Rare" for <2%', () => {
    expect(categorizeCoalition(1.9)).toBe('Rare')
    expect(categorizeCoalition(0)).toBe('Rare')
  })

  it('covers all EU Parliament coalition frequencies without leaving gaps', () => {
    // Boundary values
    const boundaries = [0, 1.9, 2, 4.9, 5, 19.9, 20, 100]
    boundaries.forEach(pct => {
      const result = categorizeCoalition(pct)
      expect(['Dominant', 'Common', 'Uncommon', 'Rare']).toContain(result)
    })
  })
})

// ── Frequent coalitions bar chart ─────────────────────────────

describe('coalitionKey', () => {
  it('sorts groups alphabetically and joins with |', () => {
    expect(coalitionKey(['S&D', 'PPE', 'Renew'])).toBe('PPE|Renew|S&D')
  })

  it('produces the same key regardless of input order', () => {
    const a = coalitionKey(['ECR', 'PPE', 'PfE'])
    const b = coalitionKey(['PfE', 'ECR', 'PPE'])
    const c = coalitionKey(['PPE', 'PfE', 'ECR'])
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('handles single-group input', () => {
    expect(coalitionKey(['PPE'])).toBe('PPE')
  })

  it('does not mutate the original array', () => {
    const original = ['S&D', 'PPE']
    coalitionKey(original)
    expect(original).toEqual(['S&D', 'PPE'])
  })
})

// ── Vote details ──────────────────────────────────────────────

describe('getMajorityLabel', () => {
  it('returns Danish label with the majority vote direction', () => {
    // 300 for, 100 against, 50 abstention → "67% for"
    expect(getMajorityLabel(300, 100, 50)).toBe('67% for')
  })

  it('labels "imod" when against is the majority', () => {
    expect(getMajorityLabel(10, 400, 10)).toBe('95% imod')
  })

  it('labels "undlod" when abstention is the majority', () => {
    expect(getMajorityLabel(5, 5, 100)).toBe('91% undlod')
  })

  it('handles zero total votes without dividing by zero', () => {
    const result = getMajorityLabel(0, 0, 0)
    expect(result).toMatch(/^\d+%/)  // Should still produce a percentage string
  })

  it('treats a tie by selecting the first tied option (for > undlod > imod)', () => {
    // Equal counts - reduce picks the first max
    const result = getMajorityLabel(100, 100, 100)
    expect(result).toBe('33% for')
  })
})

describe('normalizeVoteLabel', () => {
  it('normalises "For" variants', () => {
    expect(normalizeVoteLabel('For')).toBe('For')
    expect(normalizeVoteLabel('for')).toBe('For')
    expect(normalizeVoteLabel('+')).toBe('For')
    expect(normalizeVoteLabel(' For ')).toBe('For')
  })

  it('normalises "Against" variants', () => {
    expect(normalizeVoteLabel('Against')).toBe('Against')
    expect(normalizeVoteLabel('against')).toBe('Against')
    expect(normalizeVoteLabel('imod')).toBe('Against')
    expect(normalizeVoteLabel('-')).toBe('Against')
  })

  it('normalises "Abstention" variants', () => {
    expect(normalizeVoteLabel('Abstention')).toBe('Abstention')
    expect(normalizeVoteLabel('abstention')).toBe('Abstention')
    expect(normalizeVoteLabel('undlod')).toBe('Abstention')
    expect(normalizeVoteLabel('0')).toBe('Abstention')
  })

  it('returns null for unrecognised labels', () => {
    expect(normalizeVoteLabel('maybe')).toBeNull()
    expect(normalizeVoteLabel('')).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(normalizeVoteLabel(undefined)).toBeNull()
  })
})

// ── Group wins ───────────────────────────────────────────────

describe('computeGroupWinStats', () => {
  const sampleData = [
    { "Group ID": "PPE", "Win Count": 400, "Win Percentage": 80 },
    { "Group ID": "S&D", "Win Count": 300, "Win Percentage": 60 },
    { "Group ID": "ECR", "Win Count": 200, "Win Percentage": 40 },
  ]

  it('identifies the group with the highest win percentage', () => {
    const stats = computeGroupWinStats(sampleData)
    expect(stats.highest?.["Group ID"]).toBe('PPE')
    expect(stats.highest?.["Win Percentage"]).toBe(80)
  })

  it('identifies the group with the lowest win percentage', () => {
    const stats = computeGroupWinStats(sampleData)
    expect(stats.lowest?.["Group ID"]).toBe('ECR')
    expect(stats.lowest?.["Win Percentage"]).toBe(40)
  })

  it('computes the correct average (rounded)', () => {
    const stats = computeGroupWinStats(sampleData)
    // (80 + 60 + 40) / 3 = 60
    expect(stats.average).toBe(60)
  })

  it('returns the correct count', () => {
    const stats = computeGroupWinStats(sampleData)
    expect(stats.count).toBe(3)
  })

  it('handles empty data gracefully', () => {
    const stats = computeGroupWinStats([])
    expect(stats.highest).toBeNull()
    expect(stats.lowest).toBeNull()
    expect(stats.average).toBe(0)
    expect(stats.count).toBe(0)
  })

  it('handles a single group', () => {
    const stats = computeGroupWinStats([
      { "Group ID": "PfE", "Win Count": 110, "Win Percentage": 55 },
    ])
    expect(stats.highest?.["Group ID"]).toBe('PfE')
    expect(stats.lowest?.["Group ID"]).toBe('PfE')
    expect(stats.average).toBe(55)
    expect(stats.count).toBe(1)
  })
})
