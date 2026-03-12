"use client"

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { MEPData } from "@/types/data";

interface MEPsOverviewProps {
  data: MEPData[];
}

// EU Parliamentary group colors
const GROUP_COLORS: { [key: string]: string } = {
  "PPE": "#3399FF",
  "S&D": "#FF0000",
  "Renew": "#FFCC00",
  "Verts/ALE": "#00CC00",
  "ECR": "#0066CC",
  "The Left": "#990000",
  "ESN": "#000066",
  "PfE": "#006699",
  "Greens/EFA": "#00CC00",
  "PPE-DE": "#3399FF",
  "AfD": "#000066",
  "NI": "#999999"
};

// Country name mapping for display
const COUNTRY_NAMES: { [key: string]: string } = {
  "AUT": "Østrig",
  "BEL": "Belgien",
  "BGR": "Bulgarien",
  "HRV": "Kroatien",
  "CYP": "Cypern",
  "CZE": "Tjekkiet",
  "DNK": "Danmark",
  "EST": "Estland",
  "FIN": "Finland",
  "FRA": "Frankrig",
  "DEU": "Tyskland",
  "GRC": "Grækenland",
  "HUN": "Ungarn",
  "IRL": "Irland",
  "ITA": "Italien",
  "LVA": "Letland",
  "LTU": "Litauen",
  "LUX": "Luxembourg",
  "MLT": "Malta",
  "NLD": "Holland",
  "POL": "Polen",
  "PRT": "Portugal",
  "ROU": "Rumænien",
  "SVK": "Slovakiet",
  "SVN": "Slovenien",
  "ESP": "Spanien",
  "SWE": "Sverige"
};

// Extract country code from URL
const extractCountryCode = (countryUrl: string): string => {
  const match = countryUrl.match(/country\/([A-Z]{3})$/);
  return match ? match[1] : countryUrl;
};

export function MEPsOverview({ data }: MEPsOverviewProps) {
  const [groupBy, setGroupBy] = useState<'country' | 'party'>('country');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Process and group data
  const { groupedData, filterOptions } = useMemo(() => {
    // Filter by search term
    const filteredData = data.filter(mep =>
      mep.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep.national_party_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mep.current_group_id?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (groupBy === 'country') {
      const grouped = new Map<string, MEPData[]>();
      filteredData.forEach(mep => {
        const countryCode = extractCountryCode(mep.country_code);
        if (!grouped.has(countryCode)) {
          grouped.set(countryCode, []);
        }
        grouped.get(countryCode)!.push(mep);
      });

      // Sort by country name - Denmark first, then alphabetically
      const sortedGrouped = Array.from(grouped.entries())
        .sort(([a], [b]) => {
          // Denmark always comes first
          if (a === 'DNK') return -1;
          if (b === 'DNK') return 1;
          // All others alphabetically
          return (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b);
        });

      // Get unique countries for filter
      const options = sortedGrouped.map(([code]) => ({
        value: code,
        label: COUNTRY_NAMES[code] || code
      }));

      // Filter by selected country if not 'all'
      const finalGrouped = selectedFilter === 'all'
        ? sortedGrouped
        : sortedGrouped.filter(([code]) => code === selectedFilter);

      return {
        groupedData: finalGrouped,
        filterOptions: options
      };
    } else {
      // Group by party - but organize by country first
      const grouped = new Map<string, MEPData[]>();
      filteredData.forEach(mep => {
        const countryCode = extractCountryCode(mep.country_code);
        if (!grouped.has(countryCode)) {
          grouped.set(countryCode, []);
        }
        grouped.get(countryCode)!.push(mep);
      });

      // Sort by country - Denmark first, then alphabetically
      const sortedGrouped = Array.from(grouped.entries())
        .sort(([a], [b]) => {
          // Denmark always comes first
          if (a === 'DNK') return -1;
          if (b === 'DNK') return 1;
          // All others alphabetically
          return (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b);
        });

      // Get parties grouped by country for filter
      const partiesByCountry = new Map<string, Set<string>>();
      filteredData.forEach(mep => {
        const countryCode = extractCountryCode(mep.country_code);
        const partyName = mep.national_party_id?.name || "Ukendt parti";
        if (!partiesByCountry.has(countryCode)) {
          partiesByCountry.set(countryCode, new Set());
        }
        partiesByCountry.get(countryCode)!.add(partyName);
      });

      // Sort countries - Denmark first, then alphabetically
      const sortedCountries = Array.from(partiesByCountry.entries())
        .sort(([a], [b]) => {
          if (a === 'DNK') return -1;
          if (b === 'DNK') return 1;
          return (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b);
        });

      // Build grouped options
      const options = sortedCountries.map(([countryCode, parties]) => ({
        country: countryCode,
        countryName: COUNTRY_NAMES[countryCode] || countryCode,
        parties: Array.from(parties).sort()
      }));

      // Filter by selected party if not 'all'
      const finalGrouped = selectedFilter === 'all'
        ? sortedGrouped
        : sortedGrouped
            .map(([country, meps]) => [
              country,
              meps.filter(mep => (mep.national_party_id?.name || "Ukendt parti") === selectedFilter)
            ] as [string, MEPData[]])
            .filter(([, meps]) => meps.length > 0);

      return {
        groupedData: finalGrouped,
        filterOptions: options
      };
    }
  }, [data, groupBy, searchTerm, selectedFilter]);

  // Calculate total MEPs shown
  const totalShown = groupedData.reduce((sum, [, meps]) => sum + meps.length, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Grouping selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Gruppér efter:</label>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as 'country' | 'party');
                setSelectedFilter('all');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="country">Land</option>
              <option value="party">Nationalt parti</option>
            </select>
          </div>

          {/* Filter selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Filtrer:</label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle ({data.length})</option>
              {groupBy === 'party' ? (
                // When grouped by party, show countries with their parties
                (filterOptions as Array<{ country: string; countryName: string; parties: string[] }>).map((countryGroup) => (
                  <optgroup key={countryGroup.country} label={countryGroup.countryName}>
                    {countryGroup.parties.map((party: string) => (
                      <option key={`${countryGroup.country}-${party}`} value={party}>
                        {party}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                // When grouped by country, show flat list
                (filterOptions as Array<{ value: string; label: string }>).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Søg:</label>
            <input
              type="text"
              placeholder="Søg efter navn, parti eller gruppe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Viser {totalShown} af {data.length} medlemmer
        </div>
      </Card>

      {/* Grouped MEPs */}
      {groupedData.map(([groupKey, meps]) => (
        <Card key={groupKey} className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {COUNTRY_NAMES[groupKey] || groupKey}
            <span className="text-gray-500 ml-2 text-base font-normal">({meps.length} medlemmer)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meps
              .sort((a, b) => {
                // When grouped by party, sort by party name first, then by MEP name
                if (groupBy === 'party') {
                  const partyA = a.national_party_id?.name || "Ukendt parti";
                  const partyB = b.national_party_id?.name || "Ukendt parti";
                  const partyCompare = partyA.localeCompare(partyB);
                  if (partyCompare !== 0) return partyCompare;
                }
                return a.full_name.localeCompare(b.full_name);
              })
              .map((mep) => (
                <Link
                  key={mep.mep_id}
                  href={`/mep?id=${mep.mep_id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white block"
                >
                  <div className="flex items-start gap-3">
                    {/* Photo */}
                    <img
                      src={mep.photo_url}
                      alt={mep.full_name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50" y="50" text-anchor="middle" dy=".3em" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
                      }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">{mep.full_name}</h3>

                      {/* EU Group */}
                      <div className="flex items-center gap-1 mb-1">
                        <div
                          className="w-3 h-3 rounded border border-white"
                          style={{ backgroundColor: GROUP_COLORS[mep.current_group_id?.code || ''] || '#999999' }}
                          title={mep.current_group_id?.name || 'Ukendt gruppe'}
                        />
                        <span className="text-xs text-gray-600 truncate">
                          {mep.current_group_id?.code || 'Ukendt'}
                        </span>
                      </div>

                      {/* National party */}
                      <div className="text-xs text-gray-600 mb-2 truncate" title={mep.national_party_id?.name || "Ukendt parti"}>
                        {mep.national_party_id?.name || "Ukendt parti"}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="text-gray-500">Stemmer:</span>
                          <span className="font-semibold ml-1">{mep.n_votes}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Deltagelse:</span>
                          <span className="font-semibold ml-1">{mep.participation_pct}%</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Gruppe-loyalitet:</span>
                          <span className="font-semibold ml-1">{mep.group_loyalty}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </Card>
      ))}

      {groupedData.length === 0 && (
        <Card className="p-6">
          <p className="text-gray-600 text-center">Ingen medlemmer fundet med de valgte filtre</p>
        </Card>
      )}
    </div>
  );
}
