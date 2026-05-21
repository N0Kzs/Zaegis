
import type { CrimeLocation } from '@/lib/types/crimes';


export type CrimeMapClientProps = {
  allLocations: CrimeLocation[];
  barangayOptions: string[];
};


export type TemporalView = 'all' | 'year' | 'month' | 'dayOfWeek';


export type FilterState = {
  offenseTypes: string[];
  offenses: string[];
  incidentTypes: string[];
  barangays: string[];
  startDate: Date | undefined;
  endDate: Date | undefined;
  temporalView: TemporalView;
  selectedYear?: number;
  selectedMonth?: number;
  selectedDayOfWeek?: number;
};


export const DEFAULT_FILTER_STATE: FilterState = {
  offenseTypes: [],
  offenses: [],
  incidentTypes: [],
  barangays: [],
  startDate: undefined,
  endDate: undefined,
  temporalView: 'all',
  selectedYear: undefined,
  selectedMonth: undefined,
  selectedDayOfWeek: undefined,
};


export type AnimationMode = 'none' | 'years' | 'months';


export type TimeStep = {
  year?: number;
  month?: number;
  label: string;
};


export type LayerType = 'none' | 'boundaries' | 'zoning';


export type CrimeMarkerFeature = {
  type: 'Feature';
  properties: {
    id: string;
    offenseType?: string;
    offense?: string;
    incidentType?: string;
    barangay?: string;
    dateCommitted?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};


export type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
};


export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;


export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;
