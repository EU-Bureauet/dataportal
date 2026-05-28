/* eslint-disable security/detect-non-literal-fs-filename, security/detect-non-literal-regexp -- build-time SSG code, paths from process.cwd() + hardcoded filenames, no user input */
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/hero-section";
import { ThemeArticles } from "@/components/theme-articles";
import { VisualisationCard } from "@/components/visualisation-card";
import { ThemeDonutChart, type ThemeVotesData } from "@/components/theme-donut-chart";
import { ThemeVideoFab } from "@/components/theme-video-fab";

interface ThemeArticleFilter {
  tags: string[];
  tagIds?: number[];
  maxArticles?: number;
}

interface ThemeVisualisation {
  title: string;
  description: string;
  href: string;
  dataSource?: {
    file: string;
    search?: string;
    eurovoc?: string;
    committee?: string;
  };
}

interface ThemeData {
  slug: string;
  title: string;
  subtitle?: string;
  heroImage: string;
  videoUrl?: string;
  published?: boolean;
  articleFilter: ThemeArticleFilter;
  visualisations: ThemeVisualisation[];
}

function getThemesDir(): string {
  return path.join(process.cwd(), "data", "themes");
}

function getThemeSlugs(): string[] {
  const dir = getThemesDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function getThemeData(slug: string): ThemeData | null {
  const filePath = path.join(getThemesDir(), `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ThemeData;
}

interface LatestVotesDoc {
  short_title: string;
  eurovoc_keywords: string[];
  report: string;
  committee: (string | number)[];
  votes: { vote_description: string }[];
}

interface LatestVotesData {
  documents: LatestVotesDoc[];
  eurovoc: { label: string; voteCount: number }[];
}

interface PairwiseEntry {
  "Group Pair": [string, string];
  Total: number;
  Count: number;
  Percentage: number;
}

type PairwiseCoalitionsData = Record<string, PairwiseEntry[]>;

function generateSubDescriptionLatestVotes(vis: ThemeVisualisation, data: LatestVotesData): string | undefined {
  const searchTerm = vis.dataSource!.search?.toLowerCase();
  const eurovocFilter = vis.dataSource!.eurovoc;

  // Filter matching documents (same logic as the latest-votes page)
  let docs = data.documents;
  if (searchTerm) {
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    docs = docs.filter((doc) => {
      const fields = [
        doc.report,
        doc.short_title,
        ...doc.committee.map(String),
        ...(doc.eurovoc_keywords || []),
        ...doc.votes.map((v) => v.vote_description),
      ];
      return fields.some((f) => f && regex.test(f));
    });
  }
  if (eurovocFilter) {
    docs = docs.filter((doc) =>
      doc.eurovoc_keywords?.includes(eurovocFilter)
    );
  }

  if (docs.length === 0) return undefined;

  const keywordCounts: Record<string, number> = {};
  docs.forEach((doc) => {
    (doc.eurovoc_keywords || []).forEach((kw) => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });
  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);

  if (topKeywords.length === 0) return undefined;
  return topKeywords.join(", ");
}

function generateSubDescriptionPairwise(vis: ThemeVisualisation, data: PairwiseCoalitionsData): string | undefined {
  const committee = vis.dataSource!.committee;
  if (!committee) return undefined;

  const entries = data[committee];
  if (!entries || entries.length === 0) return undefined;

  // Collect unique group names
  const groups = new Set<string>();
  entries.forEach((entry) => {
    entry["Group Pair"].forEach((g) => groups.add(g));
  });

  const sortedGroups = Array.from(groups).sort();
  return sortedGroups.join(", ");
}

function generateSubDescription(vis: ThemeVisualisation): string | undefined {
  if (!vis.dataSource) return undefined;
  const dataPath = path.join(process.cwd(), "data", vis.dataSource.file);
  if (!fs.existsSync(dataPath)) return undefined;

  const raw = fs.readFileSync(dataPath, "utf-8");

  if (vis.dataSource.file === "All_Pairwise_coalitions.json") {
    return generateSubDescriptionPairwise(vis, JSON.parse(raw) as PairwiseCoalitionsData);
  }

  return generateSubDescriptionLatestVotes(vis, JSON.parse(raw) as LatestVotesData);
}

export function generateStaticParams() {
  return getThemeSlugs()
    .filter((slug) => {
      const theme = getThemeData(slug);
      return theme?.published === true;
    })
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = getThemeData(slug);
  return {
    title: theme ? `Tema: ${theme.title}` : "Tema",
  };
}

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = getThemeData(slug);

  if (!theme || theme.published !== true) {
    notFound();
  }

  // Map theme slug -> Tailwind gradient classes, matching the colors used on the
  // ThemeExplorationCards on the dataportal landing page.
  const themeGradients: Record<string, string> = {
    forsvar: "from-blue-600 to-blue-800",
    miljoe: "from-green-600 to-emerald-800",
    energi: "from-amber-600 to-orange-800",
  };
  const themeGradient = themeGradients[theme.slug];

  // Per-theme accent color (hex) for the tag cloud, matching each theme's palette.
  const themeAccentColors: Record<string, string> = {
    forsvar: "#1d4ed8", // blue-700
    miljoe: "#047857", // emerald-700
    energi: "#b45309", // amber-700
  };
  const themeAccentColor = themeAccentColors[theme.slug] ?? themeAccentColors.forsvar;

  // Load tag-cloud data for this theme. Filename mapping keeps the JSON
  // files self-contained and avoids touching the existing themes/*.json.
  const themeVotesFiles: Record<string, string> = {
    forsvar: "theme_votes_forsvar_sikkerhed.json",
    miljoe: "theme_votes_miljo_sundhed.json",
    energi: "theme_votes_energi_industri.json",
  };
  let themeVotesData: ThemeVotesData | null = null;
  const themeVotesFilename = themeVotesFiles[theme.slug];
  if (themeVotesFilename) {
    const themeVotesPath = path.join(process.cwd(), "data", themeVotesFilename);
    if (fs.existsSync(themeVotesPath)) {
      themeVotesData = JSON.parse(fs.readFileSync(themeVotesPath, "utf-8")) as ThemeVotesData;
    }
  }

  return (
    <div>
      {/* Hero — full width, sits right below the sticky nav */}
      <HeroSection title={theme.title} subtitle={theme.subtitle} image={theme.heroImage} />

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Articles (30%) */}
          <aside className="w-full lg:w-[30%] lg:border-r lg:border-gray-200 lg:pr-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6"></h2>
            <ThemeArticles
              filter={theme.articleFilter}
            />
          </aside>

          {/* Right column — Visualisations (70%), sticky on desktop */}
          <section className="w-full lg:w-[70%] lg:self-start lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-6"></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {theme.visualisations.map((vis) => (
                <VisualisationCard
                  key={vis.href}
                  title={vis.title}
                  description={vis.description}
                  href={vis.href}
                  subDescription={generateSubDescription(vis)}
                  themeGradient={themeGradient}
                />
              ))}
            </div>

            {/* Donut chart over the votes that make up this theme. */}
            {themeVotesData && (() => {
              const latestVotesVis = theme.visualisations.find(
                (v) => v.dataSource?.file === "latest_votes.json"
              );
              return (
                <div className="mt-4 bg-white rounded-xl shadow-md border border-gray-100 px-6 sm:px-8 py-3 sm:py-4">
                  <ThemeDonutChart
                    data={themeVotesData}
                    accentColor={themeAccentColor}
                    latestVotesSearch={latestVotesVis?.dataSource?.search}
                    latestVotesEurovoc={latestVotesVis?.dataSource?.eurovoc}
                  />
                </div>
              );
            })()}
          </section>
        </div>
      </div>

      {theme.videoUrl && (
        <ThemeVideoFab
          videoUrl={theme.videoUrl}
          themeSlug={theme.slug}
          title={theme.title}
        />
      )}
    </div>
  );
}
