"use client";

import { Clock, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentPageSkeleton';
import { downloadDeploymentPlan } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryViewProps {
    isLoadingHistory: boolean;
    historyWeeks: string[];
    fetchHistoryWeeks: () => void;
    handleViewHistory: (date: string) => void;
}

export function HistoryView({
    isLoadingHistory,
    historyWeeks,
    fetchHistoryWeeks,
    handleViewHistory,
}: HistoryViewProps) {
    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b flex justify-between items-center bg-muted/30/50">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Deployment History</h2>
                    <p className="text-sm text-muted-foreground">Archive of all past deployment plans</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHistoryWeeks} disabled={isLoadingHistory}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {isLoadingHistory ? (
                <div className="p-0">
                    <DeploymentTableSkeleton />
                </div>
            ) : historyWeeks.length === 0 ? (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-foreground font-medium mb-1">No saved history</h3>
                    <p className="text-sm text-muted-foreground">Saved deployment plans will appear here.</p>
                </div>
            ) : (
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">Week Period</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {historyWeeks.map((weekStart) => (
                            <tr key={weekStart} className="hover:bg-muted/50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-brand">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {format(new Date(weekStart), 'MMM d')} - {format(addDays(new Date(weekStart), 6), 'MMM d, yyyy')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Week of {format(new Date(weekStart), 'MMMM d')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
                                        Saved & Locked
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewHistory(weekStart)}
                                            className="text-brand hover:text-brand/80 hover:bg-brand/10"
                                        >
                                            View Plan
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                                try {
                                                    await downloadDeploymentPlan(weekStart);
                                                    toast.success("Your file is being downloaded.");
                                                } catch (error) {
                                                    toast.error("Download failed. Please try again.");
                                                }
                                            }}
                                        >
                                            <Download className="w-4 h-4 text-muted-foreground/70 hover:text-muted-foreground" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
