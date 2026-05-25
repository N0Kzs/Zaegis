import { HybridPerson } from './types';

export const TIME_BLOCKS_FULL = [
    "00:00 - 04:00", "04:00 - 08:00", "08:00 - 12:00",
    "12:00 - 16:00", "16:00 - 20:00", "20:00 - 00:00"
];

export const TIME_BLOCKS_SHORT = ["0-4", "4-8", "8-12", "12-16", "16-20", "20-0"];

export const ROSTER_BLOCKS: Record<string, { labels: string[], indices: number[][] }> = {
    '4-hour': { labels: TIME_BLOCKS_SHORT, indices: [[0], [1], [2], [3], [4], [5]] },
    '8-hour': { labels: ['0-8', '8-16', '16-0'], indices: [[0, 1], [2, 3], [4, 5]] },
    '12-hour': { labels: ['0-12', '12-0'], indices: [[0, 1, 2], [3, 4, 5]] }
};

export function getRole(person: HybridPerson): string {
    return person.roleName || person.positionName || person.position || 'Unknown';
}

export function getBlockPeriod(timeSlot: string): { label: string; bg: string; text: string } {
    const startHour = parseInt(timeSlot.split(':')[0]);
    if (startHour >= 8 && startHour < 16) return { bg: 'bg-blue-500', text: 'text-white', label: 'Day' };
    if (startHour >= 16) return { bg: 'bg-purple-500', text: 'text-white', label: 'Evening' };
    return { bg: 'bg-indigo-600', text: 'text-white', label: 'Night' };
}

export const VEHICLE_COLORS = [
    { bg: 'bg-red-500', text: 'text-white', hex: '#ef4444' },
    { bg: 'bg-blue-500', text: 'text-white', hex: '#3b82f6' },
    { bg: 'bg-green-500', text: 'text-white', hex: '#22c55e' },
    { bg: 'bg-yellow-500', text: 'text-white', hex: '#eab308' },
    { bg: 'bg-purple-500', text: 'text-white', hex: '#a855f7' },
    { bg: 'bg-pink-500', text: 'text-white', hex: '#ec4899' },
    { bg: 'bg-indigo-500', text: 'text-white', hex: '#6366f1' },
    { bg: 'bg-teal-500', text: 'text-white', hex: '#14b8a6' },
    { bg: 'bg-orange-500', text: 'text-white', hex: '#f97316' },
    { bg: 'bg-cyan-500', text: 'text-white', hex: '#06b6d4' },
];

export function getVehicleColor(vehicleName: string) {
    let hash = 0;
    for (let i = 0; i < vehicleName.length; i++) {
        hash = vehicleName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return VEHICLE_COLORS[Math.abs(hash) % VEHICLE_COLORS.length];
}
