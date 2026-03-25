import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/hero-section";
import { ThemeArticles } from "@/components/theme-articles";
import { VisualisationCard } from "@/components/visualisation-card";
import { ParliamentHemicycle } from "@/components/parliament-hemicycle";

interface ThemeArticle {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  date: string;
  categories: string[];
  tags: string[];
}

interface ThemeArticleFilter {
  tags: string[];
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
  heroImage: string;
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

function getThemeArticles(filter: ThemeArticleFilter): ThemeArticle[] {
  const articlesPath = path.join(process.cwd(), "data", "articles.json");
  if (!fs.existsSync(articlesPath)) return [];
  const raw = fs.readFileSync(articlesPath, "utf-8");
  const data = JSON.parse(raw) as { articles: ThemeArticle[] };

  const filterTags = filter.tags.map((t) => t.toLowerCase());

  return data.articles
    .filter((a) =>
      a.tags.some((tag) => filterTags.includes(tag.toLowerCase()))
    )
    .slice(0, filter.maxArticles ?? 6);
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
  return getThemeSlugs().map((slug) => ({ slug }));
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

  if (!theme) {
    notFound();
  }

  const articles = getThemeArticles(theme.articleFilter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero — full width, sits right below the sticky nav */}
      <HeroSection title={theme.title} image={theme.heroImage} />

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Articles (30%) */}
          <aside className="w-full lg:w-[30%] lg:border-r lg:border-gray-200 lg:pr-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Artikler</h2>
            <ThemeArticles
              filter={theme.articleFilter}
              fallbackArticles={articles}
            />
          </aside>

          {/* Right column — Visualisations (70%) */}
          <section className="w-full lg:w-[70%]">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Visualiseringer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {theme.visualisations.map((vis) => (
                <VisualisationCard
                  key={vis.href}
                  title={vis.title}
                  description={vis.description}
                  href={vis.href}
                  subDescription={generateSubDescription(vis)}
                />
              ))}
            </div>

            {/* Parliament hemicycle — aligned with the visualisation cards */}
            <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-100 p-6 sm:p-8">
              <ParliamentHemicycle />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
