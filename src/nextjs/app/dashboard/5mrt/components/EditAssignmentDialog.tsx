import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw } from 'lucide-react';

import type { ProposedSchedule, PersonnelWithRelations } from '@/lib/optimization/5mrt-optimization';

interface EditAssignmentDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingTeam: ProposedSchedule | null;
    allPersonnelPool: PersonnelWithRelations[];
    allBarangays: string[];
    onToggleOfficer: (person: PersonnelWithRelations) => void;
    onToggleBarangay: (barangay: string) => void;
    onResetLocation: () => void;
    onSave: () => void;
}

export function EditAssignmentDialog({
    isOpen,
    onOpenChange,
    editingTeam,
    allPersonnelPool,
    allBarangays,
    onToggleOfficer,
    onToggleBarangay,
    onResetLocation,
    onSave
}: EditAssignmentDialogProps) {
    if (!editingTeam) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Assignment</DialogTitle>
                    <DialogDescription>Modify personnel or location for this shift.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <Label>Patrol Unit</Label>
                            <div className="p-2 bg-muted rounded border mt-1 font-medium">{editingTeam.vehicleName}</div>
                        </div>
                        <div>
                            <Label>Target Location</Label>
                            <div className="flex gap-2 mt-1">
                                <Input value={`${editingTeam.lat.toFixed(6)}, ${editingTeam.lng.toFixed(6)}`} readOnly />
                                <Button variant="outline" size="icon" onClick={onResetLocation} title="Reset to original"><RotateCcw className="w-4 h-4" /></Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Drag the marker on the map to adjust.</p>
                        </div>
                        <div>
                            <Label>Assigned Personnel ({editingTeam.assignedPersonnel.length})</Label>
                            <ScrollArea className="h-[200px] border rounded-md mt-1 p-2">
                                {allPersonnelPool.map(p => {
                                    const isAssigned = editingTeam.assignedPersonnel.some(ap => ap.id === p.id);
                                    return (
                                        <div key={p.id} className="flex items-center space-x-2 py-1 hover:bg-muted/30 rounded px-1">
                                            <Checkbox id={`p-${p.id}`} checked={isAssigned} onCheckedChange={() => onToggleOfficer(p)} />
                                            <label htmlFor={`p-${p.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                                                {p.name} <span className="text-xs text-muted-foreground/70">({p.role.name})</span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </ScrollArea>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label>Coverage Areas</Label>
                            <ScrollArea className="h-[300px] border rounded-md mt-1 p-2">
                                {Array.from(new Set(allBarangays)).map(b => {
                                    const isCovered = editingTeam.coverageAreas.includes(b);
                                    return (
                                        <div key={b} className="flex items-center space-x-2 py-1 hover:bg-muted/30 rounded px-1">
                                            <Checkbox id={`b-${b}`} checked={isCovered} onCheckedChange={() => onToggleBarangay(b)} />
                                            <label htmlFor={`b-${b}`} className="text-sm cursor-pointer flex-1">{b}</label>
                                        </div>
                                    );
                                })}
                            </ScrollArea>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onSave} className="bg-brand hover:bg-brand/90 text-brand-foreground">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
