"use client";

import React, { Suspense } from "react";
import { CoalitionChordDiagram } from "@/components/coalition-chord-diagram";

function CoalitionsContent() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 inline sm:block">
          Koalitioner og alliancer
        </h1>
        <p className="text-gray-600 mt-1 max-w-4xl leading-snug text-sm sm:text-base">
          Udforsk hvilke politiske grupper der oftest stemmer sammen — og hvordan alliancerne skifter fra emne til emne. Båndene viser styrken af samarbejdet.
        </p>
      </div>
      <CoalitionChordDiagram />
    </div>
  );
}

export default function ThemeWinningCoalitionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        }
      >
        <CoalitionsContent />
      </Suspense>
    </div>
  );
}
