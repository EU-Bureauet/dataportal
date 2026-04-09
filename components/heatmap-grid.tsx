"use client"

import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { PairwiseCoalition } from "@/types/data";

interface HeatmapGridProps {
  data: PairwiseCoalition[];
  filterComponent?: React.ReactNode;
}

// Labels for rows and columns - using the 8 groups
const groupLabels = ['PPE', 'S&D', 'Renew', 'Verts/ALE', 'ECR', 'The Left', 'ESN', 'PfE'];

// Build matrix from pairwise data
const buildMatrixFromPairwise = (pairwiseData: PairwiseCoalition[]): number[][] => {
  const matrix: number[][] = Array(8).fill(0).map(() => Array(8).fill(0));

  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  pairwiseData.forEach(item => {
    const [group1, group2] = item["Group Pair"];
    const key = `${group1}-${group2}`;
    const reverseKey = `${group2}-${group1}`;
    dataMap.set(key, item.Percentage);
    dataMap.set(reverseKey, item.Percentage);
  });

  // Fill the matrix
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (i === j) {
        // Diagonal - same group always agrees with itself
        matrix[i][j] = 100;
      } else {
        const key = `${groupLabels[i]}-${groupLabels[j]}`;
        matrix[i][j] = dataMap.get(key) || 0;
      }
    }
  }

  return matrix;
};

// Get color based on value (0-100)
const getColor = (value: number): string => {
  // Use theme colors: #80d8a8 (green), #ffff80 (yellow), #adcdea (blue)

  if (value >= 80) {
    return '#80d8a8'; // Strong green
  } else if (value >= 60) {
    return '#a8e0b8'; // Medium green
  } else if (value >= 40) {
    return '#ffff80'; // Yellow
  } else if (value >= 20) {
    return '#ffd9a8'; // Light orange
  } else {
    return '#adcdea'; // Blue
  }
};

// Get text color based on background brightness
const getTextColor = (_bgColor: string): string => {
  return '#1f2937'; // dark gray for all
};

export function HeatmapGrid({ data: pairwiseData, filterComponent }: HeatmapGridProps) {
  const matrixData = React.useMemo(() => buildMatrixFromPairwise(pairwiseData), [pairwiseData]);
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Statistik</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Gennemsnitlig enighed</div>
            <div className="text-2xl font-bold" style={{ color: '#80d8a8' }}>
              {Math.round(matrixData.flat().reduce((a, b) => a + b, 0) / 64)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Laveste enighed</div>
            <div className="text-2xl font-bold" style={{ color: '#adcdea' }}>
              {Math.min(...matrixData.flat())}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Højeste enighed</div>
            <div className="text-2xl font-bold" style={{ color: '#80d8a8' }}>
              {Math.max(...matrixData.flat())}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Median enighed</div>
            <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
              {(() => {
                const sorted = [...matrixData.flat()].sort((a, b) => a - b);
                return sorted[32];
              })()}%
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Component */}
      {filterComponent}

      {/* Heatmap grid */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Enighed mellem Grupper</h2>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Column headers */}
            <div className="flex mb-2">
              <div className="w-24 flex-shrink-0"></div>
              {groupLabels.map((label, index) => (
                <div
                  key={index}
                  className="w-20 flex-shrink-0 text-center text-sm font-semibold text-gray-700 px-1"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {matrixData.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center mb-1">
                {/* Row label */}
                <div className="w-24 flex-shrink-0 text-right pr-4 text-sm font-semibold text-gray-700">
                  {groupLabels[rowIndex]}
                </div>

                {/* Row cells */}
                {row.map((value, colIndex) => (
                  <div
                    key={colIndex}
                    className="w-20 h-20 flex-shrink-0 flex items-center justify-center relative cursor-pointer transition-all hover:scale-110 hover:z-10 hover:shadow-lg mx-0.5"
                    style={{
                      backgroundColor: getColor(value),
                      color: getTextColor(getColor(value)),
                    }}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <span className="font-bold text-lg">{value}</span>

                    {/* Tooltip */}
                    {hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg whitespace-nowrap z-20">
                        <div className="font-semibold">{groupLabels[rowIndex]} × {groupLabels[colIndex]}</div>
                        <div>Enighed: {value}%</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Color scale legend */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Farveskala</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lav</span>
          <div className="flex-1 flex h-8 rounded overflow-hidden border border-gray-300">
            <div className="flex-1" style={{ backgroundColor: '#adcdea' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#ffd9a8' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#ffff80' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#a8e0b8' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#80d8a8' }}></div>
          </div>
          <span className="text-sm text-gray-600">Høj</span>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0-20</span>
          <span>20-40</span>
          <span>40-60</span>
          <span>60-80</span>
          <span>80-100</span>
        </div>
      </Card>
    </div>
  );
}
