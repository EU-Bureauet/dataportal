"use client"

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import useSWR from "swr";

interface GroupInfo {
  code: string;
  name: string;
  description: string;
  seats: number;
  color: string;
}

// Static config is loaded from data/group-tooltips.json at runtime.
// Seats and official names are derived from meps_clean.json.

interface GroupConfig {
  code: string;
  color: string;
  seatingOrder: number;
  description: string;
}

interface GroupTooltipsFile {
  groups: GroupConfig[];
}

interface MEPData {
  current_group_id?: {
    name?: string;
    code?: string;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildGroups(meps: MEPData[], config: GroupConfig[]): GroupInfo[] {
  // Count seats and collect official names from data
  const seatCounts: Record<string, number> = {};
  const officialNames: Record<string, string> = {};
  for (const mep of meps) {
    const code = mep.current_group_id?.code;
    const name = mep.current_group_id?.name;
    if (!code) continue;
    seatCounts[code] = (seatCounts[code] || 0) + 1;
    if (name) officialNames[code] = name;
  }

  // Sort by seatingOrder (left → right) and merge with data-driven values
  return [...config]
    .sort((a, b) => a.seatingOrder - b.seatingOrder)
    .filter((cfg) => seatCounts[cfg.code] > 0)
    .map((cfg) => ({
      code: cfg.code,
      name: officialNames[cfg.code] || cfg.code,
      description: cfg.description,
      seats: seatCounts[cfg.code],
      color: cfg.color,
    }));
}

interface SeatPosition {
  x: number;
  y: number;
  group: GroupInfo;
}

function computeSeatsProportional(
  width: number,
  height: number,
  groups: GroupInfo[],
  totalSeats: number
): SeatPosition[] {
  const cx = width / 2;
  const cy = height * 0.92;
  const maxRadius = Math.min(width / 2, height) * 0.88;
  const minRadius = maxRadius * 0.35;

  const seatRadius = Math.max(3, Math.min(5.5, width / 160));
  const gap = seatRadius * 0.6;
  const rowSpacing = seatRadius * 2 + gap;
  const numRows = Math.max(5, Math.floor((maxRadius - minRadius) / rowSpacing));

  // Build rows with seat counts
  const rows: { radius: number; seatCount: number }[] = [];
  let totalCapacity = 0;
  for (let i = 0; i < numRows; i++) {
    const radius = minRadius + (i / (numRows - 1)) * (maxRadius - minRadius);
    const arcLength = Math.PI * radius;
    const capacity = Math.floor(arcLength / (seatRadius * 2 + gap));
    rows.push({ radius, seatCount: capacity });
    totalCapacity += capacity;
  }

  // Scale to match totalSeats
  const scale = totalSeats / totalCapacity;
  rows.forEach((r) => (r.seatCount = Math.round(r.seatCount * scale)));
  let diff = totalSeats - rows.reduce((s, r) => s + r.seatCount, 0);
  for (let i = rows.length - 1; diff !== 0 && i >= 0; i--) {
    const adj = diff > 0 ? 1 : -1;
    rows[i].seatCount += adj;
    diff -= adj;
  }

  // Each group gets a proportional angular wedge of the semicircle (π radians).
  const groupAngles: { group: GroupInfo; startAngle: number; endAngle: number }[] = [];
  let angleCursor = Math.PI; // start at left side (π = left, 0 = right)
  for (const group of groups) {
    const span = (group.seats / totalSeats) * Math.PI;
    groupAngles.push({ group, startAngle: angleCursor, endAngle: angleCursor - span });
    angleCursor -= span;
  }

  const positions: SeatPosition[] = [];

  for (const row of rows) {
    const seatsPerGroup: { group: GroupInfo; count: number; startAngle: number; endAngle: number }[] = [];
    let assigned = 0;
    for (let gi = 0; gi < groupAngles.length; gi++) {
      const ga = groupAngles[gi];
      const raw = (ga.group.seats / totalSeats) * row.seatCount;
      const count = gi === groupAngles.length - 1
        ? row.seatCount - assigned
        : Math.round(raw);
      seatsPerGroup.push({ group: ga.group, count, startAngle: ga.startAngle, endAngle: ga.endAngle });
      assigned += count;
    }

    let seatIdx = 0;
    const totalSeatsInRow = seatsPerGroup.reduce((s, g) => s + g.count, 0);
    for (const sg of seatsPerGroup) {
      for (let s = 0; s < sg.count; s++) {
        const angle = Math.PI - (seatIdx / (totalSeatsInRow - 1 || 1)) * Math.PI;
        const x = cx + row.radius * Math.cos(angle);
        const y = cy - row.radius * Math.sin(angle);
        positions.push({ x, y, group: sg.group });
        seatIdx++;
      }
    }
  }

  return positions;
}

interface TooltipState {
  x: number;
  y: number;
  group: GroupInfo;
}

export function ParliamentHemicycle() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  const basePath = process.env.NEXT_PUBLIC_BASEPATH
    ? `/${process.env.NEXT_PUBLIC_BASEPATH}`
    : "";
  const { data: mepsRaw } = useSWR<{ meps: MEPData[] }>(`${basePath}/data/meps_clean.json`, fetcher);
  const { data: tooltipsData } = useSWR<GroupTooltipsFile>(`${basePath}/data/group-tooltips.json`, fetcher);

  const meps = mepsRaw?.meps;
  const groups = useMemo(
    () => (meps && tooltipsData ? buildGroups(meps, tooltipsData.groups) : []),
    [meps, tooltipsData]
  );
  const totalSeats = useMemo(() => groups.reduce((s, g) => s + g.seats, 0), [groups]);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const h = Math.max(280, Math.min(420, width * 0.5));
      setDimensions({ width, height: h });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || groups.length === 0) return;
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

      const seats = computeSeatsProportional(dimensions.width, dimensions.height, groups, totalSeats);
      const seatRadius = Math.max(3, Math.min(5.5, dimensions.width / 160));

      // Find closest seat within threshold
      let closest: SeatPosition | null = null;
      let closestDist = seatRadius * 3;
      for (const seat of seats) {
        const dx = seat.x - svgP.x;
        const dy = seat.y - svgP.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = seat;
        }
      }

      if (closest) {
        const rect = svg.getBoundingClientRect();
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          group: closest.group,
        });
        setActiveGroup(closest.group.code);
      } else {
        setTooltip(null);
        setActiveGroup(null);
      }
    },
    [dimensions, groups, totalSeats]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setActiveGroup(null);
  }, []);

  // Render D3 seats
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (groups.length === 0) return;

    const { width, height } = dimensions;
    const seats = computeSeatsProportional(width, height, groups, totalSeats);
    const seatRadius = Math.max(3, Math.min(5.5, width / 160));

    svg
      .selectAll("circle")
      .data(seats)
      .join("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", seatRadius)
      .attr("fill", (d) => d.group.color)
      .attr("opacity", 0.85)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5);
  }, [dimensions, groups, totalSeats]);

  // Highlight active group
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg
      .selectAll<SVGCircleElement, SeatPosition>("circle")
      .attr("opacity", (d) =>
        activeGroup === null
          ? 0.85
          : d.group.code === activeGroup
            ? 1
            : 0.2
      )
      .attr("r", (d) => {
        const base = Math.max(3, Math.min(5.5, dimensions.width / 160));
        return d.group.code === activeGroup ? base * 1.25 : base;
      });
  }, [activeGroup, dimensions]);

  const [legendTooltip, setLegendTooltip] = useState<{ group: GroupInfo; x: number; y: number } | null>(null);

  return (
    <div ref={containerRef} className="w-full">
      <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">
        Europa-Parlamentet – politiske grupper
      </h3>
      <p className="text-sm text-gray-500 mb-4 text-center">
        {totalSeats} medlemmer fordelt på {groups.length} grupper · Hold musen over en gruppe for mere information
      </p>

      <div className="relative">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip (from hovering seats or legend) */}
        {(tooltip || legendTooltip) && (
          <div
            className="absolute pointer-events-none z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs"
            style={tooltip ? {
              left: Math.min(tooltip.x + 12, dimensions.width - 260),
              top: tooltip.y - 10,
              transform: "translateY(-100%)",
            } : {
              left: Math.min(legendTooltip!.x, dimensions.width - 260),
              bottom: 40,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: (tooltip?.group || legendTooltip!.group).color }}
              />
              <span className="font-semibold text-sm text-gray-900">
                {(tooltip?.group || legendTooltip!.group).name}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-1">{(tooltip?.group || legendTooltip!.group).description}</p>
            <p className="text-xs font-medium text-gray-800">
              {(tooltip?.group || legendTooltip!.group).seats} pladser
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        {groups.map((g) => (
          <button
            key={g.code}
            className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 transition-colors cursor-default"
            onMouseEnter={(e) => {
              setActiveGroup(g.code);
              const rect = containerRef.current?.getBoundingClientRect();
              const btnRect = e.currentTarget.getBoundingClientRect();
              if (rect) {
                setLegendTooltip({
                  group: g,
                  x: btnRect.left - rect.left + btnRect.width / 2 - 130,
                  y: btnRect.top - rect.top,
                });
              }
            }}
            onMouseLeave={() => {
              setActiveGroup(null);
              setLegendTooltip(null);
            }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: g.color }}
            />
            <span>{g.code}</span>
            <span className="text-gray-400">({g.seats})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
