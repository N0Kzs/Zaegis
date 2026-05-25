"use client";

import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeeklyStats } from "../utils";

function WorkloadIndicator({ status }: { status: 'balanced' | 'unbalanced' | 'critical' }) {
    const config = {
        balanced: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/15', label: 'Balanced' },
        unbalanced: { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/15', label: 'Unbalanced' },
        critical: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/15', label: 'Critical' }
    };

    const { icon: Icon, color, bg, label } = config[status];

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
            <span className={`text-sm font-medium ${color}`}>{label}</span>
        </div>
    );
}

interface UtilizationPanelProps {
    weeklyStats: WeeklyStats;
    personnelCount: number;
    workloadBalance: 'balanced' | 'unbalanced' | 'critical';
}

export function UtilizationPanel({ weeklyStats, personnelCount, workloadBalance }: UtilizationPanelProps) {
    return (
        <Card className="border-none shadow-sm ring-1 ring-border overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="bg-muted/30/50 pb-4 border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">Personnel Utilization</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                        {weeklyStats.personnelUtilization.filter(p => p.hours > 0).length} of {personnelCount} personnel deployed • avg {weeklyStats.avgTeamSize.toFixed(1)} per shift
                    </CardDescription>
                </div>
                <WorkloadIndicator status={workloadBalance} />
            </CardHeader>
            {weeklyStats.personnelUtilization.filter(p => p.hours > 0).length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No active shifts for this week</p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {weeklyStats.personnelUtilization
                        .filter(p => p.hours > 0)
                        .sort((a, b) => b.hours - a.hours)
                        .map(p => (
                            <div key={p.id} className="px-6 py-3 hover:bg-muted/30/60 transition-colors">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-medium text-foreground/90 truncate max-w-[240px]" title={p.name}>{p.name}</span>
                                    <div className="flex items-center gap-2">
                                        {p.status !== 'balanced' && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === 'overworked' 
                                                ? 'bg-destructive/15 text-destructive' 
                                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                }`}>
                                                {p.status === 'overworked' ? 'Overworked' : 'Underutilized'}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono font-semibold text-foreground/80 w-10 text-right">{p.hours.toFixed(0)}h</span>
                                    </div>
                                </div>
                                <Progress
                                    value={(p.hours / 48) * 100}
                                    className="h-1.5"
                                    indicatorClassName={p.status === 'overworked' ? 'bg-destructive' : 'bg-brand'}
                                />
                            </div>
                        ))}
                </div>
            )}
        </Card>
    );
}
