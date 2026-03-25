import Link from "next/link";
import {
  ScrollText,
  Grid3X3,
  Users,
  Network,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

/* Map card titles to meaningful icons */
const ICON_MAP: Record<string, LucideIcon> = {
  "Liste over afstemninger": ScrollText,
  "Heatmap": Grid3X3,
  "Danske MEP'er": Users,
  "Koalitionsdiagram": Network,
};

/* Gradient pairs for the icon badge (picked to feel professional & distinct) */
const GRADIENT_MAP: Record<string, string> = {
  "Liste over afstemninger": "from-indigo-500 to-blue-600",
  "Heatmap": "from-emerald-500 to-teal-600",
  "Danske MEP'er": "from-amber-500 to-orange-600",
  "Koalitionsdiagram": "from-violet-500 to-purple-600",
};

const DEFAULT_GRADIENT = "from-blue-500 to-indigo-600";

interface VisualisationCardProps {
  title: string;
  description: string;
  href: string;
  subDescription?: string;
}

export function VisualisationCard({ title, description, href, subDescription }: VisualisationCardProps) {
  const Icon = ICON_MAP[title] ?? BarChart3;
  const gradient = GRADIENT_MAP[title] ?? DEFAULT_GRADIENT;

  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-white rounded-xl border border-gray-200/80 p-5 transition-all duration-300 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-300/60 overflow-hidden"
    >
      {/* Subtle top-edge gradient accent — visible on hover */}
      <span
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${gradient} origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100`}
      />

      <div className="flex items-start gap-4">
        {/* Icon badge */}
        <div
          className={`relative flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:shadow-md`}
        >
          <Icon size={20} className="text-white" strokeWidth={1.8} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[0.95rem] font-semibold text-gray-900 leading-snug group-hover:text-gray-800 transition-colors duration-200">
            {title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
            {description}
          </p>

          {subDescription && (
            <p className="mt-2.5 text-xs text-gray-400 leading-relaxed line-clamp-2 border-l-2 border-gray-200 pl-2.5 group-hover:border-blue-300 transition-colors duration-200">
              {subDescription}
            </p>
          )}

          {/* CTA with animated arrow */}
          <span className="mt-3.5 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
            Se visualisering
            <svg
              className="w-4 h-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
