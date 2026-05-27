/* eslint-disable security/detect-non-literal-fs-filename -- build-time SSG code, paths from process.cwd() + hardcoded filenames, no user input */
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/hero-section";
import { ThemeArticles } from "@/components/theme-articles";
import { VisualisationCard } from "@/components/visualisation-card";
import { ThemeDonutChart, type ThemeVotesData } from "@/components/theme-donut-chart";

interface ThemeArticleFilter {
  tags: string[];
  tagIds?: number[];
  maxArticles?: number;
}

interface ThemeVisualisation {
  title: string;
  description: string;
  href: string;
  ctaText?: string;
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
  published?: boolean;
  articleFilter: ThemeArticleFilter;
  visualisations: ThemeVisualisation[];
}

function getProjectRoot(): string {
  // During Next build/export workers, process.cwd() can resolve to a parent
  // workspace. INIT_CWD keeps the original npm invocation directory.
  return process.env.INIT_CWD ?? process.cwd();
}

function getThemesDir(): string {
  return path.join(getProjectRoot(), "data", "themes");
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

export async function generateStaticParams() {
  const allSlugs = getThemeSlugs();
  const publishedSlugs = allSlugs
    .filter((slug) => {
      const theme = getThemeData(slug);
      return theme?.published === true;
    });

  // Static export fails when a dynamic route has no generated params.
  // If all themes are currently unpublished, still emit params so export works.
  const slugsToExport = publishedSlugs.length > 0 ? publishedSlugs : allSlugs;

  return slugsToExport.map((slug) => ({ slug }));
}

export const dynamicParams = false;

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
    const themeVotesPath = path.join(getProjectRoot(), "data", themeVotesFilename);
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
                  ctaText={vis.ctaText}
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
    </div>
  );
}

