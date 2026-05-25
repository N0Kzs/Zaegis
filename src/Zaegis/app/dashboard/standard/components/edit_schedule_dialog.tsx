"use client";

import { Save } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input, PatrolSchedule, PatrolCar, Personnel, convertTimeToMinutes } from "../utils";

interface EditScheduleDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingSchedule: PatrolSchedule | null;
    setEditingSchedule: (s: PatrolSchedule) => void;
    editingTimeSlot: { start: string; end: string } | null;
    setEditingTimeSlot: (ts: { start: string; end: string } | null) => void;
    timeSlotValidation: { hasConflict: boolean; message?: string } | null;
    patrolCars: PatrolCar[];
    filteredPersonnel: Personnel[];
    unavailablePersonnel: (Personnel & { unavailabilityReason: string | null })[];
    selectedPersonnel: string[];
    setSelectedPersonnel: (fn: (prev: string[]) => string[]) => void;
    searchPersonnel: string;
    setSearchPersonnel: (s: string) => void;
    selectedAreas: string[];
    setSelectedAreas: (fn: (prev: string[]) => string[]) => void;
    filteredAreas: string[];
    searchAreas: string;
    setSearchAreas: (s: string) => void;
    schedules: PatrolSchedule[];
    onSave: () => void;
}

export function EditScheduleDialog({
    isOpen,
    onOpenChange,
    editingSchedule,
    setEditingSchedule,
    editingTimeSlot,
    setEditingTimeSlot,
    timeSlotValidation,
    patrolCars,
    filteredPersonnel,
    unavailablePersonnel,
    selectedPersonnel,
    setSelectedPersonnel,
    searchPersonnel,
    setSearchPersonnel,
    selectedAreas,
    setSelectedAreas,
    filteredAreas,
    searchAreas,
    setSearchAreas,
    schedules,
    onSave,
}: EditScheduleDialogProps) {
    if (!editingSchedule) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl flex flex-col max-h-[90vh] overflow-hidden p-0">
                {/* Fixed header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle className="text-xl">
                        Edit — {format(new Date(editingSchedule.date), 'EEE, MMM d')} · {editingSchedule.timeSlot}
                    </DialogTitle>
                </DialogHeader>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            {/* Time Slot */}
                            <div>
                                <Label>Time Slot</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        value={editingTimeSlot?.start || editingSchedule.timeSlot.split(' - ')[0] || '00:00'}
                                        onChange={(e) => {
                                            const parts = editingSchedule.timeSlot.split(' - ');
                                            setEditingTimeSlot({
                                                start: e.target.value,
                                                end: editingTimeSlot?.end || parts[1] || '00:00'
                                            });
                                        }}
                                        className="flex-1"
                                    />
                                    <span className="text-muted-foreground/70">-</span>
                                    <Input
                                        type="time"
                                        value={editingTimeSlot?.end || editingSchedule.timeSlot.split(' - ')[1] || '00:00'}
                                        onChange={(e) => {
                                            const parts = editingSchedule.timeSlot.split(' - ');
                                            setEditingTimeSlot({
                                                start: editingTimeSlot?.start || parts[0] || '00:00',
                                                end: e.target.value
                                            });
                                        }}
                                        className="flex-1"
                                    />
                                </div>
                                {timeSlotValidation?.hasConflict && (
                                    <p className="text-destructive text-sm mt-1">{timeSlotValidation.message}</p>
                                )}
                            </div>

                            {/* Patrol Car */}
                            <div>
                                <Label>Patrol Car</Label>
                                <Select
                                    value={editingSchedule.patrolCar || ''}
                                    onValueChange={(value) => {
                                        setEditingSchedule({ ...editingSchedule, patrolCar: value });
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select patrol car">
                                            {editingSchedule.patrolCar || "Select patrol car"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patrolCars.map((car) => (
                                            <SelectItem key={car.id} value={car.name}>
                                                {car.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Personnel */}
                            <div>
                                <Label>Personnel</Label>
                                <div className="border rounded-lg p-4 space-y-3">
                                    <Input
                                        placeholder="Search personnel..."
                                        value={searchPersonnel}
                                        onChange={(e) => setSearchPersonnel(e.target.value)}
                                    />
                                    <div className="h-48 overflow-y-auto space-y-2">
                                        {filteredPersonnel.map((person) => {
                                            const draftHours = schedules
                                                .filter(s => s.personnel.some(p => p.id === person.id))
                                                .reduce((sum, s) => {
                                                    const hours = convertTimeToMinutes(s.timeSlot.split(' - ')[1]) -
                                                        convertTimeToMinutes(s.timeSlot.split(' - ')[0]);
                                                    return sum + (hours / 60);
                                                }, 0);

                                            return (
                                                <label key={person.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPersonnel.includes(person.id)}
                                                        onChange={(e) => {
                                                            setSelectedPersonnel(prev => {
                                                                if (e.target.checked) {
                                                                    return [...prev, person.id];
                                                                } else {
                                                                    return prev.filter(id => id !== person.id);
                                                                }
                                                            });
                                                        }}
                                                        className="rounded border-border"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium">{person.name}</span>
                                                        {draftHours > 0 && (
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                {draftHours.toFixed(1)}h this week
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}

                                        {unavailablePersonnel.length > 0 && (
                                            <>
                                                <div className="border-t pt-2 mt-2">
                                                    <span className="text-xs text-muted-foreground font-medium">Unavailable</span>
                                                </div>
                                                {unavailablePersonnel.map((person) => (
                                                    <div key={person.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded opacity-60">
                                                        <input
                                                            type="checkbox"
                                                            disabled
                                                            className="rounded border-border"
                                                        />
                                                        <div className="flex-1">
                                                            <span className="text-sm text-muted-foreground">{person.name}</span>
                                                            <span className="text-xs text-destructive ml-2">
                                                                {person.unavailabilityReason}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Selected: {selectedPersonnel.length}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Areas */}
                        <div>
                            <Label>Areas</Label>
                            <div className="border rounded-lg p-4 space-y-3">
                                <Input
                                    placeholder="Search areas..."
                                    value={searchAreas}
                                    onChange={(e) => setSearchAreas(e.target.value)}
                                />
                                <div className="h-48 overflow-y-auto space-y-2">
                                    {filteredAreas.map((area) => {
                                        const isChecked = selectedAreas.some(a => a.toLowerCase() === area.toLowerCase());
                                        return (
                                            <label key={area} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        setSelectedAreas(prev => {
                                                            if (e.target.checked) {
                                                                return [...prev, area];
                                                            } else {
                                                                return prev.filter(a => a.toLowerCase() !== area.toLowerCase());
                                                            }
                                                        });
                                                    }}
                                                    className="rounded border-border"
                                                />
                                                <span className="text-sm">{area}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Selected: {selectedAreas.length}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>{/* end scrollable body */}

                {/* Fixed footer */}
                <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0 gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onSave}
                        className="bg-brand hover:bg-brand/90 text-brand-foreground"
                        disabled={!editingSchedule.patrolCar || selectedPersonnel.length === 0 || selectedAreas.length === 0}
                    >
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
