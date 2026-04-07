import Link from "next/link";
import forsvarTheme from "@/data/themes/forsvar.json";
import miljoeTheme from "@/data/themes/miljoe.json";
import energiTheme from "@/data/themes/energi.json";

const themes = [
  { slug: forsvarTheme.slug, label: forsvarTheme.title, gradient: "from-blue-600 to-blue-800" },
  { slug: miljoeTheme.slug, label: miljoeTheme.title, gradient: "from-green-600 to-emerald-800" },
  { slug: energiTheme.slug, label: energiTheme.title, gradient: "from-amber-600 to-orange-800" },
];

function ThemeExplorationCard({ slug, label, gradient }: { slug: string; label: string; gradient: string }) {
  return (
    <Link
      href={`/tema/${slug}`}
      className="group relative overflow-hidden rounded-xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-2">
        <h3 className="font-bold text-base leading-tight">{label}</h3>
      </div>
    </Link>
  );
}

export function ThemeExplorationCards() {
  return (
    <div className="mt-10 max-w-4xl mx-auto">
      <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Udforsk et tema</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <ThemeExplorationCard key={theme.slug} {...theme} />
        ))}
      </div>
    </div>
  );
}
