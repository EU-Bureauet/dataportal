"use client";

import { useState } from "react";
import useSWR from "swr";
import { ToggleButton } from "@/components/toggle-button";

interface GroupWin {
  "Group ID": string;
  "Win Count": number;
  "Win Percentage": number;
}

interface GroupConfig {
  code: string;
  color: string;
}

interface GroupTooltipsFile {
  groups: GroupConfig[];
}

interface GroupWinsFile {
  [committee: string]: { total_group_wins: GroupWin[]; this_group_wins: GroupWin[] } | GroupWin[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function WinningCoalitionColumnChart({
  committee,
  themeLabel,
}: Readonly<{ committee?: string; themeLabel?: string }>) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: winsData } = useSWR<GroupWinsFile>(`${basePath}/data/All_Group_wins.json`, fetcher);
  const { data: tooltipsData } = useSWR<GroupTooltipsFile>(`${basePath}/data/group-tooltips.json`, fetcher);

  const [showTheme, setShowTheme] = useState(true);
  const [showAll, setShowAll] = useState(true);

  if (!winsData || !tooltipsData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const colorMap: Record<string, string> = {};
  for (const g of tooltipsData.groups) colorMap[g.code] = g.color;

  // Theme-specific data (foreground) — committee flat array
  const committeeRaw = committee ? winsData[committee] : null;
  const themeGroups: GroupWin[] = committeeRaw && Array.isArray(committeeRaw)
    ? committeeRaw
    : [];

  // Overall data (shadow) — TOTAL.total_group_wins
  const totalRaw = winsData["TOTAL"];
  const allGroups: GroupWin[] = !Array.isArray(totalRaw) && totalRaw?.total_group_wins
    ? totalRaw.total_group_wins
    : [];

  const hasTheme = committee && themeGroups.length > 0;

  const themeMap = new Map(themeGroups.map((g) => [g["Group ID"], g]));
  const allMap = new Map(allGroups.map((g) => [g["Group ID"], g]));

  // All group IDs from both sets
  const groupIds = [...new Set([...allGroups.map((g) => g["Group ID"]), ...themeGroups.map((g) => g["Group ID"])])];

  // Sort by the most prominent visible bar
  const sorted = [...groupIds].sort((a, b) => {
    const aPct = (hasTheme && showTheme ? themeMap.get(a)?.["Win Percentage"] : 0) || allMap.get(a)?.["Win Percentage"] || 0;
    const bPct = (hasTheme && showTheme ? themeMap.get(b)?.["Win Percentage"] : 0) || allMap.get(b)?.["Win Percentage"] || 0;
    return bPct - aPct;
  });

  const maxPct = Math.max(
    ...allGroups.map((g) => g["Win Percentage"]),
    ...themeGroups.map((g) => g["Win Percentage"]),
    1
  );

  // Round axis max up to next multiple of 10 for clean tick labels
  const axisMax = Math.ceil(maxPct / 10) * 10;
  const yTicks = Array.from({ length: axisMax / 10 + 1 }, (_, i) => i * 10);

  const themeName = themeLabel ?? committee ?? "Tema";

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Del af vindende koalition</h3>

      {/* Toggle buttons */}
      {hasTheme && (
        <div className="flex flex-wrap gap-3 mb-8">
          <ToggleButton active={showTheme} onToggle={() => setShowTheme((v) => !v)} label={themeName} activeColor="bg-blue-600" />
          <ToggleButton active={showAll} onToggle={() => setShowAll((v) => !v)} label="Alle temaer" activeColor="bg-blue-600/60" />
        </div>
      )}

      {/* Chart area: Y-axis + bars */}
      <div className="flex" style={{ height: "13rem" }}>
        {/* Y-axis with tick marks */}
        <div className="relative flex-shrink-0" style={{ width: "3.2rem" }}>
          {yTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            const showLabel = tick % 20 === 0;
            return (
              <div
                key={tick}
                className="absolute right-0 flex items-center"
                style={{ bottom: `${pos}%`, transform: "translateY(50%)" }}
              >
                {showLabel && (
                  <span className="text-[11px] font-medium text-gray-500 tabular-nums mr-1">
                    {tick}%
                  </span>
                )}
                <span className={`block border-t border-gray-400 ${showLabel ? "w-2" : "w-1.5 ml-auto"}`} />
              </div>
            );
          })}
        </div>

        {/* Bars area */}
        <div className="flex items-end gap-2 flex-1 relative">
          {/* Horizontal grid lines at every 10% */}
          {yTicks.map((tick) => {
            const pos = (tick / axisMax) * 100;
            const isMajor = tick % 50 === 0;
            return (
              <div
                key={tick}
                className={`absolute left-0 right-0 border-t ${isMajor ? "border-gray-300" : "border-gray-200"}`}
                style={{ bottom: `${pos}%` }}
              />
            );
          })}

          {sorted.map((groupId) => {
            const allEntry = allMap.get(groupId);
            const themeEntry = themeMap.get(groupId);
            const color = colorMap[groupId] ?? "#888";

            const allPct = allEntry?.["Win Percentage"] ?? 0;
            const themePct = themeEntry?.["Win Percentage"] ?? 0;
            const allHeight = showAll ? (allPct / axisMax) * 100 : 0;
            const themeHeight = hasTheme && showTheme && themeEntry ? (themePct / axisMax) * 100 : 0;

            const containerHeight = Math.max(allHeight, themeHeight, 1);

            return (
              <div key={groupId} className="flex-1 h-full flex items-end">
                <div className="w-full relative" style={{ height: `${containerHeight}%` }}>
                  {/* Shadow bar — alle temaer */}
                  {showAll && (
                    <div
                      className="absolute bottom-0 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${allHeight > 0 ? (allHeight / containerHeight) * 100 : 0}%`,
                        backgroundColor: color,
                        opacity: hasTheme ? 0.25 : 0.85,
                        left: hasTheme ? "20%" : "10%",
                        right: hasTheme ? "0" : "10%",
                      }}
                      title={`${groupId} alle temaer: ${allPct.toFixed(1)}% (${allEntry?.["Win Count"] ?? 0})`}
                    />
                  )}
                  {/* Foreground bar — theme-specific */}
                  {hasTheme && showTheme && themeEntry && (
                    <div
                      className="absolute bottom-0 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${themeHeight > 0 ? (themeHeight / containerHeight) * 100 : 0}%`,
                        backgroundColor: color,
                        left: "0",
                        right: "20%",
                      }}
                      title={`${groupId} ${themeName}: ${themePct.toFixed(1)}% (${themeEntry["Win Count"]})`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 mt-1" style={{ paddingLeft: "3.2rem" }}>
        {sorted.map((groupId) => (
          <span key={groupId} className="flex-1 text-xs font-medium text-gray-500 text-center truncate">
            {groupId}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Andel af afstemninger hvor gruppen er del af den vindende side
      </p>
    </div>
  );
}
