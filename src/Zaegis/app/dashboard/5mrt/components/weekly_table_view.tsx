import React from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import type { ProposedSchedule } from '@/lib/optimization/5mrt_optimization';
import { DeploymentTableSkeleton } from '@/components/skeletons/DeploymentSkeletons';
import { ShiftTableBlock } from './shift_table_block';
import { getShiftLabel } from '../utils';

interface WeeklyTableViewProps {
    isGenerating: boolean;
    isLoadingPlan: boolean;
    isReadOnly: boolean;
    deploymentData: ProposedSchedule[];
    shiftPattern: number;
    openEditModal: (team: ProposedSchedule) => void;
    riskMap: Map<string, number>;
    maxRisk: number;
}

export function WeeklyTableView({
    isGenerating,
    isLoadingPlan,
    isReadOnly,
    deploymentData,
    shiftPattern,
    openEditModal,
    riskMap,
    maxRisk
}: WeeklyTableViewProps) {
    if (isGenerating || isLoadingPlan) {
        return <DeploymentTableSkeleton />;
    }

    return (
        <div className="space-y-6">
            {Object.entries(deploymentData.reduce((acc, curr) => {
                const d = format(new Date(curr.date), 'yyyy-MM-dd');
                if (!acc[d]) acc[d] = [];
                acc[d].push(curr);
                return acc;
            }, {} as Record<string, ProposedSchedule[]>)).sort().map(([dateKey, shifts]) => (
                <div key={dateKey} className="mb-8">
                    <div className="mb-4 flex items-center justify-between border-b pb-2">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                        </h3>
                    </div>
                    {(() => {
                        const shiftsByLabel = shifts.reduce((acc, curr) => {
                            const lbl = getShiftLabel(curr.timeSlot, shiftPattern);
                            if (!acc[lbl]) acc[lbl] = [];
                            acc[lbl].push(curr);
                            return acc;
                        }, {} as Record<string, ProposedSchedule[]>);

                        return Object.entries(shiftsByLabel).sort().map(([label, labelShifts]) => (
                            <ShiftTableBlock
                                key={label}
                                shiftLabel={label}
                                shifts={labelShifts}
                                isReadOnly={isReadOnly}
                                openEditModal={openEditModal}
                                riskMap={riskMap}
                                maxRisk={maxRisk}
                            />
                        ));
                    })()}
                </div>
            ))}
            {deploymentData.length === 0 && (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed">
                    <div className="text-muted-foreground/70 mb-2">No schedule generated yet.</div>
                    <div className="text-sm text-muted-foreground">Click "Generate Schedule" to create a plan.</div>
                </div>
            )}
        </div>
    );
}
