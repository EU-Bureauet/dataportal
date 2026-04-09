/**
 * Pure data-transformation functions used by visualisation components.
 * Extracted here so they can be unit-tested against the real JSON data files.
 */

import type { PairwiseCoalition } from "@/types/data";

// ── Heatmap ──────────────────────────────────────────────────

export const HEATMAP_GROUP_LABELS = ['PPE', 'S&D', 'Renew', 'Verts/ALE', 'ECR', 'The Left', 'ESN', 'PfE'] as const;

/**
 * Build an 8×8 agreement-percentage matrix from pairwise coalition data.
 * Diagonal cells = 100 (a group always agrees with itself).
 */
export function buildMatrixFromPairwise(pairwiseData: PairwiseCoalition[]): number[][] {
  const matrix: number[][] = Array(8).fill(0).map(() => Array(8).fill(0));

  const dataMap = new Map<string, number>();
  pairwiseData.forEach(item => {
    const [group1, group2] = item["Group Pair"];
    dataMap.set(`${group1}-${group2}`, item.Percentage);
    dataMap.set(`${group2}-${group1}`, item.Percentage);
  });

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i === j) {
        matrix[i][j] = 100;
      } else {
        const key = `${HEATMAP_GROUP_LABELS[i]}-${HEATMAP_GROUP_LABELS[j]}`;
        matrix[i][j] = dataMap.get(key) || 0;
      }
    }
  }

  return matrix;
}

/** Map a 0–100 agreement value to a display colour. */
export function getHeatmapColor(value: number): string {
  if (value >= 80) return '#80d8a8';
  if (value >= 60) return '#a8e0b8';
  if (value >= 40) return '#ffff80';
  if (value >= 20) return '#ffd9a8';
  return '#adcdea';
}

// ── Coalitions sunburst ──────────────────────────────────────

export type FrequencyCategory = "Dominant" | "Common" | "Uncommon" | "Rare";

/** Classify a coalition's occurrence percentage into a frequency bucket. */
export function categorizeCoalition(percentage: number): FrequencyCategory {
  if (percentage >= 20) return "Dominant";
  if (percentage >= 5) return "Common";
  if (percentage >= 2) return "Uncommon";
  return "Rare";
}

// ── Frequent coalitions bar chart ────────────────────────────

/** Produce a canonical key for a coalition so the same group set matches regardless of order. */
export function coalitionKey(groups: string[]): string {
  return [...groups].sort().join("|");
}

// ── Vote details ─────────────────────────────────────────────

/** Return a short Danish label describing the majority vote direction. */
export function getMajorityLabel(forCount: number, againstCount: number, abstentionCount: number): string {
  const total = forCount + againstCount + abstentionCount;
  const votes = [
    { label: 'for', count: forCount, pct: total > 0 ? (forCount / total) * 100 : 0 },
    { label: 'undlod', count: abstentionCount, pct: total > 0 ? (abstentionCount / total) * 100 : 0 },
    { label: 'imod', count: againstCount, pct: total > 0 ? (againstCount / total) * 100 : 0 },
  ];
  const majority = votes.reduce((max, v) => v.count > max.count ? v : max, votes[0]);
  return `${majority.pct.toFixed(0)}% ${majority.label}`;
}

/** Normalise varied vote-type strings to a canonical label. */
export function normalizeVoteLabel(label: string | undefined): 'For' | 'Against' | 'Abstention' | null {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  if (lower === 'for' || lower === '+') return 'For';
  if (lower === 'against' || lower === 'imod' || lower === '-') return 'Against';
  if (lower === 'abstention' || lower === 'undlod' || lower === '0') return 'Abstention';
  return null;
}

// ── Group wins ───────────────────────────────────────────────

export interface GroupWin {
  "Group ID": string;
  "Win Count": number;
  "Win Percentage": number;
}

/** Compute summary statistics for an array of group wins. */
export function computeGroupWinStats(data: GroupWin[]) {
  if (data.length === 0) return { highest: null, lowest: null, average: 0, count: 0 };

  const sorted = [...data].sort((a, b) => b["Win Percentage"] - a["Win Percentage"]);
  const sum = sorted.reduce((s, g) => s + g["Win Percentage"], 0);

  return {
    highest: sorted[0],
    lowest: sorted[sorted.length - 1],
    average: Math.round(sum / sorted.length),
    count: sorted.length,
  };
}
