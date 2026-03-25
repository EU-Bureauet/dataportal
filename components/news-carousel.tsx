"use client"

import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import Image from 'next/image';

interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  
  let content = match[1].trim();
  
  // Remove CDATA wrapper if present
  content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
  
  return content.trim();
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function decodeHTML(html: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };
  
  return html.replace(/&[#a-z0-9]+;/gi, (entity) => {
    return entities[entity.toLowerCase()] || entity;
  });
}

function parseRSS(xmlText: string): Article[] {
  const articles: Article[] = [];
  
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const items = xmlText.match(itemRegex);
  
  if (!items) return articles;

  for (const item of items.slice(0, 6)) {
    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    const description = extractTag(item, 'description');
    const pubDate = extractTag(item, 'pubDate');
    
    let image = '';
    const contentEncoded = extractTag(item, 'content:encoded');
    if (contentEncoded) {
      const featuredImgMatch = contentEncoded.match(/<img[^>]*class="[^"]*webfeedsFeaturedVisual[^"]*"[^>]*src="([^">]+)"/);
      if (featuredImgMatch) {
        image = featuredImgMatch[1];
      } else {
        const imgMatch = contentEncoded.match(/<img[^>]*src="([^">]+)"/);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }
    }
    
    if (!image) {
      const mediaContent = extractTag(item, 'media:content');
      if (mediaContent) {
        const urlMatch = mediaContent.match(/url="([^"]+)"/);
        if (urlMatch) {
          image = urlMatch[1];
        }
      }
    }

    const cleanDescription = decodeHTML(stripHTML(description || ''));

    articles.push({
      title: decodeHTML(title || 'Ingen titel'),
      link: link || '#',
      description: cleanDescription,
      pubDate: pubDate || new Date().toISOString(),
      image: image || undefined
    });
  }

  return articles;
}

export default function NewsCarousel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch RSS feed only once when component mounts
    async function fetchRSS() {
      try {
        const feedUrl = `/feed/`;
        
        const response = await fetch(feedUrl);
        
        if (!response.ok) {
          console.warn('RSS feed not available');
          setLoading(false);
          return;
        }
        
        const xmlText = await response.text();
        const parsedArticles = parseRSS(xmlText);
        setArticles(parsedArticles);
      } catch (error) {
        console.warn('Error fetching RSS feed:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRSS();
  }, []); // Empty dependency array - fetch only once on mount

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 1 >= articles.length ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 1 < 0 ? articles.length - 1 : prevIndex - 1
    );
  };

  // Auto-advance disabled - carousel only changes when user clicks
  // useEffect(() => {
  //   if (articles.length === 0) return;
  //   
  //   const interval = setInterval(nextSlide, 5000);
  //   return () => clearInterval(interval);
  // }, [articles.length]);

  if (loading) {
    return null; // Don't show loading state
  }

  if (articles.length === 0) {
    return null; // Don't show anything if no articles
  }

  // Show 3 articles at a time on desktop, 1 on mobile
  const visibleArticles = [
    articles[currentIndex],
    articles[(currentIndex + 1) % articles.length],
    articles[(currentIndex + 2) % articles.length],
  ];

  return (
    <div className="w-full py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl text-gray-700">Seneste artikler fra EU-bureauet</h2>
          <a 
            href="https://www.eubureauet.dk" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Se alle artikler →
          </a>
        </div>

        <div className="relative">
          {/* Carousel */}
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleArticles.map((article, idx) => (
                <a 
                  key={`${article.link}-${idx}`}
                  href={article.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="h-full hover:shadow-xl transition-shadow duration-300 overflow-hidden group p-0">
                    {article.image && (
                      <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                        <Image
                          src={article.image}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {new Date(article.pubDate).toLocaleDateString('da-DK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-gray-600">
                        {article.description}
                      </p>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10 hidden md:block"
            aria-label="Forrige artikel"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10 hidden md:block"
            aria-label="Næste artikel"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots indicator */}
          <div className="flex justify-center mt-6 gap-2">
            {articles.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-blue-600 w-8' : 'bg-gray-300'
                }`}
                aria-label={`Gå til artikel ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
