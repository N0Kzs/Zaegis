import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UtilizationViewProps {
    officerStats: {
        id: number;
        name: string;
        role: string;
        shifts: number;
        hours: number;
    }[];
}

export function UtilizationView({ officerStats }: UtilizationViewProps) {
    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-200">
            <div className="bg-muted/30/50 px-6 py-4 border-b">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Personnel Utilization</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{officerStats.length} personnel deployed this week</p>
            </div>

            {officerStats.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No active shifts for this week</p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {officerStats.map(stat => (
                        <div key={stat.id} className="px-6 py-3 hover:bg-muted/30/60 transition-colors">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0 bg-brand" />
                                    <div>
                                        <span className="text-sm font-medium text-foreground/90">{stat.name}</span>
                                        <span className="text-xs ml-2 font-medium text-brand">
                                            {stat.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] bg-brand/10 text-brand border-brand/20">
                                        {stat.shifts} shifts
                                    </Badge>
                                    <span className="text-xs font-mono font-semibold text-foreground/80 w-10 text-right">
                                        {stat.hours}h
                                    </span>
                                </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full ${stat.hours > 40 ? 'bg-red-500' : 'bg-brand'}`}
                                    style={{ width: `${Math.min((stat.hours / 48) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
