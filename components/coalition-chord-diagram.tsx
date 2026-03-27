"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Shield, Globe, Leaf, Zap, TrainFront, Wheat, BarChart3 } from "lucide-react";

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

interface CommitteeNames {
  committee_names: Record<string, string>;
  political_group_names: Record<string, string>;
}

interface GroupTooltip {
  code: string;
  color: string;
  seatingOrder: number;
  description: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  "The Left": "#8B0000",
  "Verts/ALE": "#009A44",
  "S&D": "#E30613",
  Renew: "#FFD700",
  PPE: "#003399",
  ECR: "#0E4DA4",
  PfE: "#143862",
  ESN: "#1B263B",
  NI: "#808080",
};

const GROUP_ORDER = [
  "The Left",
  "Verts/ALE",
  "S&D",
  "Renew",
  "PPE",
  "ECR",
  "PfE",
  "ESN",
  "NI",
];

// Theme config: related committees per theme with citizen-facing descriptions
const THEME_COMMITTEES: Record<
  string,
  { label: string; committees: { code: string; label: string; description: string; icon: React.ReactNode }[] }
> = {
  forsvar: {
    label: "Sikkerhed og forsvar",
    committees: [
      {
        code: "SEDE",
        label: "Sikkerhed og forsvar",
        description:
          "Afstemninger om EU's forsvarssamarbejde, militære missioner og forsvarspakken — det påvirker hvordan Europa beskytter sig.",
        icon: <Shield className="w-4 h-4 text-gray-400" />,
      },
      {
        code: "AFET",
        label: "Udenrigspolitik",
        description:
          "Udenrigs- og sikkerhedspolitik, relationer til NATO, sanktioner mod Rusland og støtte til Ukraine.",
        icon: <Globe className="w-4 h-4 text-gray-400" />,
      },
    ],
  },
  klima: {
    label: "Klima og grøn omstilling",
    committees: [
      {
        code: "ENVI",
        label: "Miljø og klima",
        description:
          "Klimaregulering, CO₂-krav, pesticider og fødevaresikkerhed — det påvirker dit vand, din luft og din mad.",
        icon: <Leaf className="w-4 h-4 text-gray-400" />,
      },
      {
        code: "ITRE",
        label: "Industri og energi",
        description:
          "Energipriser, vedvarende energi, chips og teknologiinvesteringer — det bestemmer din elregning og fremtidens job.",
        icon: <Zap className="w-4 h-4 text-gray-400" />,
      },
      {
        code: "TRAN",
        label: "Transport og turisme",
        description:
          "Regler for biler, fly og jernbane — det påvirker din daglige transport og rejser.",
        icon: <TrainFront className="w-4 h-4 text-gray-400" />,
      },
      {
        code: "AGRI",
        label: "Landbrug",
        description:
          "Landbrugsstøtte, pesticidregler og dyrevelfærd — det påvirker priserne i supermarkedet.",
        icon: <Wheat className="w-4 h-4 text-gray-400" />,
      },
    ],
  },
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Main component ──────────────────────────────────────────────────────────

export function CoalitionChordDiagram() {
  const searchParams = useSearchParams();
  const committee = searchParams.get("committee") ?? "TOTAL";
  const themeName = searchParams.get("theme") ?? "";

  const basePath = process.env.NEXT_PUBLIC_BASEPATH
    ? `/${process.env.NEXT_PUBLIC_BASEPATH}`
    : "";

  const { data: pairwiseData } = useSWR<Record<string, PairwiseEntry[]>>(
    `${basePath}/data/All_Pairwise_coalitions.json`,
    fetcher,
  );
  const { data: winningData } = useSWR<
    Record<string, Record<string, unknown>>
  >(`${basePath}/data/All_Winning_coalitions.json`, fetcher);
  const { data: namesData } = useSWR<CommitteeNames>(
    `${basePath}/data/committee_and_group_names.json`,
    fetcher,
  );
  const { data: tooltipsData } = useSWR<{ groups: GroupTooltip[] }>(
    `${basePath}/data/group-tooltips.json`,
    fetcher,
  );

  // Map group code → description from group-tooltips.json
  const groupDescriptions = useMemo(() => {
    const m = new Map<string, string>();
    if (tooltipsData?.groups) {
      for (const g of tooltipsData.groups) {
        m.set(g.code, g.description);
      }
    }
    return m;
  }, [tooltipsData]);

  const themeConfig = THEME_COMMITTEES[themeName];
  const availableCommittees = themeConfig?.committees ?? [
    { code: committee, label: committee, description: "", icon: <BarChart3 className="w-4 h-4 text-gray-400" /> },
  ];

  const [selectedCommittee, setSelectedCommittee] = useState(committee);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [selectedCoalition, setSelectedCoalition] = useState<number>(0);
  const [tooltipCommittee, setTooltipCommittee] = useState<string | null>(null);

  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Active groups for this committee
  const activeGroups = useMemo(() => {
    if (!pairwiseData) return [];
    const entries = pairwiseData[selectedCommittee] ?? pairwiseData["TOTAL"] ?? [];
    const gs = new Set<string>();
    for (const e of entries) {
      gs.add(e["Group Pair"][0]);
      gs.add(e["Group Pair"][1]);
    }
    return GROUP_ORDER.filter((g) => gs.has(g));
  }, [pairwiseData, selectedCommittee]);

  // Build matrix for chord layout
  const { matrix, pairMap } = useMemo(() => {
    const n = activeGroups.length;
    const m = Array.from({ length: n }, () => new Array(n).fill(0));
    const pm = new Map<string, PairwiseEntry>();
    if (!pairwiseData) return { matrix: m, pairMap: pm };
    const entries = pairwiseData[selectedCommittee] ?? pairwiseData["TOTAL"] ?? [];
    for (const e of entries) {
      const i = activeGroups.indexOf(e["Group Pair"][0]);
      const j = activeGroups.indexOf(e["Group Pair"][1]);
      if (i >= 0 && j >= 0) {
        m[i][j] = e.Percentage;
        m[j][i] = e.Percentage;
        pm.set(`${i}-${j}`, e);
        pm.set(`${j}-${i}`, e);
      }
    }
    return { matrix: m, pairMap: pm };
  }, [pairwiseData, selectedCommittee, activeGroups]);

  // Helper: extract coalitions array from either format
  // TOTAL uses { total_coalitions: [...] }, committees use { "0": {...}, "1": {...}, ... }
  const getCoalitionsArray = useCallback(
    (committee: string): WinningCoalition[] => {
      if (!winningData) return [];
      const cat = winningData[committee] ?? winningData["TOTAL"];
      if (!cat) return [];
      if (Array.isArray(cat.total_coalitions)) return cat.total_coalitions as WinningCoalition[];
      return (Object.values(cat) as WinningCoalition[]).filter(
        (v) => v && typeof v === "object" && "Winning Coalition" in v,
      );
    },
    [winningData],
  );

  // Winning coalitions
  const coalitions = useMemo(() => {
    return getCoalitionsArray(selectedCommittee).slice(0, 6);
  }, [getCoalitionsArray, selectedCommittee]);


  const activeCoalition = coalitions[selectedCoalition] ?? coalitions[0];

  // Preview top-3 coalitions for any committee (used in tooltips)
  const getTopCoalitions = useCallback(
    (code: string) => {
      return getCoalitionsArray(code).slice(0, 3);
    },
    [getCoalitionsArray],
  );

  // ─── D3 chord diagram ─────────────────────────────────────────────────────

  const drawChord = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (activeGroups.length === 0) return;

    const container = svgRef.current?.parentElement;
    const width = container?.clientWidth || 600;
    const size = Math.min(width, 600);
    const outerRadius = size / 2 - 50;
    const innerRadius = outerRadius - 20;

    svg.attr("viewBox", `0 0 ${size} ${size}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${size / 2}, ${size / 2})`);

    const chord = d3.chord().padAngle(0.06).sortSubgroups(d3.descending)(matrix);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const groupArcs = g.append("g").attr("class", "groups").selectAll("g").data(chord.groups).join("g");

    groupArcs
      .append("path")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr("d", arc as any)
      .attr("fill", (d) => GROUP_COLORS[activeGroups[d.index]] ?? "#888")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("transition", "opacity 0.3s")
      .on("mouseenter", (_, d) => setHoveredGroup(activeGroups[d.index]))
      .on("mouseleave", () => setHoveredGroup(null));

    groupArcs
      .append("text")
      .each((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (d as any).angle = (d.startAngle + d.endAngle) / 2;
      })
      .attr("dy", ".35em")
      .attr(
        "transform",
        (d) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          `rotate(${((d as any).angle * 180) / Math.PI - 90}) translate(${outerRadius + 12}) ${(d as any).angle > Math.PI ? "rotate(180)" : ""}`,
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr("text-anchor", (d) => ((d as any).angle > Math.PI ? "end" : "start"))
      .text((d) => activeGroups[d.index])
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", (d) => GROUP_COLORS[activeGroups[d.index]] ?? "#888")
      .style("cursor", "pointer")
      .on("mouseenter", (_, d) => setHoveredGroup(activeGroups[d.index]))
      .on("mouseleave", () => setHoveredGroup(null));

    const ribbon = d3.ribbon().radius(innerRadius);
    g.append("g")
      .attr("class", "ribbons")
      .attr("fill-opacity", 0.55)
      .selectAll("path")
      .data(chord)
      .join("path")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr("d", ribbon as any)
      .attr("fill", (d) => {
        const srcColor = GROUP_COLORS[activeGroups[d.source.index]] ?? "#888";
        const tgtColor = GROUP_COLORS[activeGroups[d.target.index]] ?? "#888";
        return d.source.value >= d.target.value ? srcColor : tgtColor;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .append("title")
      .text((d) => {
        const a = activeGroups[d.source.index];
        const b = activeGroups[d.target.index];
        const entry = pairMap.get(`${d.source.index}-${d.target.index}`);
        return `${a} ↔ ${b}: ${entry?.Percentage.toFixed(1) ?? "?"}% enighed`;
      });
  }, [matrix, activeGroups, pairMap]);

  // Redraw chord when data changes or when the SVG first mounts
  // (winningData is needed so the effect re-fires after the spinner is replaced by the actual SVG)
  useEffect(() => {
    drawChord();
  }, [drawChord, winningData]);

  // Hover highlighting — from group hover
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (hoveredGroup) {
      const idx = activeGroups.indexOf(hoveredGroup);
      svg.selectAll(".groups g").style("opacity", (_, i) => (i === idx ? 1 : 0.25));
      svg.selectAll(".ribbons path").style("opacity", (d) => {
        const cd = d as d3.Chord;
        return cd.source.index === idx || cd.target.index === idx ? 0.85 : 0.06;
      });
      return;
    }
    // Default: highlight selected coalition
    if (activeCoalition) {
      const coalIndices = new Set(
        activeCoalition["Winning Coalition"].map((g) => activeGroups.indexOf(g)).filter((i) => i >= 0),
      );
      svg.selectAll(".groups g").style("opacity", (_, i) => (coalIndices.has(i) ? 1 : 0.3));
      svg.selectAll(".ribbons path").style("opacity", (d) => {
        const cd = d as d3.Chord;
        return coalIndices.has(cd.source.index) && coalIndices.has(cd.target.index) ? 0.75 : 0.06;
      });
    } else {
      svg.selectAll(".groups g").style("opacity", 1);
      svg.selectAll(".ribbons path").style("opacity", 0.55);
    }
  }, [hoveredGroup, activeGroups, activeCoalition]);

  const committeeName = useMemo(() => {
    if (selectedCommittee === "TOTAL") return "Alle udvalg";
    return namesData?.committee_names?.[selectedCommittee] ?? selectedCommittee;
  }, [selectedCommittee, namesData]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (!pairwiseData || !winningData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Row 1: Full-width policy area selector ───────────────────── */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1.5 h-6 rounded-full bg-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Politikområde</h3>
            <p className="text-[11px] text-gray-500">Skift mellem områder for at se hvordan koalitionerne ændrer sig.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableCommittees.map((c) => {
            const isActive = selectedCommittee === c.code;
            const isTooltipOpen = tooltipCommittee === c.code && !isActive;
            const preview = isTooltipOpen ? getTopCoalitions(c.code) : [];
            return (
              <div key={c.code} className="relative group/topic">
                <button
                  onClick={() => { setSelectedCommittee(c.code); setSelectedCoalition(0); setTooltipCommittee(null); }}
                  onMouseEnter={() => {
                    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                    tooltipTimeout.current = setTimeout(() => setTooltipCommittee(c.code), 300);
                  }}
                  onMouseLeave={() => {
                    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                    tooltipTimeout.current = setTimeout(() => setTooltipCommittee(null), 200);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "bg-blue-50 text-gray-900 border border-blue-300 shadow-sm"
                      : "bg-gray-50 text-gray-700 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200"
                  }`}
                >
                  <span className="flex-shrink-0">{c.icon}</span>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block leading-tight">{c.label}</span>
                    <span className={`text-[10px] ${isActive ? "text-blue-500" : "text-gray-400"}`}>{c.code}</span>
                  </div>
                </button>

                {/* Tooltip: coalition preview on hover */}
                {isTooltipOpen && preview.length > 0 && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 bg-white rounded-xl border border-gray-100 shadow-2xl p-4 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200"
                    role="tooltip"
                  >
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                      Top koalitioner — {c.label}
                    </div>
                    <div className="space-y-2.5">
                      {preview.map((coal) => (
                        <div key={coal["Winning Coalition"].join("+")} className="space-y-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            {coal["Winning Coalition"].map((g, gi) => (
                              <span key={g} className="flex items-center gap-0.5">
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white"
                                  style={{ backgroundColor: GROUP_COLORS[g] ?? "#888" }}
                                >
                                  {g}
                                </span>
                                {gi < coal["Winning Coalition"].length - 1 && (
                                  <span className="text-gray-300 text-[9px]">+</span>
                                )}
                              </span>
                            ))}
                            <span className="ml-auto text-[11px] font-bold text-gray-800 tabular-nums">
                              {coal.Percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(coal.Percentage * 2.5, 100)}%`,
                                background: `linear-gradient(90deg, ${coal["Winning Coalition"].map((g) => GROUP_COLORS[g] ?? "#888").join(", ")})`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[9px] text-gray-400 font-medium">Klik for at udforske</div>
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 2: Two equal charts side by side ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Coalitions list */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Hyppigste koalitioner</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            De {coalitions.length} mest forekommende vindende koalitioner i {committeeName.toLowerCase()}. Klik for at fremhæve i diagrammet.
          </p>
          <div className="space-y-1.5 flex-1">
            {coalitions.map((c, i) => {
              const coalKey = c["Winning Coalition"].join("+");
              const isActive = selectedCoalition === i;
              return (
                <button
                  type="button"
                  key={coalKey}
                  onClick={() => setSelectedCoalition(i)}
                  onMouseEnter={() => setHoveredGroup(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 cursor-pointer group/coal ${
                    isActive
                      ? "border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-500/20"
                      : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {c["Winning Coalition"].map((g, gi) => (
                          <span key={g} className="flex items-center gap-0.5">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                              style={{ backgroundColor: GROUP_COLORS[g] ?? "#888" }}
                            >
                              {g}
                            </span>
                            {gi < c["Winning Coalition"].length - 1 && (
                              <span className="text-gray-300 text-[10px]">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{c.Percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(c.Percentage * 2.5, 100)}%`,
                        background: `linear-gradient(90deg, ${c["Winning Coalition"].map((g) => GROUP_COLORS[g] ?? "#888").join(", ")})`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-gray-400">
                    {c.Count.toLocaleString("da-DK")} afstemninger
                  </div>
                </button>
              );
            })}
          </div>
          {/* Figure caption */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Rangeret efter hvor ofte koalitionen har flertal. Jo højere procent, jo oftere stemmer grupperne sammen som vindende blok i {committeeName.toLowerCase()}.
            </p>
          </div>
        </div>

        {/* Chord diagram */}
        <div className="relative flex flex-col">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-900">{committeeName}</span>
              <span className="hidden sm:inline text-[11px] text-gray-400">
                Hover over en gruppe for at udforske
              </span>
            </div>
            <div className="flex justify-center flex-1 items-center">
              <div className="w-full max-w-[500px]">
                <svg ref={svgRef} className="w-full h-auto" style={{ maxHeight: "500px" }} />
              </div>
            </div>
            {/* Figure caption */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                <strong className="text-gray-500">Buer</strong> langs ringen repræsenterer de politiske grupper — bredere bue = mere stemmeaktiv.{" "}
                <strong className="text-gray-500">Bånd</strong> mellem grupperne viser enighed — tykkere bånd = oftere enige.{" "}
                <strong className="text-gray-500">Hover</strong> over en gruppe for at isolere dens forbindelser.{" "}
                NI (Løsgængere) indgår ikke. Viser {activeGroups.length} grupper.
              </p>
            </div>
          </div>

          {/* Group tooltip — floats outside the chord card */}
          {hoveredGroup && (
            <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 min-w-[200px] max-w-[240px]">
              <div className="rounded-xl border border-gray-100 shadow-lg overflow-hidden bg-white">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: GROUP_COLORS[hoveredGroup] }}
                />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block px-2.5 py-1 rounded-lg text-white text-xs font-bold"
                      style={{ backgroundColor: GROUP_COLORS[hoveredGroup] }}
                    >
                      {hoveredGroup}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    {namesData?.political_group_names?.[hoveredGroup] ?? ""}
                  </p>
                  {groupDescriptions.get(hoveredGroup) && (
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {groupDescriptions.get(hoveredGroup)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
