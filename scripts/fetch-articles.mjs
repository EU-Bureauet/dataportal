/**
 * Fetch articles from WordPress REST API (with RSS fallback).
 * Writes data/articles.json — run as: node scripts/fetch-articles.mjs
 *
 * Fallback chain:
 *   1. WP REST API  →  structured JSON
 *   2. RSS feed     →  parsed XML
 *   3. Cached file  →  keep existing articles.json
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "..", "data", "articles.json");

const WP_BASE = "https://www.eubureauet.dk";
const REST_URL = `${WP_BASE}/wp-json/wp/v2/posts`;
const RSS_URL = `${WP_BASE}/feed/`;
const PER_PAGE = 100;

// ── REST API fetcher ────────────────────────────────────────

async function fetchFromRestAPI() {
  const articles = [];
  let page = 1;

  while (true) {
    const url = `${REST_URL}?per_page=${PER_PAGE}&page=${page}&_embed`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`REST API ${res.status}: ${res.statusText}`);

    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const post of posts) {
      const embedded = post._embedded || {};
      const featuredMedia = embedded["wp:featuredmedia"]?.[0];
      const termGroups = embedded["wp:term"] || [];

      // term group 0 = categories, term group 1 = tags
      const categories = (termGroups[0] || []).map((t) => t.name);
      const tags = (termGroups[1] || []).map((t) => t.name);

      articles.push({
        id: String(post.id),
        title: decodeEntities(post.title?.rendered || ""),
        description: stripHTML(post.excerpt?.rendered || "").trim(),
        image: featuredMedia?.source_url || "",
        url: post.link,
        date: post.date,
        categories,
        tags,
      });
    }

    // Check if there are more pages
    const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "1", 10);
    if (page >= totalPages) break;
    page++;
  }

  return articles;
}

// ── RSS fallback fetcher ────────────────────────────────────

async function fetchFromRSS() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`RSS fetch ${res.status}: ${res.statusText}`);
  const xml = await res.text();

  const items = xml.split("<item>").slice(1);
  const articles = [];

  for (const item of items) {
    const title = extractTag(item, "title");
    const link = extractTag(item, "link");
    const pubDate = extractTag(item, "pubDate");
    const description = stripHTML(extractTag(item, "description")).trim();

    // Extract featured image from content:encoded
    const content = extractTag(item, "content:encoded");
    const image = extractImageFromHTML(content);

    // Extract categories
    const categoryMatches = item.match(/<category[^>]*><!\[CDATA\[([^\]]+)\]\]><\/category>/g) || [];
    const allTerms = categoryMatches.map((m) => {
      const match = m.match(/<!\[CDATA\[([^\]]+)\]\]>/);
      return match ? match[1] : "";
    }).filter(Boolean);

    articles.push({
      id: link || String(articles.length),
      title: decodeEntities(title),
      description: decodeEntities(description),
      image,
      url: link,
      date: pubDate ? new Date(pubDate).toISOString().split("T")[0] : "",
      categories: allTerms.filter((t) => ["Artikel", "EU-netværk", "Værktøj"].includes(t)),
      tags: allTerms.filter((t) => !["Artikel", "EU-netværk", "Værktøj"].includes(t)),
    });
  }

  return articles;
}

// ── Helpers ─────────────────────────────────────────────────

function extractTag(xml, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? match[1].trim() : "";
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, "");
}

function decodeEntities(text) {
  return text
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8220;/g, "\u201C")
    .replace(/&#8221;/g, "\u201D")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function extractImageFromHTML(html) {
  // Look for featured image class first
  const featured = html.match(/class="webfeedsFeaturedVisual"[^>]*src="([^"]+)"/);
  if (featured) return featured[1];
  // Fall back to first img
  const img = html.match(/<img[^>]+src="([^"]+)"/);
  return img ? img[1] : "";
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  let articles;

  try {
    articles = await fetchFromRestAPI();
    console.log(`✓ Fetched ${articles.length} articles from REST API`);
  } catch (err) {
    console.log(`✗ REST API failed: ${err.message}`);
    try {
      articles = await fetchFromRSS();
      console.log(`✓ Fetched ${articles.length} articles from RSS feed`);
    } catch (rssErr) {
      console.log(`✗ RSS feed failed: ${rssErr.message}`);
      if (existsSync(OUTPUT)) {
        console.log("→ Using cached articles.json");
        return;
      }
      throw new Error("No WordPress connection and no cached data");
    }
  }

  // Sort by date (newest first)
  articles.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const output = { _generated: new Date().toISOString(), articles };
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`→ Wrote ${articles.length} articles to ${OUTPUT}`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
