import React from 'react';
import { format, addDays } from 'date-fns';
import { Clock, RefreshCw, CheckCircle2, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentSkeletons';

interface HistoryViewProps {
    isLoadingHistory: boolean;
    historyWeeks: Date[];
    loadHistoryWeeks: () => void;
    handleViewHistory: (date: Date) => void;
    handleExportForDate: (date: Date, type: 'word' | 'excel') => void;
}

export function HistoryView({
    isLoadingHistory,
    historyWeeks,
    loadHistoryWeeks,
    handleViewHistory,
    handleExportForDate
}: HistoryViewProps) {
    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b flex justify-between items-center bg-muted/30/50">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Deployment History</h2>
                    <p className="text-sm text-muted-foreground">Archive of all past deployment plans</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistoryWeeks} disabled={isLoadingHistory}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} /> Refresh
                </Button>
            </div>

            {isLoadingHistory ? (
                <div className="p-8"><DeploymentTableSkeleton /></div>
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
                        {historyWeeks.map((weekStartDate) => (
                            <tr key={weekStartDate.toISOString()} className="hover:bg-muted/30/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {format(weekStartDate, 'MMM d')} - {format(addDays(weekStartDate, 6), 'MMM d, yyyy')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Week of {format(weekStartDate, 'MMMM d')}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className="bg-green-100 text-green-700 border-green-200">Finalized</Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleViewHistory(weekStartDate)}>View Plan</Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Download className="w-4 h-4 text-muted-foreground/70 hover:text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleExportForDate(weekStartDate, 'word')}>
                                                    <FileText className="w-4 h-4 mr-2" /> Export to Word
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleExportForDate(weekStartDate, 'excel')}>
                                                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
