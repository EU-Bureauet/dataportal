"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ToggleButton } from "@/components/toggle-button";
import { GroupTooltip } from "@/components/group-tooltip";
import { GROUP_COLORS } from "@/lib/group-colors";

interface GroupWin {
  "Group ID": string;
  "Win Count": number;
  "Win Percentage": number;
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

interface GroupWinsFile {
  [committee: string]: { total_group_wins: GroupWin[]; this_group_wins: GroupWin[] } | GroupWin[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kunne ikke hente ${url} (${response.status})`);
  }
  return response.json();
};

export function WinningCoalitionColumnChart({
  committee,
  themeLabel,
}: Readonly<{ committee?: string; themeLabel?: string }>) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";

  const { data: winsData, error: winsError } = useSWR<GroupWinsFile>(
    `${basePath}/data/All_Group_wins.json`,
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
  const [tooltip, setTooltip] = useState<{ groupId: string; x: number; y: number } | null>(null);

  const loadError = winsError ?? namesError;
  if (loadError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Kunne ikke indlaese data til diagrammet. Tjek at datafilerne ligger under /dataportal/data/.
      </div>
    );
  }

  if (!winsData || !namesData) {
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
  const committeeRaw = committee ? winsData[committee] : null;
  const themeGroups: GroupWin[] = committeeRaw && Array.isArray(committeeRaw)
    ? committeeRaw
    : [];

  // Overall data (shadow) — TOTAL.total_group_wins
  const totalRaw = winsData["TOTAL"];
  const allGroups: GroupWin[] = !Array.isArray(totalRaw) && totalRaw?.total_group_wins
    ? totalRaw.total_group_wins
    : [];

  const hasTheme = !!committee;

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
    <div ref={containerRef} className="relative">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Del af vindende koalition</h3>

      {/* Toggle buttons */}
      {hasTheme && (
        <div className="flex flex-wrap gap-3 mb-8">
          <ToggleButton active={showTheme} onToggle={() => setShowTheme((v) => !v)} label={themeName} activeColor="bg-blue-600" />
          <ToggleButton active={showAll} onToggle={() => setShowAll((v) => !v)} label="Alle afstemninger" activeColor="bg-blue-600/60" />
        </div>
      )}

      {/* Chart area: Y-axis + bars */}
      <div className="flex" style={{ height: "13rem" }}>
        {/* Y-axis with tick marks */}
        <div className="relative flex-shrink-0" style={{ width: "1.6rem" }}>
          <span className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-gray-400 font-medium whitespace-nowrap origin-center">Andel vindende (%)</span>
        </div>
        <div className="relative flex-shrink-0" style={{ width: "2.2rem" }}>
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
        <div className="flex items-end gap-4 flex-1 relative px-2">
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
            const color = GROUP_COLORS[groupId] ?? "#888";

            const allPct = allEntry?.["Win Percentage"] ?? 0;
            const themePct = themeEntry?.["Win Percentage"] ?? 0;
            const allHeight = showAll ? (allPct / axisMax) * 100 : 0;
            const themeHeight = hasTheme && showTheme && themeEntry ? (themePct / axisMax) * 100 : 0;

            const containerHeight = Math.max(allHeight, themeHeight, 1);

            return (
              <div
                key={groupId}
                className="flex-1 h-full flex items-end justify-center cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const el = e.currentTarget.getBoundingClientRect();
                  setTooltip({ groupId, x: el.left + el.width / 2 - rect.left, y: el.top - rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className="w-3/4 relative" style={{ height: `${containerHeight}%` }}>
                  {/* Shadow bar — alle temaer */}
                  {showAll && (
                    <div
                      className={`absolute bottom-0 rounded-t-md transition-all duration-700 ease-in-out ${hasTheme ? "w-[70%] right-0 sm:w-[80%] sm:left-[20%] sm:right-auto" : "left-[10%] right-[10%]"}`}
                      style={{
                        height: `${allHeight > 0 ? (allHeight / containerHeight) * 100 : 0}%`,
                        backgroundColor: color,
                        opacity: hasTheme ? 0.25 : 0.85,
                      }}
                      title={`${groupId} alle afstemninger: ${allPct.toFixed(1)}% (${allEntry?.["Win Count"] ?? 0})`}
                    />
                  )}
                  {/* Foreground bar — theme-specific */}
                  {hasTheme && showTheme && themeEntry && (
                    <div
                      className="absolute bottom-0 rounded-t-md transition-all duration-700 ease-in-out w-[70%] left-0 sm:w-[80%] sm:right-[20%] sm:left-auto"
                      style={{
                        height: `${themeHeight > 0 ? (themeHeight / containerHeight) * 100 : 0}%`,
                        backgroundColor: color,
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
      <div className="flex gap-0 sm:gap-4 mt-8 sm:mt-1 px-2 h-14 sm:h-auto overflow-visible pl-[3.3rem] sm:pl-[3.8rem]">
        {sorted.map((groupId) => (
          <span key={groupId} className="flex-1 -mx-1 sm:mx-0 text-[10px] sm:text-xs font-medium text-gray-500 text-center sm:truncate sm:rotate-0 -rotate-90 origin-top whitespace-nowrap leading-none flex items-start justify-center pt-1 sm:pt-0 sm:items-center sm:origin-center">
            {groupId}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1" style={{ paddingLeft: "3.8rem" }}>Politisk gruppe</p>
      <p className="text-xs text-gray-400 mt-3">
        Andel af afstemninger hvor gruppen er del af den vindende side
      </p>
      {tooltip && (() => {
        const name = nameMap[tooltip.groupId] ?? tooltip.groupId;
        const desc = descMap[tooltip.groupId];
        const allEntry = allMap.get(tooltip.groupId);
        const themeEntry = themeMap.get(tooltip.groupId);
        const stats: { label: string; value: string }[] = [];
        if (hasTheme && themeEntry) {
          stats.push({
            label: themeName,
            value: `${themeEntry["Win Percentage"].toFixed(1)}% (${themeEntry["Win Count"]})`,
          });
        }
        if (allEntry) {
          stats.push({
            label: "Alle afstemninger",
            value: `${allEntry["Win Percentage"].toFixed(1)}% (${allEntry["Win Count"]})`,
          });
        }
        return (
          <GroupTooltip
            name={name}
            code={tooltip.groupId}
            color={GROUP_COLORS[tooltip.groupId] ?? "#888"}
            description={desc}
            stats={stats}
            x={tooltip.x}
            y={tooltip.y}
            containerWidth={containerRef.current?.clientWidth ?? 400}
          />
        );
      })()}
    </div>
  );
}
