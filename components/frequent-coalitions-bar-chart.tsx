"use client";

import { useState } from "react";
import useSWR from "swr";
import { ToggleButton } from "@/components/toggle-button";

interface WinningCoalition {
  "Winning Coalition": string[];
  Count: number;
  Percentage: number;
}

interface GroupConfig {
  code: string;
  color: string;
}

interface GroupTooltipsFile {
  groups: GroupConfig[];
}

interface WinningCoalitionsFile {
  [committee: string]:
    | { total_coalitions: WinningCoalition[]; this_coalitions?: WinningCoalition[] }
    | WinningCoalition[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MAX_ROWS = 10;

/** Canonical key for a coalition so we can match across perspectives */
function coalitionKey(groups: string[]): string {
  return [...groups].sort().join("|");
}

export function FrequentCoalitionsBarChart({
  committee,
  themeLabel,
}: Readonly<{ committee?: string; themeLabel?: string }>) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: coalData } = useSWR<WinningCoalitionsFile>(
    `${basePath}/data/All_Winning_coalitions.json`,
    fetcher
  );
  const { data: tooltipsData } = useSWR<GroupTooltipsFile>(
    `${basePath}/data/group-tooltips.json`,
    fetcher
  );

  const [showTheme, setShowTheme] = useState(true);
  const [showAll, setShowAll] = useState(true);

  if (!coalData || !tooltipsData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const colorMap: Record<string, string> = {};
  for (const g of tooltipsData.groups) colorMap[g.code] = g.color;

  // Theme-specific data (foreground) — committee flat array
  const committeeRaw = committee ? coalData[committee] : null;
  const themeCoalitions: WinningCoalition[] = committeeRaw && Array.isArray(committeeRaw)
    ? committeeRaw
    : [];

  // Overall data (shadow) — TOTAL.total_coalitions
  const totalRaw = coalData["TOTAL"];
  const allCoalitions: WinningCoalition[] = !Array.isArray(totalRaw) && totalRaw?.total_coalitions
    ? totalRaw.total_coalitions
    : [];

  const hasTheme = committee && themeCoalitions.length > 0;

  // Build lookups
  const themeMap = new Map(themeCoalitions.map((c) => [coalitionKey(c["Winning Coalition"]), c]));
  const allMap = new Map(allCoalitions.map((c) => [coalitionKey(c["Winning Coalition"]), c]));

  // Use the primary visible list to determine top-N and order
  const primaryList = hasTheme && showTheme ? themeCoalitions : allCoalitions;
  const top = [...primaryList].sort((a, b) => b.Count - a.Count).slice(0, MAX_ROWS);

  const maxPct = Math.max(
    ...top.map((c) => allMap.get(coalitionKey(c["Winning Coalition"]))?.Percentage ?? 0),
    ...top.map((c) => themeMap.get(coalitionKey(c["Winning Coalition"]))?.Percentage ?? 0),
    1
  );

  // Round axis max up to next multiple of 10 for clean ticks
  const axisMax = Math.ceil(maxPct / 10) * 10;
  const xTicks = Array.from({ length: axisMax / 10 + 1 }, (_, i) => i * 10);

  const themeName = themeLabel ?? committee ?? "Tema";

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Hyppigste koalitioner</h3>

      {/* Toggle buttons */}
      {hasTheme && (
        <div className="flex flex-wrap gap-3 mb-8">
          <ToggleButton active={showTheme} onToggle={() => setShowTheme((v) => !v)} label={themeName} activeColor="bg-blue-600" />
          <ToggleButton active={showAll} onToggle={() => setShowAll((v) => !v)} label="Alle temaer" activeColor="bg-blue-600/60" />
        </div>
      )}

      {/* Chart with vertical grid */}
      <div className="relative">
        {/* Vertical grid lines spanning the full bar area */}
        <div className="absolute inset-0 pointer-events-none" style={{ right: "4.5rem" }}>
          {xTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            const isMajor = tick % 20 === 0;
            return (
              <div
                key={tick}
                className={`absolute top-0 bottom-0 border-l ${isMajor ? "border-gray-300" : "border-gray-200"}`}
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>

        <div className="space-y-3 relative">
          {top.map((c, i) => {
            const cKey = coalitionKey(c["Winning Coalition"]);
            const allEntry = allMap.get(cKey);
            const themeEntry = themeMap.get(cKey);

            const allPct = allEntry?.Percentage ?? 0;
            const themePct = themeEntry?.Percentage ?? 0;
            const allWidth = showAll ? (allPct / axisMax) * 100 : 0;
            const themeWidth = hasTheme && showTheme && themeEntry ? (themePct / axisMax) * 100 : 0;

            const labelPct = hasTheme && showTheme && themeEntry ? themePct : allPct;

            return (
              <div key={i}>
                {/* Group pills */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {c["Winning Coalition"].map((code) => (
                    <span
                      key={code}
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white"
                      style={{ backgroundColor: colorMap[code] ?? "#888" }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
                {/* Dual bars */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative h-7">
                    {/* Shadow bar — alle temaer */}
                    {showAll && (
                      <div
                        className="absolute rounded-full bg-blue-400 transition-all duration-500"
                        style={{
                          width: `${allWidth}%`,
                          top: hasTheme ? "4px" : "0",
                          bottom: "0",
                          left: hasTheme ? "3px" : "0",
                          height: hasTheme ? undefined : "20px",
                          opacity: hasTheme ? 0.3 : 0.7,
                        }}
                        title={`Alle temaer: ${allPct.toFixed(1)}%`}
                      />
                    )}
                    {/* Foreground bar — theme-specific */}
                    {hasTheme && showTheme && themeEntry && (
                      <div
                        className="absolute rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${themeWidth}%`, top: "0", height: "20px" }}
                        title={`${themeName}: ${themePct.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-14 text-right flex-shrink-0">
                    {labelPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis tick labels */}
        <div className="relative mt-2" style={{ marginRight: "4.5rem" }}>
          {xTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            const showLabel = tick % 20 === 0;
            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center"
                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
              >
                <span className={`block border-l border-gray-400 ${showLabel ? "h-2" : "h-1.5"}`} />
                {showLabel && (
                  <span className="text-[11px] font-medium text-gray-500 tabular-nums mt-0.5">
                    {tick}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        De mest hyppige gruppekombinationer på den vindende side
      </p>
    </div>
  );
}
