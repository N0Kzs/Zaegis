import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StatsSummaryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    officerStats: {
        id: string | number;
        name: string;
        role: string;
        position: string;
        shifts: number;
        hours: number;
    }[];
}

export function StatsSummaryDialog({
    isOpen,
    onOpenChange,
    officerStats
}: StatsSummaryDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Weekly Officer Hours Summary</DialogTitle>
                    <DialogDescription>Total shifts and hours for all personnel this week.</DialogDescription>
                </DialogHeader>
                <div className="border rounded-md mt-4 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground uppercase border-b">
                            <tr>
                                <th className="px-4 py-3">Officer</th>
                                <th className="px-4 py-3">Role / Position</th>
                                <th className="px-4 py-3 text-center">Shifts</th>
                                <th className="px-4 py-3 text-right">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {officerStats.map(stat => (
                                <tr key={stat.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-2 font-medium text-foreground">{stat.name}</td>
                                    <td className="px-4 py-2 text-muted-foreground text-xs">{stat.role} / {stat.position}</td>
                                    <td className="px-4 py-2 text-center">
                                        <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20">{stat.shifts}</Badge>
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-foreground/80">{stat.hours}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <DialogFooter className="mt-4">
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
