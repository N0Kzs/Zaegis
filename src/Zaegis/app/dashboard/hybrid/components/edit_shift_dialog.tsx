import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Car, MapPin, RefreshCw } from 'lucide-react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import type { HybridSchedule, HybridPerson } from '../types';
import { getRole } from '../utils';

interface EditShiftDialogProps {
    shift: HybridSchedule | null;
    onClose: () => void;
    onSave: (updated: HybridSchedule) => void;
    allPersonnel?: HybridPerson[];
    allBarangays?: string[];
}

export function EditShiftDialog({ shift, onClose, onSave, allPersonnel = [], allBarangays = [] }: EditShiftDialogProps) {
    const [editedShift, setEditedShift] = useState<HybridSchedule | null>(shift);
    const [originalShift, setOriginalShift] = useState<HybridSchedule | null>(shift);
    const [personnelSearch, setPersonnelSearch] = useState('');
    const [areaSearch, setAreaSearch] = useState('');

    useEffect(() => {
        setEditedShift(shift);
        setOriginalShift(shift);
    }, [shift]);

    if (!shift || !editedShift) return null;

    const toggleOfficer = (person: HybridPerson) => {
        const exists = editedShift.assignedPersonnel.find(p => p.id === person.id);
        const newList = exists
            ? editedShift.assignedPersonnel.filter(p => p.id !== person.id)
            : [...editedShift.assignedPersonnel, person];
        setEditedShift({ ...editedShift, assignedPersonnel: newList });
    };

    const toggleBarangay = (barangay: string) => {
        const exists = editedShift.coverageAreas.includes(barangay);
        const newList = exists
            ? editedShift.coverageAreas.filter(a => a !== barangay)
            : [...editedShift.coverageAreas, barangay];
        setEditedShift({ ...editedShift, coverageAreas: newList });
    };

    const resetCoordinates = () => {
        if (originalShift) {
            setEditedShift({ ...editedShift, lat: originalShift.lat, lng: originalShift.lng });
            toast.info('Location reset to its original position on the map.');
        }
    };

    const handleSave = () => {
        onSave(editedShift);
        onClose();
        toast.success('Shift details saved.');
    };

    const filteredPersonnel = allPersonnel.filter(p =>
        p.name.toLowerCase().includes(personnelSearch.toLowerCase())
    );
    const filteredAreas = allBarangays.filter(a =>
        a.toLowerCase().includes(areaSearch.toLowerCase())
    );

    return (
        <Dialog open={!!shift} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-brand" />
                        Edit Shift — {shift.vehicleName}
                    </DialogTitle>
                    <DialogDescription>
                        {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')} • {shift.timeSlot}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Vehicle + Coordinates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Patrol Vehicle</label>
                            <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-muted/30">
                                <Car className="w-4 h-4 text-brand shrink-0" />
                                <span className="text-sm font-medium text-foreground/90">{editedShift.vehicleName}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Coordinates</label>
                            <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-muted/30">
                                <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                                <span className="text-xs font-mono text-muted-foreground">
                                    {editedShift.lat.toFixed(5)}, {editedShift.lng.toFixed(5)}
                                </span>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-muted-foreground/70 hover:text-brand" onClick={resetCoordinates}>
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Personnel */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                            Assigned Personnel ({editedShift.assignedPersonnel.length})
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/30 mb-2 outline-none focus:ring-2 focus:ring-brand/30"
                            placeholder="Search personnel..."
                            value={personnelSearch}
                            onChange={e => setPersonnelSearch(e.target.value)}
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                            {filteredPersonnel.map(person => {
                                const isAssigned = editedShift.assignedPersonnel.some(p => p.id === person.id);
                                return (
                                    <div key={person.id}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isAssigned ? 'bg-brand/10 border border-brand/20' : 'hover:bg-muted/30'}`}
                                        onClick={() => toggleOfficer(person)}
                                    >
                                        <Checkbox checked={isAssigned} className="pointer-events-none" />
                                        <span className="text-sm font-medium text-foreground/90">{person.name}</span>
                                        <span className="text-[10px] text-brand ml-auto">{getRole(person)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Coverage Areas */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                            Coverage Areas ({editedShift.coverageAreas.length})
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/30 mb-2 outline-none focus:ring-2 focus:ring-brand/30"
                            placeholder="Search barangays..."
                            value={areaSearch}
                            onChange={e => setAreaSearch(e.target.value)}
                        />
                        <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                            {filteredAreas.map(area => {
                                const isIncluded = editedShift.coverageAreas.includes(area);
                                return (
                                    <div key={area}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isIncluded ? 'bg-green-500/10 border border-green-500/20' : 'hover:bg-muted/30'}`}
                                        onClick={() => toggleBarangay(area)}
                                    >
                                        <Checkbox checked={isIncluded} className="pointer-events-none" />
                                        <span className="text-sm text-foreground/90">{area}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-brand hover:bg-brand/90 text-brand-foreground">
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
