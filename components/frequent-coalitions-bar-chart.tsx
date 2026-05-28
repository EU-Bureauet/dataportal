"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ToggleButton } from "@/components/toggle-button";
import { GroupTooltip } from "@/components/group-tooltip";
import { GROUP_COLORS } from "@/lib/group-colors";
import { coalitionKey } from "@/lib/data-transforms";

interface WinningCoalition {
  "Winning Coalition": string[];
  Count: number;
  Percentage: number;
}

interface GroupConfig {
  code: string;
  color: string;
  description?: string;
}

interface GroupTooltipsFile {
  groups: GroupConfig[];
}

interface GroupNamesFile {
  political_group_names: Record<string, string>;
}

interface WinningCoalitionsFile {
  [committee: string]:
    | { total_coalitions: WinningCoalition[]; this_coalitions?: WinningCoalition[] }
    | WinningCoalition[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kunne ikke hente ${url} (${response.status})`);
  }
  return response.json();
};

const MAX_ROWS = 10;

// eslint-disable-next-line complexity -- component combines multiple data/loading/toggle states in one chart renderer
export function FrequentCoalitionsBarChart({
  committee,
  themeLabel,
}: Readonly<{ committee?: string; themeLabel?: string }>) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: coalData, error: coalError } = useSWR<WinningCoalitionsFile>(
    `${basePath}/data/All_Winning_coalitions.json`,
    fetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false }
  );
  const { data: tooltipsData } = useSWR<GroupTooltipsFile>(
    `${basePath}/data/group-tooltips.json`,
    fetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false }
  );
  const { data: namesData, error: namesError } = useSWR<GroupNamesFile>(
    `${basePath}/data/committee_and_group_names.json`,
    fetcher,
    { shouldRetryOnError: false, revalidateOnFocus: false }
  );

  const [showTheme, setShowTheme] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [groupTooltip, setGroupTooltip] = useState<{ groupCode: string; x: number; y: number } | null>(null);
  const [coalitionTooltip, setCoalitionTooltip] = useState<{
    coalitionCode: string;
    coalitionName: string;
    stats: { label: string; value: string }[];
    x: number;
    y: number;
  } | null>(null);

  const loadError = coalError ?? namesError;
  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Kunne ikke indlaese data til diagrammet. Tjek at datafilerne ligger under /dataportal/data/.
      </div>
    );
  }

  if (!coalData || !namesData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const descMap: Record<string, string> = {};
  for (const g of tooltipsData?.groups ?? []) if (g.description) descMap[g.code] = g.description;
  const nameMap = namesData.political_group_names;

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

  const hasTheme = !!committee;

  // Build lookups
  const themeMap = new Map(themeCoalitions.map((c) => [coalitionKey(c["Winning Coalition"]), c]));
  const allMap = new Map(allCoalitions.map((c) => [coalitionKey(c["Winning Coalition"]), c]));

  // Use the primary visible list to determine top-N and order
  // Re-sort dynamically based on which toggle is active
  const primaryList = hasTheme ? themeCoalitions : allCoalitions;
  const top = [...primaryList].sort((a, b) => {
    const aKey = coalitionKey(a["Winning Coalition"]);
    const bKey = coalitionKey(b["Winning Coalition"]);
    const aPct = (hasTheme && showTheme ? themeMap.get(aKey)?.Percentage : 0) || (showAll ? allMap.get(aKey)?.Percentage ?? 0 : 0);
    const bPct = (hasTheme && showTheme ? themeMap.get(bKey)?.Percentage : 0) || (showAll ? allMap.get(bKey)?.Percentage ?? 0 : 0);
    return bPct - aPct;
  }).slice(0, MAX_ROWS);

  // Compute maxPct from all data so the scale never changes on toggle
  const allPctValues = [
    ...allCoalitions.map((c) => c.Percentage),
    ...themeCoalitions.map((c) => c.Percentage),
  ];
  const maxPct = Math.max(...allPctValues, 1);

  // Round axis max up to next multiple of 10 for clean ticks
  const axisMax = Math.ceil(maxPct / 10) * 10;
  const gridTicks = Array.from({ length: axisMax / 2 + 1 }, (_, i) => i * 2);
  const labelTicks = Array.from({ length: axisMax / 10 + 1 }, (_, i) => i * 10);

  const themeName = themeLabel ?? committee ?? "Tema";

  return (
    <div ref={containerRef} className="relative">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Hyppigste koalitioner</h3>
      <p className="text-xs text-gray-500 mb-4 -mt-2">Top {MAX_ROWS} mest hyppige gruppekombinationer på den vindende side</p>

      {/* Toggle buttons */}
      {hasTheme && (
        <div className="flex flex-wrap gap-3 mb-8">
          <ToggleButton active={showTheme} onToggle={() => setShowTheme((v) => !v)} label={themeName} activeColor="bg-blue-600" />
          <ToggleButton active={showAll} onToggle={() => setShowAll((v) => !v)} label="Alle afstemninger" activeColor="bg-blue-600/60" />
        </div>
      )}

      {/* Chart with vertical grid */}
      <div className="relative flex">
        {/* Y-axis label */}
        <div className="relative flex-shrink-0 hidden sm:block" style={{ width: "1.4rem" }}>
          <span className="absolute -left-11 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-gray-400 font-medium whitespace-nowrap origin-center">Gruppekombination</span>
        </div>
        <div className="relative flex-1 min-h-[12rem]">
        {/* Vertical grid lines spanning the full bar area */}
        <div className="absolute inset-0 pointer-events-none hidden sm:block" style={{ left: "10.75rem", right: "4.5rem", bottom: "2.5rem" }}>
          {gridTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            const isMajor = tick % 10 === 0;
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
              <div key={i} className="flex items-center gap-3">
                {/* Group labels — left of bar */}
                <div className="flex flex-wrap gap-1 w-16 sm:w-40 flex-shrink-0 justify-end">
                  {c["Winning Coalition"].map((code) => (
                    <span
                      key={code}
                      className="text-[10px] font-medium text-gray-500 cursor-pointer hover:text-gray-900"
                      onMouseEnter={(e) => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const el = e.currentTarget.getBoundingClientRect();
                        setCoalitionTooltip(null);
                        setGroupTooltip({ groupCode: code, x: el.left + el.width / 2 - rect.left, y: el.top - rect.top });
                      }}
                      onMouseLeave={() => setGroupTooltip(null)}
                    >
                      {code}
                    </span>
                  ))}
                </div>
                {/* Bar */}
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="flex-1 relative h-7"
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const el = e.currentTarget.getBoundingClientRect();
                      const coalitionCode = c["Winning Coalition"].join(" + ");
                      const coalitionName = c["Winning Coalition"].map((code) => nameMap[code] ?? code).join(" + ");
                      const stats: { label: string; value: string }[] = [];
                      if (hasTheme && themeEntry) {
                        stats.push({
                          label: themeName,
                          value: `${themePct.toFixed(1)}% (${themeEntry.Count})`,
                        });
                      }
                      if (allEntry) {
                        stats.push({
                          label: "Alle afstemninger",
                          value: `${allPct.toFixed(1)}% (${allEntry.Count})`,
                        });
                      }
                      setGroupTooltip(null);
                      setCoalitionTooltip({
                        coalitionCode,
                        coalitionName,
                        stats,
                        x: el.left + el.width / 2 - rect.left,
                        y: el.top - rect.top,
                      });
                    }}
                    onMouseLeave={() => setCoalitionTooltip(null)}
                  >
                    {/* Shadow bar — alle temaer */}
                    {showAll && (
                      <div
                        className="absolute rounded-r-sm bg-blue-400 transition-all duration-700 ease-in-out"
                        style={{
                          width: `${allWidth}%`,
                          top: hasTheme ? "10px" : "0",
                          left: "0",
                          height: hasTheme ? "20px" : "22px",
                          opacity: hasTheme ? 0.3 : 0.7,
                        }}
                      />
                    )}
                    {/* Foreground bar — theme-specific */}
                    {hasTheme && showTheme && themeEntry && (
                      <div
                        className="absolute rounded-r-sm bg-blue-600 transition-all duration-700 ease-in-out"
                        style={{ width: `${themeWidth}%`, top: "0", height: "20px" }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-10 sm:w-14 text-right flex-shrink-0">
                    {labelPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis tick labels */}
        <div className="relative mt-2 hidden sm:block" style={{ marginRight: "4.5rem", marginLeft: "10.75rem" }}>
          {labelTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center"
                style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
              >
                <span className="block border-l border-gray-400 h-2" />
                <span className="text-[11px] font-medium text-gray-500 tabular-nums mt-0.5">
                  {tick}%
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-10 relative z-10 hidden sm:block" style={{ marginRight: "4.5rem", marginLeft: "10.75rem" }}><span className="bg-white px-2">Andel af afstemninger (%)</span></p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-6">
        Koalitionskombinationer sorteret efter hyppighed
      </p>
      {groupTooltip && (() => {
        const code = groupTooltip.groupCode;
        const name = nameMap[code] ?? code;
        const desc = descMap[code];
        return (
          <GroupTooltip
            name={name}
            code={code}
            color={GROUP_COLORS[code] ?? "#888"}
            description={desc}
            x={groupTooltip.x}
            y={groupTooltip.y}
            containerWidth={containerRef.current?.clientWidth ?? 400}
          />
        );
      })()}
      {coalitionTooltip && (
        <GroupTooltip
          name={coalitionTooltip.coalitionName}
          code={coalitionTooltip.coalitionCode}
          color="#2563eb"
          stats={coalitionTooltip.stats}
          x={coalitionTooltip.x}
          y={coalitionTooltip.y}
            containerWidth={containerRef.current?.clientWidth ?? 400}
          />
      )}
    </div>
  );
}
