import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, ChevronRight } from 'lucide-react';

interface HistoryViewProps {
    historyWeeks: Date[];
    isLoadingHistory: boolean;
    loadHistoryWeeks: () => void;
    onViewHistory: (date: Date) => void;
}

export function HistoryView({
    historyWeeks,
    isLoadingHistory,
    loadHistoryWeeks,
    onViewHistory
}: HistoryViewProps) {
    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-5 border-b border-border bg-muted/30/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Deployment History</h3>
                        <p className="text-sm text-muted-foreground mt-1">Select a past Hybrid plan to view its details</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={loadHistoryWeeks}
                        disabled={isLoadingHistory}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <div className="divide-y divide-border">
                    {isLoadingHistory ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand mb-4" />
                            Loading history...
                        </div>
                    ) : historyWeeks.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-muted-foreground/70" />
                            </div>
                            <h3 className="text-foreground font-medium text-lg">No History Found</h3>
                            <p className="text-muted-foreground text-sm mt-1">Saved Hybrid plans will appear here.</p>
                        </div>
                    ) : (
                        historyWeeks.map((date, idx) => (
                            <div
                                key={idx}
                                className="p-6 flex items-center justify-between hover:bg-brand/5 transition-colors group cursor-pointer"
                                onClick={() => onViewHistory(date)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-foreground group-hover:text-brand/90 transition-colors">
                                            Week of {format(date, 'MMMM d, yyyy')}
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Hybrid Deployment
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="text-brand opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
