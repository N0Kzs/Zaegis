import React from 'react';
import { Edit2, Car, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBarangayRiskColor } from '@/lib/utils/risk_colors';
import type { ProposedSchedule } from '@/lib/optimization/5mrt_optimization';

interface ShiftTableBlockProps {
    shiftLabel: string;
    shifts: ProposedSchedule[];
    isReadOnly: boolean;
    openEditModal: (team: ProposedSchedule) => void;
    riskMap: Map<string, number>;
    maxRisk: number;
}

export function ShiftTableBlock({
    shiftLabel,
    shifts,
    isReadOnly,
    openEditModal,
    riskMap,
    maxRisk
}: ShiftTableBlockProps) {
    return (
        <div key={shiftLabel} className="bg-card rounded-xl border shadow-sm overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className={`px-4 py-3 border-b flex items-center justify-between ${shiftLabel === 'Shift 1' ? 'bg-blue-50/50' : shiftLabel === 'Shift 2' ? 'bg-purple-50/50' : 'bg-indigo-50/50'}`}>
                <h3 className={`font-semibold text-sm flex items-center gap-2 ${shiftLabel === 'Shift 1' ? 'text-blue-800' : shiftLabel === 'Shift 2' ? 'text-purple-800' : 'text-indigo-800'}`}>
                    <Clock className="w-4 h-4" /> {shiftLabel} <span className="text-muted-foreground font-normal text-xs ml-2">({shifts[0]?.timeSlot})</span>
                </h3>
                <Badge variant="secondary" className="text-xs bg-card">{shifts.length} Teams</Badge>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-card text-muted-foreground text-xs uppercase border-b">
                    <tr>
                        <th className="px-4 py-3 font-medium w-40">Unit</th>
                        <th className="px-4 py-3 font-medium">Personnel</th>
                        <th className="px-4 py-3 font-medium w-64">Assigned Areas</th>
                        <th className="px-4 py-3 font-medium w-32">Coordinates</th>
                        {!isReadOnly && <th className="px-4 py-3 text-right w-12"></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {shifts.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot) || a.vehicleName.localeCompare(b.vehicleName)).map(d => (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-4 font-medium text-foreground/90 align-top">
                                <div className="flex items-center gap-2">
                                    <Car className="w-4 h-4 text-muted-foreground/70" />
                                    {d.vehicleName}
                                </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-muted-foreground align-top">
                                <div className="flex flex-col gap-1.5">
                                    {d.assignedPersonnel.map(p => (
                                        <div key={p.id} className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
                                            <span className="font-medium text-foreground/90">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </td>
                            <td className="px-4 py-4 text-xs align-top">
                                <div className="flex flex-wrap gap-1.5">
                                    {d.coverageAreas.map(area => {
                                        const rc = getBarangayRiskColor(area, riskMap, maxRisk);
                                        return (
                                            <Badge key={area} variant="outline" className={`font-normal ${rc.bg} ${rc.text} ${rc.border}`}>
                                                {area}
                                            </Badge>
                                        );
                                    })}
                                    {d.coverageAreas.length === 0 && (
                                        <span className="text-xs text-muted-foreground/70 italic">—</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-4 text-xs align-top">
                                <div className="text-muted-foreground font-mono">
                                    {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
                                </div>
                            </td>
                            {!isReadOnly && (
                                <td className="px-4 py-4 text-right align-top">
                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(d)} className="h-7 w-7 text-muted-foreground/70 hover:text-brand">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
