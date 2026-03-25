import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { HeroSection } from "@/components/hero-section";
import { ArticleCard } from "@/components/article-card";
import { VisualisationCard } from "@/components/visualisation-card";

interface ThemeArticle {
  title: string;
  description: string;
  image: string;
  url: string;
}

interface ThemeVisualisation {
  title: string;
  description: string;
  href: string;
}

interface ThemeData {
  slug: string;
  title: string;
  heroImage: string;
  articles: ThemeArticle[];
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
            <div className="space-y-6">
              {theme.articles.map((article) => (
                <ArticleCard
                  key={article.url}
                  title={article.title}
                  description={article.description}
                  image={article.image}
                  url={article.url}
                />
              ))}
            </div>
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
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
