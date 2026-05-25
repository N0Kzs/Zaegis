import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface ConfigDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    shiftPattern: number;
    setShiftPattern: (val: 8 | 12) => void;
    ignoreSchedule: boolean;
    setIgnoreSchedule: (val: boolean) => void;
    isReadOnly: boolean;
}

export function ConfigDialog({
    isOpen,
    onOpenChange,
    shiftPattern,
    setShiftPattern,
    ignoreSchedule,
    setIgnoreSchedule,
    isReadOnly
}: ConfigDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Schedule Configuration</DialogTitle>
                    <DialogDescription>Adjust parameters for schedule generation.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Shift Pattern</Label>
                        <Select value={shiftPattern.toString()} onValueChange={(v) => setShiftPattern(parseInt(v) as 8 | 12)} disabled={isReadOnly}>
                            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12">12 Hours (2 shifts/day)</SelectItem>
                                <SelectItem value="8">8 Hours (3 shifts/day)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Ignore Duty Schedule</Label>
                            <p className="text-xs text-muted-foreground">Allow personnel regardless of their duty schedule</p>
                        </div>
                        <Checkbox checked={ignoreSchedule} onCheckedChange={(c) => setIgnoreSchedule(!!c)} disabled={isReadOnly} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
