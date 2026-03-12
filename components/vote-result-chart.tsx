"use client"

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface VoteResultChartProps {
  forVotes: number;
  againstVotes: number;
  abstentionVotes: number;
}

export function VoteResultChart({ forVotes, againstVotes, abstentionVotes }: VoteResultChartProps) {
  const total = forVotes + againstVotes + abstentionVotes;
  
  // Find majority vote
  const votes = [
    { label: 'For', count: forVotes },
    { label: 'Imod', count: againstVotes },
    { label: 'Undlod', count: abstentionVotes }
  ];
  
  const majority = votes.reduce((max, vote) => vote.count > max.count ? vote : max, votes[0]);
  const majorityPercentage = total > 0 ? ((majority.count / total) * 100).toFixed(1) : '0.0';

  const data = {
    labels: ['For', 'Undlod', 'Imod'],
    datasets: [
      {
        data: [forVotes, abstentionVotes, againstVotes],
        backgroundColor: [
          '#00CC00', // Green for "For"
          '#FFCC00', // Orange for "Abstention"
          '#FF0000', // Red for "Against"
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'doughnut'>) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="relative">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-center">
          {majorityPercentage}% stemte {majority.label.toLowerCase()}
        </h3>
      </div>
      <div className="w-full max-w-[200px] mx-auto">
        <Doughnut data={data} options={options} />
      </div>
      <div className="mt-3 flex justify-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00CC00' }}></div>
          <span>{forVotes}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFCC00' }}></div>
          <span>{abstentionVotes}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF0000' }}></div>
          <span>{againstVotes}</span>
        </div>
      </div>
    </div>
  );
}
