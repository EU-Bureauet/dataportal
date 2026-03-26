"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PairwiseEntry {
  "Group Pair": [string, string];
  Total: number;
  Count: number;
  Percentage: number;
}

interface WinningCoalition {
  "Winning Coalition": string[];
  Count: number;
  Percentage: number;
}

interface GroupTooltip {
  code: string;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  ECR: "#0E4DA4",
  ESN: "#1B263B",
  NI: "#808080",
  PPE: "#003399",
  PfE: "#143862",
  Renew: "#FFD700",
  "S&D": "#E30613",
  "The Left": "#8B0000",
  "Verts/ALE": "#009A44",
};

const GROUP_ORDER = ["The Left", "Verts/ALE", "S&D", "Renew", "PPE", "ECR", "PfE", "ESN", "NI"];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Helper: agreement colour ────────────────────────────────────────────────

function agreementColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-600 text-white";
  if (pct >= 60) return "bg-emerald-400 text-white";
  if (pct >= 40) return "bg-amber-300 text-gray-900";
  if (pct >= 20) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

function agreementBg(pct: number): string {
  if (pct >= 80) return "#059669";
  if (pct >= 60) return "#34d399";
  if (pct >= 40) return "#fcd34d";
  if (pct >= 20) return "#fb923c";
  return "#ef4444";
}

// ─── Frequency categories ────────────────────────────────────────────────────

type FreqCat = "dominant" | "common" | "uncommon" | "rare";

function freqCategory(pct: number): FreqCat {
  if (pct >= 20) return "dominant";
  if (pct >= 5) return "common";
  if (pct >= 2) return "uncommon";
  return "rare";
}

const FREQ_LABELS: Record<FreqCat, string> = {
  dominant: "Dominerende (≥20%)",
  common: "Almindelig (5–20%)",
  uncommon: "Mindre almindelig (2–5%)",
  rare: "Sjælden (<2%)",
};

const FREQ_COLORS: Record<FreqCat, string> = {
  dominant: "#059669",
  common: "#34d399",
  uncommon: "#fbbf24",
  rare: "#94a3b8",
};

// ─── GroupBadge (inline) ─────────────────────────────────────────────────────

function GroupPill({ code, description }: Readonly<{ code: string; description?: string }>) {
  const bg = GROUP_COLORS[code] ?? "#888";
  return (
    <span className="relative group/tip inline-flex">
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium text-white cursor-default"
        style={{ backgroundColor: bg }}
      >
        {code}
      </span>
      {description && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 text-xs leading-snug shadow-md opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity duration-150 z-50 text-center">
          <span className="font-semibold text-gray-900">{code}</span>: {description}
        </span>
      )}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ThemeCoalitions() {
  const searchParams = useSearchParams();
  const committee = searchParams.get("committee") ?? "TOTAL";
  const themeName = searchParams.get("theme") ?? "";

  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: pairwiseData } = useSWR<Record<string, PairwiseEntry[]>>(
    `${basePath}/data/All_Pairwise_coalitions.json`,
    fetcher,
  );
  const { data: winningData } = useSWR<Record<string, { total_coalitions: WinningCoalition[] }>>(
    `${basePath}/data/All_Winning_coalitions.json`,
    fetcher,
  );
  const { data: tooltipData } = useSWR<{ groups: GroupTooltip[] }>(
    `${basePath}/data/group-tooltips.json`,
    fetcher,
  );

  const groupDescriptions = useMemo(() => {
    const map: Record<string, string> = {};
    if (tooltipData) {
      for (const g of tooltipData.groups) map[g.code] = g.description;
    }
    return map;
  }, [tooltipData]);

  // ─── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"matrix" | "coalitions">("matrix");
  const [selectedFreq, setSelectedFreq] = useState<FreqCat | null>(null);

  // ─── Pairwise matrix ──────────────────────────────────────────────────────
  const { matrix, groups } = useMemo(() => {
    if (!pairwiseData) return { matrix: new Map<string, number>(), groups: [] as string[] };
    const entries = pairwiseData[committee] ?? pairwiseData["TOTAL"] ?? [];
    const m = new Map<string, number>();
    const gs = new Set<string>();
    for (const e of entries) {
      const [a, b] = e["Group Pair"];
      gs.add(a);
      gs.add(b);
      m.set(`${a}|${b}`, e.Percentage);
      m.set(`${b}|${a}`, e.Percentage);
    }
    const ordered = GROUP_ORDER.filter((g) => gs.has(g));
    return { matrix: m, groups: ordered };
  }, [pairwiseData, committee]);

  // ─── Winning coalitions ────────────────────────────────────────────────────
  const coalitions = useMemo(() => {
    if (!winningData) return [];
    const cat = winningData[committee] ?? winningData["TOTAL"];
    return cat?.total_coalitions ?? [];
  }, [winningData, committee]);

  const categorisedCoalitions = useMemo(() => {
    return coalitions.map((c) => ({ ...c, freq: freqCategory(c.Percentage) }));
  }, [coalitions]);

  const freqStats = useMemo(() => {
    const stats: Record<FreqCat, { count: number; totalPct: number }> = {
      dominant: { count: 0, totalPct: 0 },
      common: { count: 0, totalPct: 0 },
      uncommon: { count: 0, totalPct: 0 },
      rare: { count: 0, totalPct: 0 },
    };
    for (const c of categorisedCoalitions) {
      stats[c.freq].count += 1;
      stats[c.freq].totalPct += c.Percentage;
    }
    return stats;
  }, [categorisedCoalitions]);

  const displayCoalitions = useMemo(() => {
    const list = selectedFreq
      ? categorisedCoalitions.filter((c) => c.freq === selectedFreq)
      : categorisedCoalitions.slice(0, 12);
    return list;
  }, [categorisedCoalitions, selectedFreq]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (!pairwiseData || !winningData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const committeeLabel = committee !== "TOTAL" ? committee : "alle udvalg";

  return (
    <div>
      {/* Header context */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Data baseret på afstemninger i <span className="font-semibold">{committeeLabel}</span>
          {themeName && <> under temaet <span className="font-semibold">{themeName}</span></>}.
          Tallene viser hvor ofte de politiske grupper stemmer ens.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "matrix" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Enighed mellem grupper
        </button>
        <button
          onClick={() => setActiveTab("coalitions")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "coalitions" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Vindende koalitioner
        </button>
      </div>

      {/* ─── Tab: Pairwise agreement matrix ───────────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 overflow-x-auto">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Hvor ofte stemmer grupperne ens?</h3>
          <p className="text-xs text-gray-500 mb-4">Procent af afstemninger hvor to grupper stemmer det samme. Grøn = høj enighed, rød = lav enighed.</p>

          {/* Legend */}
          <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
            <span>Lav enighed</span>
            <div className="flex h-3 rounded overflow-hidden">
              {[20, 40, 60, 80, 100].map((v) => (
                <div key={v} className="w-8 h-full" style={{ backgroundColor: agreementBg(v) }} />
              ))}
            </div>
            <span>Høj enighed</span>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1" />
                {groups.map((g) => (
                  <th key={g} className="p-1 text-center font-medium" style={{ color: GROUP_COLORS[g] }}>
                    <span className="writing-mode-normal">{g}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((row) => (
                <tr key={row}>
                  <td className="p-1 font-medium text-right pr-2 whitespace-nowrap" style={{ color: GROUP_COLORS[row] }}>
                    {row}
                  </td>
                  {groups.map((col) => {
                    if (row === col) {
                      return (
                        <td key={col} className="p-1">
                          <div className="w-full aspect-square rounded bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">—</div>
                        </td>
                      );
                    }
                    const pct = matrix.get(`${row}|${col}`);
                    if (pct == null) {
                      return (
                        <td key={col} className="p-1">
                          <div className="w-full aspect-square rounded bg-gray-100 flex items-center justify-center text-gray-300 text-[10px]">?</div>
                        </td>
                      );
                    }
                    return (
                      <td key={col} className="p-1">
                        <div
                          className={`relative group/cell w-full aspect-square rounded flex items-center justify-center font-semibold ${agreementColor(pct)} cursor-default`}
                        >
                          <span className="text-[10px] sm:text-xs">{pct.toFixed(0)}%</span>
                          {/* Tooltip */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 rounded-lg bg-white text-gray-800 border border-gray-200 text-xs leading-snug shadow-md opacity-0 pointer-events-none group-hover/cell:opacity-100 group-hover/cell:pointer-events-auto transition-opacity duration-150 z-50 text-center">
                            <span className="font-semibold" style={{ color: GROUP_COLORS[row] }}>{row}</span>
                            {" og "}
                            <span className="font-semibold" style={{ color: GROUP_COLORS[col] }}>{col}</span>
                            <br />
                            stemmer ens i <span className="font-semibold">{pct.toFixed(1)}%</span> af afstemningerne
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Top 5 strongest & weakest pairs */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Stærkeste alliancer</h4>
              {[...(pairwiseData[committee] ?? pairwiseData["TOTAL"] ?? [])]
                .sort((a, b) => b.Percentage - a.Percentage)
                .slice(0, 5)
                .map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <GroupPill code={e["Group Pair"][0]} description={groupDescriptions[e["Group Pair"][0]]} />
                    <span className="text-xs text-gray-400">+</span>
                    <GroupPill code={e["Group Pair"][1]} description={groupDescriptions[e["Group Pair"][1]]} />
                    <span className="ml-auto text-xs font-semibold text-emerald-700">{e.Percentage.toFixed(1)}%</span>
                  </div>
                ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Største uenighed</h4>
              {[...(pairwiseData[committee] ?? pairwiseData["TOTAL"] ?? [])]
                .sort((a, b) => a.Percentage - b.Percentage)
                .slice(0, 5)
                .map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <GroupPill code={e["Group Pair"][0]} description={groupDescriptions[e["Group Pair"][0]]} />
                    <span className="text-xs text-gray-400">+</span>
                    <GroupPill code={e["Group Pair"][1]} description={groupDescriptions[e["Group Pair"][1]]} />
                    <span className="ml-auto text-xs font-semibold text-red-600">{e.Percentage.toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Winning coalitions ──────────────────────────────────────── */}
      {activeTab === "coalitions" && (
        <div className="space-y-6">
          {/* Frequency category selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["dominant", "common", "uncommon", "rare"] as FreqCat[]).map((cat) => {
              const s = freqStats[cat];
              const isActive = selectedFreq === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedFreq(isActive ? null : cat)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isActive ? "ring-2 ring-blue-500 border-blue-400" : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={{
                    borderLeftColor: FREQ_COLORS[cat],
                    borderLeftWidth: "4px",
                    opacity: selectedFreq && !isActive ? 0.5 : 1,
                  }}
                >
                  <div className="text-xs font-semibold text-gray-700">{FREQ_LABELS[cat]}</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{s.count}</div>
                  <div className="text-xs text-gray-500">{s.totalPct.toFixed(1)}% af stemmer</div>
                </button>
              );
            })}
          </div>

          {/* Coalition list */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {displayCoalitions.length === 0 && (
              <p className="p-6 text-sm text-gray-500 italic text-center">Ingen koalitioner i denne kategori.</p>
            )}
            {displayCoalitions.map((c, i) => (
              <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c["Winning Coalition"].map((g, gi) => (
                      <span key={g} className="flex items-center gap-1">
                        <GroupPill code={g} description={groupDescriptions[g]} />
                        {gi < c["Winning Coalition"].length - 1 && <span className="text-gray-300">+</span>}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-500">{c.Count.toLocaleString("da-DK")} afstemninger</span>
                    <span className="text-base font-bold text-gray-900">{c.Percentage.toFixed(1)}%</span>
                  </div>
                </div>
                {/* Percentage bar */}
                <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(c.Percentage * 2, 100)}%`, backgroundColor: FREQ_COLORS[c.freq] }}
                  />
                </div>
              </div>
            ))}
          </div>

          {!selectedFreq && displayCoalitions.length < categorisedCoalitions.length && (
            <p className="text-center text-xs text-gray-400">
              Viser top {displayCoalitions.length} af {categorisedCoalitions.length}. Vælg en kategori for at se alle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
