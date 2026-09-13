"use client"

import * as flags from "country-flag-icons/react/3x2";
import { GROUP_COLORS } from "@/lib/group-colors";

/* Small building blocks shared between the overview list and the expanded
 * party detail, so the two stay visually consistent. */

export function FlagIcon({
  countryCode,
  title,
  className,
}: Readonly<{ countryCode: string; title?: string; className?: string }>) {
  const Flag = flags[countryCode as keyof typeof flags];
  if (!Flag) return null;
  return <Flag title={title ?? countryCode} className={className ?? "w-5 h-auto rounded-sm flex-shrink-0"} />;
}

export function GroupBadge({ code }: Readonly<{ code: string }>) {
  const bg = GROUP_COLORS[code] ?? "#888";
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {code}
    </span>
  );
}

/** Compact two-segment bar: green = enig, red = uenig, sized by disagreement_rate_percent. */
export function DisagreementBar({ ratePercent }: Readonly<{ ratePercent: number }>) {
  const disagree = Math.min(100, Math.max(0, ratePercent));
  const agree = 100 - disagree;
  return (
    <div className="w-full">
      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${agree}%` }} title={`${agree.toFixed(1)}% enige`} />
        <div className="h-full bg-red-500" style={{ width: `${disagree}%` }} title={`${disagree.toFixed(1)}% uenige`} />
      </div>
    </div>
  );
}

export function formatDanishNumber(n: number): string {
  return n.toLocaleString("da-DK");
}
