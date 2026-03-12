"use client"

import React from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import NewsCarousel from "@/components/news-carousel";

interface FeatureCard {
  title: string;
  description: string;
  href: string;
  color: string;
  icon: React.ReactNode;
}

const features: FeatureCard[] = [
  {
    title: "Seneste afstemninger",
    description: "Få et hurtigt overblik over de nyeste afstemninger i Europa-Parlamentet og dyk ned i detaljerne.",
    href: "/latest-votes",
    color: "#60a5fa",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 8v5l4 2-.75 1.23L10 13V8h2zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    )
  },
  {
    title: "Tjek MEP'er",
    description: "Se detaljerede oplysninger om de 720 MEP'er. Hold øje med hvor ofte de stemmer - og om de stemmer med eller mod deres politiske gruppe.",
    href: "/meps",
    color: "#80d8a8",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    )
  },
  {
    title: "Tjek politikområder",
    description: "Se hvilke MEP'er der sidder i de 22 parlamentariske udvalg og hvilke sager de behandler. Se resultat af afstemninger fordelt på politikområder.",
    href: "/committee",
    color: "#adcdea",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
      </svg>
    )
  },
  {
    title: "Danske MEP'er vs. politisk gruppe",
    description: "Følg med i hvor ofte de 15 danske MEP'er stemmer imod flertallet i deres politiske gruppe i parlamentet. Se detaljer om hver afstemning.",
    href: "/mep-disagreements",
    color: "#e89b4f",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z"/>
      </svg>
    )
  },
  {
    title: "Partiers interne uenighed",
    description: "Tjek hvor ofte MEP'er fra samme nationale parti stemmer forskelligt. Gå på opdagelse i afstemningerne og find detaljer om alle uenigheder.",
    href: "/national-party-disagreements",
    color: "#f59e0b",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    )
  },
  {
    title: "Hyppigste vinder: Koalitioner",
    description: "Se hvilke politiske grupper der stemmer mest sammen i parlamentet - og hvor mange afstemninger hver koalition har vundet.",
    href: "/winning-coalitions",
    color: "#adcdea",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
      </svg>
    )
  },
  {
    title: "Hyppigste vinder: Politisk gruppe",
    description: "Viser hvor ofte hver af de politiske grupper er med i en vindende koalition. Se hvor mange sejre hver gruppe har. Mulighed for at filtrere efter politikområde.",
    href: "/group-wins",
    color: "#80d8a8",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
      </svg>
    )
  },
  {
    title: "Enighed mellem politiske grupper",
    description: "Kort over hvor ofte de politiske grupper stemmer ens. Der er mulighed for at filtrere efter politikområde.",
    href: "/heatmap",
    color: "#d97e4a",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3v8h8V3H3zm6 6H5V5h4v4zm-6 4v8h8v-8H3zm6 6H5v-4h4v4zm4-16v8h8V3h-8zm6 6h-4V5h4v4zm-6 4v8h8v-8h-8zm6 6h-4v-4h4v4z"/>
      </svg>
    )
  },
  {
    title: "Gruppe vs. gruppe",
    description: "Sammenlign de politiske grupper parvis. Se hvornår de stemmer ens og hvornår de er uenige. Se også detaljer for hver afstemning om hvordan der er stemt pr. gruppe og pr. land.",
    href: "/compare-groups",
    color: "#8b5cf6",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
      </svg>
    )
  },
  {
    title: "MEP vs. MEP",
    description: "Sammenlign to MEP'ers stemmemønster. Se hvornår de er enige og uenige. Se også detaljer for hver afstemning om, hvordan der er stemt pr. gruppe og pr. land.",
    href: "/compare-meps",
    color: "#ec4899",
    icon: (
      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    )
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 opacity-60"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-green-600 to-yellow-600">
            EU-bureauets Dataportal
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto">
            Få indsigt i hvordan Europa-Parlamentet stemmer
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href}>
              <Card className="group h-full p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-gray-300 relative overflow-hidden">
                {/* Background gradient on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                  style={{ backgroundColor: feature.color }}
                ></div>

                <div className="relative">
                  {/* Icon */}
                  <div
                    className="mb-4 transform group-hover:scale-110 transition-transform duration-300 inline-block p-4 rounded-2xl"
                    style={{ backgroundColor: `${feature.color}40`, color: feature.color }}
                  >
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h2>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-6 flex items-center text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition-all duration-300">
                    <span>Udforsk</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* News Carousel */}
        <NewsCarousel />

        {/* Additional Info Section */}
      </div>
    </div>
  );
}
