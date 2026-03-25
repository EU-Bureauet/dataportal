import Link from "next/link";
import { BarChart3 } from "lucide-react";

interface VisualisationCardProps {
  title: string;
  description: string;
  href: string;
}

export function VisualisationCard({ title, description, href }: VisualisationCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-all group border border-gray-100 hover:border-blue-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
          <BarChart3 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {description}
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-blue-600 group-hover:underline">
            Se visualisering &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
