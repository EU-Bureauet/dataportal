"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "./article-card";

interface Article {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
}

interface ArticleFilter {
  tags: string[];
  tagIds?: number[];
  maxArticles?: number;
}

interface ThemeArticlesProps {
  filter: ArticleFilter;
  initialVisible?: number;
}

const WP_BASE = "https://www.eubureauet.dk";

function decodeHTML(html: string): string {
  if (typeof document === "undefined") return html;
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

type WPPost = {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  _embedded?: {
    "wp:featuredmedia"?: { source_url: string }[];
  };
};

async function fetchWPPosts(url: string): Promise<WPPost[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  return res.json();
}

function mapPosts(posts: WPPost[]): Article[] {
  return posts.map((post) => ({
    id: String(post.id),
    title: decodeHTML(post.title.rendered),
    description: decodeHTML(
      // eslint-disable-next-line sonarjs/slow-regex -- linear-time negated character class, safe
      post.excerpt.rendered.replace(/<[^>]+>/g, "").trim()
    ),
    image: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
    url: post.link,
  }));
}

export function ThemeArticles({ filter, initialVisible = 3 }: ThemeArticlesProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const tagIds = filter.tagIds ?? [];
  const max = filter.maxArticles ?? 100;
  // Only build a request URL once we actually have tag IDs to filter by;
  // SWR treats a `null` key as a no-op, which safely short-circuits when
  // the theme JSON is missing tagIds (e.g. before the prebuild sync runs).
  const url =
    tagIds.length > 0
      ? `${WP_BASE}/wp-json/wp/v2/posts?tags=${tagIds.join(",")}&per_page=${max}&_embed`
      : null;

  const { data: posts, error, isLoading } = useSWR(url, fetchWPPosts, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    setCurrentPage(0);
  }, [url]);

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-gray-500"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm">Henter artikler…</p>
      </div>
    );
  }

  if (error || !posts) {
    return (
      <p className="text-sm text-gray-500 italic">
        Kunne ikke hente artikler lige nu.
      </p>
    );
  }

  const articles = mapPosts(posts);

  if (articles.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Ingen artikler fundet for dette tema.
      </p>
    );
  }

  const pageSize = initialVisible;
  const totalPages = Math.ceil(articles.length / pageSize);
  const startIndex = currentPage * pageSize;
  const visible = articles.slice(startIndex, startIndex + pageSize);
  const hasPagination = totalPages > 1;

  return (
    <div className="space-y-6">
      {visible.map((article) => (
        <ArticleCard
          key={article.id}
          title={article.title}
          description={article.description}
          image={article.image}
          url={article.url}
        />
      ))}

      {hasPagination && (
        <div className="flex items-center justify-between gap-3 py-1">
          <button
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
            disabled={currentPage === 0}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg
                       text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50
                       transition-colors cursor-pointer"
            aria-label="Forrige artikelside"
          >
            <ChevronLeft className="w-4 h-4" />
            Forrige
          </button>

          <p className="text-sm text-gray-600" aria-live="polite">
            Side {currentPage + 1} af {totalPages}
          </p>

          <button
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
            disabled={currentPage >= totalPages - 1}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg
                       text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50
                       transition-colors cursor-pointer"
            aria-label="Næste artikelside"
          >
            Næste
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
