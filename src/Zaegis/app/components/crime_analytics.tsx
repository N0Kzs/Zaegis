"use client"

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';

// TypeScript Interfaces
export interface CrimePattern {
  day: string;
  time: string;
  location: string;
  frequency: number;
  coordinates?: { lat: number; lng: number } | null;
  common_offenses?: { [key: string]: number };
}

export interface CrimeStatistics {
  total_crimes: number;
  time_distribution: { [key: string]: number };
  day_distribution: { [key: string]: number };
}

// Combined interface for props
export interface CrimeAnalyticsData {
  patterns: CrimePattern[];
  statistics: CrimeStatistics;
}

interface CrimeAnalyticsProps extends CrimeAnalyticsData {}

interface ChartDataItem {
  [key: string]: string | number;
}

export default function CrimeAnalytics({ patterns, statistics }: CrimeAnalyticsProps) {
  // Guard clauses for props
  if (!patterns || !statistics) {
    return (
      <div className="p-6 border border-yellow-400/50 rounded-md bg-yellow-400/10 text-yellow-700 dark:text-yellow-300">
        <p>Crime analytics data is not available or is incomplete.</p>
      </div>
    );
  }
  
  // Enhanced chart data formatting with better error handling
  const formatChartData = (
    distributionObject: { [key: string]: number } | undefined | null, 
    keyName: string
  ): ChartDataItem[] => {
    if (!distributionObject || typeof distributionObject !== 'object' || distributionObject === null) {
      return []; 
    }
    
    return Object.entries(distributionObject)
      .filter(([_, count]) => count > 0) // Filter out zero counts
      .map(([itemKey, count]) => ({
        [keyName]: itemKey,
        count: Number(count) || 0,
      }))
      .sort((a, b) => {
        // Sort time data chronologically, day data by day order
        if (keyName === 'time') {
          return a[keyName].toString().localeCompare(b[keyName].toString());
        } else if (keyName === 'day') {
          const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const aIndex = dayOrder.indexOf(a[keyName].toString());
          const bIndex = dayOrder.indexOf(b[keyName].toString());
          return aIndex - bIndex;
        }
        return 0;
      });
  };

  const timeChartData = formatChartData(statistics.time_distribution, 'time');
  const dayChartData = formatChartData(statistics.day_distribution, 'day');

  // Find peak hours and days for insights
  const peakHour = timeChartData.reduce((max, item) => 
    (item.count as number) > (max.count as number) ? item : max, 
    { time: 'N/A', count: 0 }
  );
  
  const peakDay = dayChartData.reduce((max, item) => 
    (item.count as number) > (max.count as number) ? item : max, 
    { day: 'N/A', count: 0 }
  );

  return (
    <div className="space-y-6 mt-6">
      <Card>
            <CardHeader>
              <CardTitle>Time of Day Distribution</CardTitle>
              <CardDescription>Crime incidents by hour of the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                {timeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeChartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="time" 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                        interval={0}
                        fontSize={12}
                      />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip 
                        formatter={(value: any) => [value, 'Incidents']}
                        labelFormatter={(label: any) => `Time: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#8884d8" 
                        name="Incidents"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No time distribution data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Day of Week Distribution</CardTitle>
              <CardDescription>Crime incidents by day of the week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px]">
                {dayChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayChartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis allowDecimals={false} fontSize={12} />
                      <Tooltip 
                        formatter={(value: any) => [value, 'Incidents']}
                        labelFormatter={(label: any) => `Day: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="count" 
                        fill="#82ca9d" 
                        name="Incidents"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No day distribution data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
    </div>
  );
}