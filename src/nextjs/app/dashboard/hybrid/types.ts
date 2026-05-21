export interface HybridPerson {
    id: number;
    name: string;
    position: string;
    positionName?: string;
    roleName?: string;
    [key: string]: any;
}

export interface HybridSchedule {
    id: string;
    day: string;
    date: Date | string;
    timeSlot: string;
    vehicleId: number;
    vehicleName: string;
    lat: number;
    lng: number;
    locationLabel: string;
    assignedPersonnel: HybridPerson[];
    coverageAreas: string[];
    isActive: boolean;
}
