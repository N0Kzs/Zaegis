export type CrimeFilters = {
  offenseType?: string;
  offense?: string;
  incidentType?: string;
  barangay?: string;
  startDate?: string;
  endDate?: string;
  dateField?: 'dateCommitted' | 'dateReported';
};

export type CrimeLocation = {
  id: string;
  lat: number;
  lng: number;
  offenseType?: string;
  offense?: string;
  incidentType?: string;
  barangay?: string;
  dateCommitted?: string;
  dateReported?: string;
};

export type FilterOptions = {
  offenseTypes: string[];
  offenses: string[];
  incidentTypes: string[];
};