export interface Personnel {
    id: string;
    name: string;
    position: string;
    contact: string;
    weeklyHours: number;
    hoursRemaining: number;
    lastShiftDate: string | null;
    canStartShift: boolean;
    onDuty: boolean;
    currentTimeSlot: string | null;
}

export interface PatrolCar {
    id: number;
    name: string;
    type: string;
    isActive: boolean;
    isAvailable: boolean;
}

export interface Barangay {
    barangays: string;
    type: string;
}

export interface PatrolSchedule {
    id?: string;
    timeSlot: string;
    date: string;
    patrolCar: string;
    personnel: Personnel[];
    areas: string[];
    priority?: number;
}

export interface WeeklyStats {
    personnelUtilization: {
        id: string;
        name: string;
        hours: number;
        status: 'underutilized' | 'balanced' | 'overworked';
    }[];
    areasCovered: string[];
    vehicleUsage: {
        name: string;
        shifts: number;
    }[];
    totalShifts: number;
    avgTeamSize: number;
    coveragePercent: number;
}

export interface OptimizationConfig {
    minPersonnelPerTeam: number;
    minPersonnelPerCar: number;
    minPersonnelPerBike: number;
    maxWeeklyHours: number;
    minWeeklyHours: number;
    aggregationWindow: number;
    lookbackDays: number;
    nightShiftStartHour: number;
    allowNonPatrolAtNight: boolean;
    maxAreasPerCluster: number;
}

export const CACHE_KEY = 'deployment_plan_cache';
export const CONFIG_KEY = 'deployment_config';

export const convertTimeToMinutes = (time: string): number => {
    if (!time || typeof time !== 'string') return 0;
    const parts = time.split(":");
    if (parts.length !== 2) return 0;
    const [hours, minutes] = parts.map(Number);
    return hours * 60 + minutes;
};

export const hasTimeConflict = (newSlot: { start: string; end: string }, existingSlots: string[], excludeSlot?: string): { hasConflict: boolean; message?: string } => {
    if (!newSlot.start || !newSlot.end) {
        return { hasConflict: true, message: "Invalid time slot" };
    }

    if (newSlot.start === newSlot.end) {
        return { hasConflict: true, message: "Start and end time cannot be the same" };
    }

    const newStart = convertTimeToMinutes(newSlot.start);
    const newEnd = convertTimeToMinutes(newSlot.end);

    for (const slot of existingSlots) {
        if (slot === excludeSlot) continue;

        const parts = slot.split(" - ");
        if (parts.length !== 2) continue;

        const [start, end] = parts;
        if (!start || !end) continue;

        const slotStart = convertTimeToMinutes(start);
        const slotEnd = convertTimeToMinutes(end);

        if (newStart < slotEnd && newEnd > slotStart) {
            return { hasConflict: true, message: `Time slot conflicts with ${slot}` };
        }
    }

    return { hasConflict: false };
};

export const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let i = 0; i < 24; i += 2) {
        const start = `${i.toString().padStart(2, '0')}:00`;
        const end = `${((i + 2) % 24).toString().padStart(2, '0')}:00`;
        slots.push(`${start} - ${end}`);
    }
    return slots;
};

export const findNextAvailableTimeSlot = (existingSchedules: PatrolSchedule[]): string | null => {
    const allTimeSlots = generateTimeSlots();
    const existingSlots = existingSchedules
        .map(s => s.timeSlot)
        .filter(slot => slot && typeof slot === 'string');

    return allTimeSlots.find(timeSlot => {
        const parts = timeSlot.split(' - ');
        if (parts.length !== 2) return false;
        const [start, end] = parts;
        if (!start || !end) return false;
        return !hasTimeConflict({ start, end }, existingSlots).hasConflict;
    }) || null;
};

export const normalizeTimeSlot = (timeSlot: string): string => {
    if (!timeSlot || typeof timeSlot !== 'string') {
        return '00:00 - 00:00';
    }

    const parts = timeSlot.split(' - ');
    if (parts.length !== 2) return timeSlot;

    const formatTime = (time: string) => {
        if (!time) return '00:00';
        const [hours, minutes = '00'] = time.split(':');
        if (!hours) return '00:00';
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    };

    return `${formatTime(parts[0])} - ${formatTime(parts[1])}`;
};

export const calculateWorkloadBalance = (personnelHours: Map<string, number>): 'balanced' | 'unbalanced' | 'critical' => {
    if (personnelHours.size === 0) return 'balanced';

    const hours = Array.from(personnelHours.values());
    const activeHours = hours.filter(h => h > 0);
    
    if (activeHours.length === 0) return 'balanced';

    const avg = activeHours.reduce((sum, h) => sum + h, 0) / activeHours.length;
    const max = Math.max(...activeHours);
    const min = Math.min(...activeHours);

    const variance = activeHours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / activeHours.length;
    const stdDev = Math.sqrt(variance);

    if (max > 48 || min < 8) return 'critical';
    if (stdDev > 10) return 'unbalanced';
    return 'balanced';
};

export const Input = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
    className= {`block w-full rounded-md border-border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${className}`}
{...props }
  />
);
