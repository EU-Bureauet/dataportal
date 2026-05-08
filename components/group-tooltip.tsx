"use client";

interface GroupTooltipProps {
  name: string;
  code: string;
  color: string;
  description?: string;
  stats?: { label: string; value: string }[];
  x: number;
  y: number;
  containerWidth: number;
}

export function GroupTooltip({ name, code, color, description, stats, x, y, containerWidth }: Readonly<GroupTooltipProps>) {
  const tooltipWidth = 260;
  const left = Math.min(Math.max(x - tooltipWidth / 2, 0), containerWidth - tooltipWidth);

  return (
    <div
      className="absolute pointer-events-none z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3"
      style={{ left, top: y, transform: "translateY(-100%)", maxWidth: tooltipWidth }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm text-gray-900">{name}</span>
        <span className="text-xs text-gray-400">({code})</span>
      </div>
      {description && <p className="text-xs text-gray-600 mb-1">{description}</p>}
      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          {stats.map((s) => (
            <p key={s.label} className="text-xs text-gray-800">
              <span className="font-medium">{s.value}</span>{" "}
              <span className="text-gray-500">{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
