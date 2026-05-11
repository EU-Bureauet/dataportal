"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

interface ThemeVoteSubVote {
  for?: number;
  against?: number;
  abstention?: number;
}

interface ThemeVoteDocument {
  document_reference: string;
  short_title: string;
  voteCount?: number;
  votes?: ThemeVoteSubVote[];
}

interface ThemeVotesMetadata {
  theme_label?: string;
  theme_definition?: string;
  theme_description?: string;
  documents_total?: number;
}

export interface ThemeVotesData {
  metadata?: ThemeVotesMetadata;
  documents?: ThemeVoteDocument[];
}

interface ThemeDonutChartProps {
  data: ThemeVotesData;
  /** Hex color used as the base for the donut. Variations are derived from it. */
  accentColor?: string;
  /** When the surrounding theme page is wired to a theme dataset on /latest-votes,
   * pass the search + eurovoc combo so each slice can deep-link to that dataset
   * and auto-scroll/expand the specific document. */
  latestVotesSearch?: string;
  latestVotesEurovoc?: string;
}

interface Slice {
  key: string;
  text: string;
  href: string;
  weight: number;
  /** Number of distinct afstemninger (ballots) for the document. */
  voteCount: number;
  documentReference: string;
}

interface LabelLayout extends Slice {
  startAngle: number;
  endAngle: number;
  midAngle: number;
  // Anchor on the outer arc (where the leader line begins)
  arcX: number;
  arcY: number;
  // Bend point for the leader line
  bendX: number;
  bendY: number;
  // Label text anchor
  textX: number;
  textY: number;
  textAnchor: "start" | "end";
  fillColor: string;
  // Whether the label (text + leader line) should be rendered. Tiny slices and
  // slices that would overlap a previously-placed label are hidden, but the
  // donut slice itself remains interactive (tooltip on hover).
  showLabel: boolean;
  // Maximum width in pixels available for the label text. Used to truncate.
  maxLabelWidth: number;
  // Possibly-truncated label text shown next to the leader line. The original
  // full phrase is kept on `text` for the tooltip.
  displayText: string;
}

function buildSliceHref(label: string, documentReference: string, search?: string, eurovoc?: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH ? `/${process.env.NEXT_PUBLIC_BASEPATH}` : "";
  if (search && eurovoc && documentReference) {
    return `${basePath}/latest-votes?search=${encodeURIComponent(search)}&eurovoc=${encodeURIComponent(eurovoc)}&doc=${encodeURIComponent(documentReference)}`;
  }
  return `${basePath}/latest-votes?search=${encodeURIComponent(label)}`;
}

function buildSlices(docs: ThemeVoteDocument[], search?: string, eurovoc?: string): Slice[] {
  const map = new Map<string, Slice>();
  for (const doc of docs) {
    const label = (doc.short_title || "").trim();
    if (!label) continue;
    let weight = 0;
    if (doc.votes && doc.votes.length > 0) {
      for (const v of doc.votes) {
        weight += (v.for ?? 0) + (v.against ?? 0) + (v.abstention ?? 0);
      }
    }
    if (weight === 0) weight = doc.voteCount ?? 1;
    // Number of distinct afstemninger (ballots) for this document.
    const voteCount = doc.votes?.length ?? doc.voteCount ?? 1;

    const existing = map.get(label);
    if (existing) {
      existing.weight += weight;
      existing.voteCount += voteCount;
    } else {
      const documentReference = doc.document_reference || "";
      map.set(label, {
        key: documentReference || label,
        text: label,
        weight,
        voteCount,
        documentReference,
        href: buildSliceHref(label, documentReference, search, eurovoc),
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = Number.parseInt(v, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

function rgbCss([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function lighten([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount];
}

function darken([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [r * (1 - amount), g * (1 - amount), b * (1 - amount)];
}

/** Builds a discrete palette of N shades within the accent color hue. The
 * palette goes from a soft tint (mostly white) down to a deeply darkened
 * version, giving a wide visual range while staying on-theme. */
function buildPalette(baseRgb: [number, number, number], steps: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0.5 : i / (steps - 1); // 0..1
    // Map t -> shift -0.55 (lighten 55%) .. +0.30 (darken 30%).
    const shift = -0.55 + t * 0.85;
    const rgb = shift < 0 ? lighten(baseRgb, -shift) : darken(baseRgb, shift);
    out.push(rgbCss(rgb));
  }
  return out;
}

/** Assigns palette indices to slices so adjacent slices have visually distinct
 * colors. Slices are sorted by weight (largest first); we interleave palette
 * positions instead of walking them sequentially so neighbours don't look like
 * the same shade. */
function assignPaletteIndices(count: number, paletteSize: number): number[] {
  const result: number[] = new Array(count);
  // For each slice index i, pick a palette index that varies in a non-monotonic
  // way: alternate between large jumps so neighbours differ noticeably.
  for (let i = 0; i < count; i++) {
    // Largest slices (low i) -> darker shades (high palette index).
    // We stagger by 2 to create a zig-zag pattern through the palette.
    const base = paletteSize - 1 - Math.floor((i * 2) % paletteSize);
    // Add a small offset every other slice to break perfect repetition.
    const offset = i % 2 === 0 ? 0 : Math.floor(paletteSize / 4);
    result[i] = Math.max(0, Math.min(paletteSize - 1, base - offset));
  }
  return result;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Truncate `text` so that it fits within `maxPx` pixels at the given font size.
 * Uses an approximate average character width (suitable for 11–12 px sans-serif). */
function truncateToWidth(text: string, maxPx: number, fontSizePx: number): string {
  // Average glyph width ratio for Inter / system sans at small sizes.
  const avgCharWidth = fontSizePx * 0.55;
  const maxChars = Math.max(6, Math.floor(maxPx / avgCharWidth));
  return truncate(text, maxChars);
}

interface DonutLayout {
  labels: LabelLayout[];
  totalVotes: number;
  height?: number;
  cx?: number;
  cy?: number;
  outerRadius?: number;
  innerRadius?: number;
}

/** Compute the full donut layout: pie geometry, palette assignment, label
 * collision avoidance, and width-based label truncation. Pulled out of the
 * component to keep `ThemeDonutChart`'s body small. */
function computeDonutLayout(
  slices: Slice[],
  width: number,
  baseRgb: [number, number, number],
  isCompact = false,
): DonutLayout {
  if (slices.length === 0) {
    return { labels: [] as LabelLayout[], totalVotes: 0 };
  }

  const totalVotes = slices.reduce((s, x) => s + x.weight, 0);

  // On compact (mobile) layouts, the donut takes the full width because side
  // labels are rendered as a legend list below instead of around the chart.
  const outerRadius = isCompact
    ? Math.min(width, 520) * 0.36
    : Math.min(width, 520) * 0.24;
  const verticalPadding = isCompact ? 12 : 36; // no label rows on compact
  const height = Math.round(outerRadius * 2 + verticalPadding * 2);
  const cx = width / 2;
  const cy = height / 2;
  const innerRadius = outerRadius * 0.6;
  const tickEnd = outerRadius + 12;
  const labelX = Math.min(width / 2 - 8, outerRadius + 80);

  const MIN_LABEL_SHARE = 0.015;
  const LABEL_LINE_HEIGHT = 14;
  const LABEL_FONT_PX = 11.5;
  const SIDE_PADDING = 8;

  const pieGen = d3
    .pie<Slice>()
    .value((d) => d.weight)
    .sort(null)
    .padAngle(0.005);

  const arcs = pieGen(slices);

  const PALETTE_STEPS = 7;
  const palette = buildPalette(baseRgb, PALETTE_STEPS);
  const paletteAssignments = assignPaletteIndices(slices.length, PALETTE_STEPS);

  const labels: LabelLayout[] = arcs.map((a, i) => {
    const midAngle = (a.startAngle + a.endAngle) / 2;
    const sin = Math.sin(midAngle);
    const cos = Math.cos(midAngle);
    const arcX = cx + sin * outerRadius;
    const arcY = cy - cos * outerRadius;
    const bendX = cx + sin * tickEnd;
    const bendY = cy - cos * tickEnd;
    const onRight = sin >= 0;
    const textX = onRight ? cx + labelX : cx - labelX;
    const textY = bendY;
    const share = a.data.weight / totalVotes;
    const fillColor = palette[paletteAssignments[i]];
    const maxLabelWidth = onRight
      ? width - textX - SIDE_PADDING
      : textX - SIDE_PADDING;

    return {
      ...a.data,
      startAngle: a.startAngle,
      endAngle: a.endAngle,
      midAngle,
      arcX,
      arcY,
      bendX,
      bendY,
      textX,
      textY,
      textAnchor: onRight ? "start" : "end",
      fillColor,
      showLabel: share >= MIN_LABEL_SHARE,
      maxLabelWidth: Math.max(40, maxLabelWidth),
      displayText: a.data.text,
    };
  });

  // Collision avoidance per side.
  const placeSide = (side: "left" | "right") => {
    const onSide = labels
      .filter((l) => (side === "right" ? l.textAnchor === "start" : l.textAnchor === "end"))
      .sort((a, b) => a.textY - b.textY);
    let lastY = Number.NEGATIVE_INFINITY;
    for (const l of onSide) {
      if (!l.showLabel) continue;
      if (l.textY - lastY < LABEL_LINE_HEIGHT) {
        l.showLabel = false;
      } else {
        lastY = l.textY;
      }
    }
  };
  placeSide("left");
  placeSide("right");

  // Width-based truncation for surviving labels.
  for (const l of labels) {
    if (!l.showLabel) continue;
    l.displayText = truncateToWidth(l.text, l.maxLabelWidth, LABEL_FONT_PX);
  }

  return { labels, totalVotes, height, cx, cy, outerRadius, innerRadius };
}

interface DonutTooltipState {
  x: number;
  y: number;
  text: string;
  /** Number of afstemninger (ballots) for the slice. */
  voteCount: number;
  href?: string;
}

function CompactLegend({ labels }: Readonly<{ labels: LabelLayout[] }>) {
  const INITIAL_COUNT = 3;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? labels : labels.slice(0, INITIAL_COUNT);
  const hiddenCount = labels.length - INITIAL_COUNT;
  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {visible.map((s) => (
          <li key={`legend-${s.key}`}>
            <a
              href={s.href}
              className="flex items-start gap-2 text-xs text-gray-700 hover:text-gray-900"
            >
              <span
                aria-hidden
                className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: s.fillColor }}
              />
              <span className="flex-1 leading-snug">{s.text}</span>
              <span className="flex-shrink-0 tabular-nums text-gray-500">
                {s.weight.toLocaleString("da-DK")}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Vis færre" : `Vis ${hiddenCount} flere`}
        </button>
      )}
    </div>
  );
}

function DonutTooltip({
  tooltip,
  width,
}: Readonly<{ tooltip: DonutTooltipState; width: number }>) {
  // Estimate tooltip width (max-w-xs = 20rem = 320px, but on narrow containers
  // it shrinks). We clamp positioning so the tooltip always stays inside the
  // container regardless of where the user clicked.
  const SIDE_PADDING = 8;
  const estimatedWidth = Math.min(280, width - SIDE_PADDING * 2);
  const preferredLeft = tooltip.x + 12;
  // If placing to the right of the click would overflow, flip to the left.
  const wouldOverflowRight = preferredLeft + estimatedWidth > width - SIDE_PADDING;
  const flippedLeft = tooltip.x - 12 - estimatedWidth;
  const rawLeft = wouldOverflowRight && flippedLeft >= SIDE_PADDING ? flippedLeft : preferredLeft;
  const left = Math.max(SIDE_PADDING, Math.min(rawLeft, width - estimatedWidth - SIDE_PADDING));
  return (
    <div
      role="tooltip"
      className={`absolute z-10 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg ${
        tooltip.href ? "" : "pointer-events-none"
      }`}
      style={{
        left,
        top: Math.max(0, tooltip.y - 8),
        width: estimatedWidth,
        transform: "translateY(-100%)",
      }}
    >
      <div className="font-medium leading-snug">{tooltip.text}</div>
      <div className="mt-0.5 text-[0.65rem] text-gray-300">
        {tooltip.voteCount.toLocaleString("da-DK")} antal afstemninger
      </div>
      {tooltip.href && (
        <a
          href={tooltip.href}
          className="mt-1.5 inline-block text-[0.7rem] font-semibold text-blue-300 underline underline-offset-2 hover:text-blue-200"
        >
          Se afstemninger →
        </a>
      )}
    </div>
  );
}

export function ThemeDonutChart({ data, accentColor = "#1d4ed8", latestVotesSearch, latestVotesEurovoc }: ThemeDonutChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  // Avoid SSR/CSR hydration mismatches: the SVG is layout-dependent on the
  // measured container width and uses floating-point math that can differ from
  // the server's default width. We only render the chart after the component
  // has mounted and measured its container on the client.
  const [mounted, setMounted] = useState(false);
  // Custom tooltip state — tracked relative to the wrapper div so the tooltip
  // can be absolutely-positioned next to the cursor. When `href` is set the
  // tooltip is rendered in interactive mode (used on touch devices so the
  // first tap shows the tooltip and the user explicitly taps a link inside).
  const [tooltip, setTooltip] = useState<DonutTooltipState | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Factory that returns an SVG mouse handler which positions the custom
  // tooltip relative to the chart container. Defined once and reused by
  // both donut slices and labels.
  const makeTooltipHandler = useCallback(
    (text: string, voteCount: number) =>
      (e: React.MouseEvent<SVGElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          text,
          voteCount,
        });
      },
    [],
  );

  const meta = data.metadata ?? {};
  const slices = useMemo(
    () => buildSlices(data.documents ?? [], latestVotesSearch, latestVotesEurovoc),
    [data.documents, latestVotesSearch, latestVotesEurovoc],
  );
  const baseRgb = useMemo(() => hexToRgb(accentColor), [accentColor]);

  // Track container width so the chart is responsive.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    setMounted(true);
    setWidth(Math.max(320, Math.floor(el.getBoundingClientRect().width)));
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, Math.floor(entry.contentRect.width));
        setWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => computeDonutLayout(slices, width, baseRgb, width < 480),
    [slices, width, baseRgb],
  );

  const arcGen = useMemo(() => {
    if (!layout.outerRadius) return null;
    return d3
      .arc<LabelLayout>()
      .innerRadius(layout.innerRadius!)
      .outerRadius(layout.outerRadius)
      .padAngle(0.005)
      .cornerRadius(2);
  }, [layout.outerRadius, layout.innerRadius]);

  const height = layout.height ?? Math.round(width * 0.7);
  const baseRgbForBg = baseRgb;
  const definitionBg = `rgba(${baseRgbForBg[0]}, ${baseRgbForBg[1]}, ${baseRgbForBg[2]}, 0.06)`;
  const definitionBorder = `rgba(${baseRgbForBg[0]}, ${baseRgbForBg[1]}, ${baseRgbForBg[2]}, 0.4)`;

  return (
    <div>
      {meta.theme_description && (
        <>
          <p className="text-base font-semibold leading-snug text-gray-900">
            {meta.theme_description}
          </p>
          <div
            className="mt-2 h-[2px] w-16 rounded-full"
            style={{ backgroundColor: rgbCss(baseRgb) }}
          />
        </>
      )}

      {layout.labels.length > 0 && arcGen && (
        <>
          <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Afstemninger i temaet
          </h3>
          {(() => {
            if (width < 480) return null; // legend list below shows everything on mobile
            const hidden = layout.labels.filter((l) => !l.showLabel).length;
            if (hidden === 0) return null;
            return (
              <p className="mt-1 text-[0.7rem] text-gray-400">
                {hidden} mindre afstemning{hidden === 1 ? "" : "er"} vises uden navn — hold musen over en bid for at se den.
              </p>
            );
          })()}
          <div
            ref={containerRef}
            className="mt-1 w-full relative"
            style={{ minHeight: height }}
            onMouseLeave={() => setTooltip(null)}
            onPointerDown={(e) => {
              // Dismiss an interactive (touch) tooltip if the user taps the
              // wrapper outside the tooltip itself.
              if (!tooltip?.href) return;
              const target = e.target as HTMLElement;
              if (target.closest('[role="tooltip"]')) return;
              setTooltip(null);
            }}
          >
            {mounted && (
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="block w-full h-auto"
              aria-label="Donut chart over afstemninger i temaet"
            >
              {/* Soft drop shadow for the donut, gives the chart depth. */}
              <defs>
                <filter id="theme-donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="0" dy="2" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.18" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Donut slices */}
              <g transform={`translate(${layout.cx}, ${layout.cy})`} filter="url(#theme-donut-shadow)">
                {layout.labels.map((s) => {
                  const d = arcGen({ ...s } as LabelLayout);
                  const showTooltip = makeTooltipHandler(s.text, s.voteCount);
                  const isHovered = hoveredKey === s.key;
                  // Pop the hovered slice slightly outward along its mid-angle
                  // for a tactile, professional feel.
                  const popDist = 6;
                  const popX = isHovered ? Math.sin(s.midAngle) * popDist : 0;
                  const popY = isHovered ? -Math.cos(s.midAngle) * popDist : 0;
                  // On touch / coarse-pointer devices, intercept the slice
                  // click: the first tap shows the tooltip with an explicit
                  // link inside; the user taps that link to navigate.
                  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (globalThis.window === undefined) return;
                    const isCoarse = globalThis.window.matchMedia?.("(pointer: coarse)").matches;
                    if (!isCoarse) return;
                    if (tooltip?.href === s.href) return; // already shown -> let link handle it
                    e.preventDefault();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      text: s.text,
                      voteCount: s.voteCount,
                      href: s.href,
                    });
                  };
                  return (
                    <a key={s.key} href={s.href} onClick={handleClick}>
                      <path
                        d={d ?? undefined}
                        fill={s.fillColor}
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1.25}
                        style={{
                          cursor: "pointer",
                          transform: `translate(${popX}px, ${popY}px)`,
                          transition: "transform 180ms ease-out, stroke-width 150ms ease-out",
                        }}
                        onMouseEnter={(e) => {
                          showTooltip(e);
                          setHoveredKey(s.key);
                        }}
                        onMouseMove={showTooltip}
                        onMouseLeave={() => {
                          setTooltip(null);
                          setHoveredKey((cur) => (cur === s.key ? null : cur));
                        }}
                      />
                    </a>
                  );
                })}
              </g>

              {/* Center label: total votes. Font sizes scale with the donut's
                  inner radius so the text stays proportional on small/mobile
                  containers (the SVG uses viewBox=width:height 1:1, so CSS
                  rem units would not shrink with the donut). The number's
                  size is also constrained horizontally so multi-digit totals
                  always fit inside the inner circle. */}
              {(() => {
                const innerR = layout.innerRadius ?? 60;
                const documentsTotal = meta.documents_total ?? layout.labels.length;
                const totalText = documentsTotal.toLocaleString("da-DK");
                const unitLabel = documentsTotal === 1 ? "Sag" : "Sager";
                // Available width inside the inner circle (with a little side padding).
                const maxTextWidth = innerR * 2 * 0.82;
                // Approx average glyph width ratio for a bold sans-serif numeral.
                const widthBasedFontSize = maxTextWidth / Math.max(1, totalText.length * 0.6);
                const radiusBasedFontSize = innerR * 0.55;
                const numberFontSize = Math.max(14, Math.min(34, widthBasedFontSize, radiusBasedFontSize));
                const labelFontSize = Math.max(8, Math.min(12, innerR * 0.18));
                // Position the number on the geometric center using
                // `dominantBaseline="central"`, then place the unit label just
                // below it. We nudge the whole group up by half the label's
                // height so the number + label pair sits visually centered.
                const groupOffsetY = -labelFontSize * 0.6;
                return (
                  <g transform={`translate(${layout.cx}, ${layout.cy + groupOffsetY})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        fontSize: `${numberFontSize}px`,
                        fontWeight: 800,
                        fill: rgbCss(darken(baseRgb, 0.15)),
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {totalText}
                    </text>
                    <text
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      y={numberFontSize * 0.55}
                      style={{
                        fontSize: `${labelFontSize}px`,
                        fill: "#6b7280",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {unitLabel}
                    </text>
                  </g>
                );
              })()}

              {/* Leader lines + labels (hidden on compact/mobile widths
                  where they would overflow the card; a legend list is
                  rendered below the SVG instead). */}
              {width >= 480 && (
                <g>
                  {layout.labels.filter((s) => s.showLabel).map((s) => {
                    const showTooltip = makeTooltipHandler(s.text, s.voteCount);
                    return (
                    <g key={`label-${s.key}`}>
                      <polyline
                        points={`${s.arcX},${s.arcY} ${s.bendX},${s.bendY} ${s.textX},${s.textY}`}
                        fill="none"
                        stroke={s.fillColor}
                        strokeWidth={1}
                      />
                      <a href={s.href}>
                        <text
                          x={s.textX + (s.textAnchor === "start" ? 4 : -4)}
                          y={s.textY}
                          textAnchor={s.textAnchor}
                          dominantBaseline="middle"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 500,
                            fill: "#374151",
                            cursor: "pointer",
                          }}
                          onMouseEnter={showTooltip}
                          onMouseMove={showTooltip}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {s.displayText}
                        </text>
                      </a>
                    </g>
                    );
                  })}
                </g>
              )}
            </svg>
            )}
            {/* Compact legend list shown on narrow viewports in place of the
                side labels. Each row links to the same deep-link as the slice. */}
            {mounted && width < 480 && layout.labels.length > 0 && (
              <CompactLegend labels={layout.labels} />
            )}
            {tooltip && <DonutTooltip tooltip={tooltip} width={width} />}
          </div>
        </>
      )}

      {meta.theme_definition && (
        <div
          className="mt-4 -mx-6 sm:-mx-8 -mb-3 sm:-mb-4 px-6 sm:px-8 py-3 border-t rounded-b-xl"
          style={{ backgroundColor: definitionBg, borderColor: definitionBorder }}
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-gray-500">
            Tema-afgrænsning
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600 italic">
            {meta.theme_definition}
          </p>
        </div>
      )}
    </div>
  );
}
