"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Calendar,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { getBarangayRiskAnalysis, BarangayRiskData } from '../riskanalysis/risk_actons';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BarangayRiskAnalysis() {
  const [riskData, setRiskData] = useState<BarangayRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState<BarangayRiskData | null>(null);
  const [lookbackDays, setLookbackDays] = useState(180);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const result = await getBarangayRiskAnalysis(lookbackDays);
      if (result.success && result.data) {
        setRiskData(result.data);
        toast.success(`Risk data loaded for ${result.data.length} barangays`);
      } else {
        toast.error('Could not load risk data. Please try again.');
      }
    } catch (error) {
      toast.error('Something went wrong while loading the risk analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const filteredData = riskData.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxRisk = Math.max(...riskData.map(b => b.totalRisk), 1);

  const getRiskLevel = (risk: number): { color: string; label: string } => {
    const percentage = (risk / maxRisk) * 100;
    if (percentage >= 75) return { color: 'bg-destructive dark:bg-red-500/80', label: 'Critical' };
    if (percentage >= 50) return { color: 'bg-orange-500 dark:bg-orange-500/80', label: 'High' };
    if (percentage >= 25) return { color: 'bg-amber-500 dark:bg-amber-500/80', label: 'Medium' };
    return { color: 'bg-green-500 dark:bg-green-500/80', label: 'Low' };
  };

  const HeatmapCell = ({ risk, maxRisk }: { risk: number; maxRisk: number }) => {
    if (risk === 0) {
      return <div className="w-full h-8 bg-muted rounded border border-border" />;
    }
    
    const percentage = (risk / maxRisk) * 100;
    let bgColor = 'bg-green-500/10 border-green-500/20';
    let textColor = 'text-green-700 dark:text-green-400';
    
    if (percentage >= 75) {
      bgColor = 'bg-red-500/10 border-red-500/30';
      textColor = 'text-red-700 dark:text-red-400';
    } else if (percentage >= 50) {
      bgColor = 'bg-orange-500/10 border-orange-500/30';
      textColor = 'text-orange-700 dark:text-orange-400';
    } else if (percentage >= 25) {
      bgColor = 'bg-amber-500/10 border-amber-500/30';
      textColor = 'text-amber-700 dark:text-amber-400';
    }

    return (
      <div 
        className={`w-full h-8 ${bgColor} rounded border flex items-center justify-center`}
        title={`Risk: ${risk.toFixed(1)}`}
      >
        <span className={`text-xs font-medium ${textColor}`}>
          {risk.toFixed(0)}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Barangay Risk Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Crime patterns and risk scores across {riskData.length} barangays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="30"
            max="365"
            value={lookbackDays}
            onChange={(e) => setLookbackDays(parseInt(e.target.value))}
            className="w-24"
            placeholder="Days"
          />
          <Button onClick={fetchRiskData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {riskData.filter(b => getRiskLevel(b.totalRisk).label === 'Critical').length}
                </div>
                <p className="text-xs text-muted-foreground">Critical Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {riskData.filter(b => getRiskLevel(b.totalRisk).label === 'High').length}
                </div>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {riskData.reduce((sum, b) => sum + b.crimeCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Crimes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{lookbackDays}</div>
                <p className="text-xs text-muted-foreground">Days Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hourly">Hourly Patterns</TabsTrigger>
          <TabsTrigger value="detailed">Detailed View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risk Rankings</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground/70" />
                  <Input
                    placeholder="Search barangay..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredData.slice(0, 50).map((barangay, index) => {
                  const riskLevel = getRiskLevel(barangay.totalRisk);
                  const percentage = (barangay.totalRisk / maxRisk) * 100;

                  return (
                    <div
                      key={barangay.name}
                      className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => setSelectedBarangay(barangay)}
                    >
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{barangay.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {barangay.crimeCount} crimes
                            </Badge>
                            <Badge className={`${riskLevel.color} text-white text-xs border-transparent`}>
                              {riskLevel.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${riskLevel.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            Risk Score: {barangay.totalRisk.toFixed(2)}
                          </span>
                          {barangay.topRiskHours.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Peak: {barangay.topRiskHours[0].day.slice(0, 3)} {barangay.topRiskHours[0].hour}:00
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Patterns Tab */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Crime Heatmap by Day & Hour</CardTitle>
              <CardDescription>
                Shows risk intensity across different days and times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="Search barangay..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                
                <div className="space-y-6 max-h-[700px] overflow-y-auto">
                  {filteredData.slice(0, 20).map((barangay) => {
                    const maxHourlyRisk = Math.max(
                      ...barangay.hourlyPatterns.flatMap(p => p.hours.map(h => h.risk)),
                      1
                    );

                    return (
                      <div key={barangay.name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{barangay.name}</h3>
                          <Badge className={`${getRiskLevel(barangay.totalRisk).color} text-white border-transparent`}>
                            Risk: {barangay.totalRisk.toFixed(1)}
                          </Badge>
                        </div>

                        {/* Heatmap Grid */}
                        <div className="overflow-x-auto">
                          <div className="inline-block min-w-full">
                            {/* Hour labels */}
                            <div className="flex gap-1 mb-1 ml-24">
                              {Array.from({ length: 24 }, (_, i) => (
                                <div key={i} className="w-10 text-center">
                                  <span className="text-xs text-muted-foreground">{i}</span>
                                </div>
                              ))}
                            </div>

                            {/* Day rows */}
                            {barangay.hourlyPatterns.map((pattern) => (
                              <div key={pattern.day} className="flex gap-1 mb-1">
                                <div className="w-24 flex items-center">
                                  <span className="text-sm font-medium">{pattern.day.slice(0, 3)}</span>
                                </div>
                                {pattern.hours.map((hourData) => (
                                  <div key={hourData.hour} className="w-10">
                                    <HeatmapCell risk={hourData.risk} maxRisk={maxHourlyRisk} />
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Top Risk Hours */}
                        {barangay.topRiskHours.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Peak Risk Times:</p>
                            <div className="flex flex-wrap gap-2">
                              {barangay.topRiskHours.slice(0, 5).map((peak, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {peak.day.slice(0, 3)} {peak.hour}:00 ({peak.risk.toFixed(1)})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="detailed">
          {selectedBarangay ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedBarangay.name} - Detailed Analysis</CardTitle>
                <CardDescription>
                  {selectedBarangay.crimeCount} crimes | Risk Score: {selectedBarangay.totalRisk.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Risk Breakdown by Day */}
                  {DAYS.map((day) => {
                    const dayPattern = selectedBarangay.hourlyPatterns.find(p => p.day === day);
                    if (!dayPattern) return null;

                    const dayTotal = dayPattern.hours.reduce((sum, h) => sum + h.risk, 0);
                    const peakHour = dayPattern.hours.reduce((max, h) => h.risk > max.risk ? h : max, dayPattern.hours[0]);

                    return (
                      <div key={day} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{day}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Total Risk: {dayTotal.toFixed(1)}
                            </span>
                            {peakHour.risk > 0 && (
                              <Badge variant="outline">
                                Peak: {peakHour.hour}:00 ({peakHour.risk.toFixed(1)})
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Hourly bar chart */}
                        <div className="space-y-1">
                          {dayPattern.hours.filter(h => h.risk > 0).map((hourData) => {
                            const percentage = dayTotal > 0 ? (hourData.risk / dayTotal) * 100 : 0;
                            const riskLevel = getRiskLevel(hourData.risk);

                            return (
                              <div key={hourData.hour} className="flex items-center gap-2">
                                <span className="text-xs w-12 text-muted-foreground">
                                  {hourData.hour.toString().padStart(2, '0')}:00
                                </span>
                                <div className="flex-1 bg-muted rounded-full h-6 relative">
                                  <div
                                    className={`h-6 rounded-full ${riskLevel.color} flex items-center px-2`}
                                    style={{ width: `${Math.max(percentage, 5)}%` }}
                                  >
                                    <span className="text-xs text-white font-medium">
                                      {hourData.risk.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground">Select a barangay from the Overview tab to see detailed analysis</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}