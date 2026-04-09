"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  maxArticles?: number;
}

interface ThemeArticlesProps {
  filter: ArticleFilter;
  fallbackArticles: Article[];
  initialVisible?: number;
}

const WP_API_URL = "/wp-json/wp/v2/posts?per_page=100&_embed";

function decodeHTML(html: string): string {
  if (typeof document === "undefined") return html;
  const el = document.createElement("textarea");
  el.innerHTML = html;
  return el.value;
}

async function fetchWPPosts(url: string): Promise<unknown[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WP API ${res.status}`);
  return res.json();
}

function filterByTags(
  posts: unknown[],
  filter: ArticleFilter
): Article[] {
  const filterTags = filter.tags.map((t) => t.toLowerCase());
  const max = filter.maxArticles ?? 6;

  type WPPost = {
    id: number;
    title: { rendered: string };
    excerpt: { rendered: string };
    link: string;
    _embedded?: {
      "wp:featuredmedia"?: { source_url: string }[];
      "wp:term"?: { name: string }[][];
    };
  };

  return (posts as WPPost[])
    .filter((post) => {
      const postTags =
        post._embedded?.["wp:term"]?.[1]?.map((t) => t.name) ?? [];
      return postTags.some((tag) =>
        filterTags.includes(tag.toLowerCase())
      );
    })
    .slice(0, max)
    .map((post) => ({
      id: String(post.id),
      title: decodeHTML(post.title.rendered),
      description: decodeHTML(
        // eslint-disable-next-line sonarjs/slow-regex -- linear-time negated character class, safe
        post.excerpt.rendered.replace(/<[^>]+>/g, "").trim()
      ),
      image:
        post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
      url: post.link,
    }));
}

export function ThemeArticles({
  filter,
  fallbackArticles,
  initialVisible = 3,
}: ThemeArticlesProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: posts } = useSWR(WP_API_URL, fetchWPPosts, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const articles = posts ? filterByTags(posts, filter) : fallbackArticles;

  if (articles.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Ingen artikler fundet for dette tema.
      </p>
    );
  }

  const hasMore = articles.length > initialVisible;
  const visible = expanded ? articles : articles.slice(0, initialVisible);
  const hiddenCount = articles.length - initialVisible;

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

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                     text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
                     transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Vis færre artikler
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Vis {hiddenCount} flere artikler
            </>
          )}
        </button>
      )}
    </div>
  );
}
