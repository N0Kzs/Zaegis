export const ROSTER_PAGE_SIZE = 12;

export const getShiftLabel = (timeSlot: string, shiftPattern: number) => {
    const startHour = parseInt(timeSlot.split(':')[0]);
    if (shiftPattern === 12) {
        if (startHour >= 8 && startHour < 20) return 'Shift 1';
        return 'Shift 2';
    } else {
        if (startHour >= 8 && startHour < 16) return 'Shift 1';
        if (startHour >= 16 && startHour < 24) return 'Shift 2';
        return 'Shift 3';
    }
};

export const getShiftColor = (timeSlot: string, shiftPattern: number) => {
    const label = getShiftLabel(timeSlot, shiftPattern);
    const colors = {
        'Shift 1': { bg: 'bg-blue-500', text: 'text-blue-900', lightBg: 'bg-blue-50' },
        'Shift 2': { bg: 'bg-purple-500', text: 'text-purple-900', lightBg: 'bg-purple-50' },
        'Shift 3': { bg: 'bg-indigo-500', text: 'text-indigo-900', lightBg: 'bg-indigo-50' }
    };
    return colors[label as keyof typeof colors] || colors['Shift 1'];
};

// Vehicle-based colors for boundary coloring
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

export const getVehicleColor = (vehicleName: string) => {
    let hash = 0;
    for (let i = 0; i < vehicleName.length; i++) {
        hash = vehicleName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return VEHICLE_COLORS[Math.abs(hash) % VEHICLE_COLORS.length];
};
