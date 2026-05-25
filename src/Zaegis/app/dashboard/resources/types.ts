/**
 * @file Shared type definitions and constants for the Resources (resources) module.
 *
 * Centralizes all domain types, form defaults, and UI constants used across
 * the personnel, vehicles, and schedule sub-features.
 */

/** Navigation tabs available in the resources module. */
export type Tab = 'menu' | 'personnel' | 'vehicles' | 'schedule';

// ---------------------------------------------------------------------------
// Personnel
// ---------------------------------------------------------------------------

/** A rank/position lookup entry. */
export interface Position {
  id: number;
  name: string;
}

/** A unit/role lookup entry. */
export interface Role {
  id: number;
  name: string;
}

/** A single personnel record. */
export interface Personnel {
  id?: number;
  firstName: string;
  lastName: string;
  position: string;
  positionId?: number;
  role: string;
  roleId?: number;
  contact: string;
  dutyDays?: string | null;
  isActive?: boolean;
  isAvailable?: boolean;
}

/** Validation errors surfaced on the personnel form. */
export interface PersonnelFormErrors {
  firstName?: string;
  lastName?: string;
  position?: string;
  role?: string;
  contact?: string;
}

/** Blank personnel form used when adding a new record or resetting the form. */
export const DEFAULT_PERSONNEL_FORM: Personnel = {
  firstName: '',
  lastName: '',
  position: '',
  positionId: undefined,
  role: '',
  roleId: undefined,
  contact: '',
};

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

/** Discriminated vehicle category. */
export type VehicleType = 'patrol-car' | 'motorcycle';

/** A single patrol-car / motorcycle record. */
export interface PatrolCar {
  id?: number;
  name: string;
  type: VehicleType;
  plateNumber: string;
  capacity?: number;
  isActive?: boolean;
  isAvailable?: boolean;
}

/** Validation errors surfaced on the vehicle form. */
export interface VehicleFormErrors {
  name?: string;
  plateNumber?: string;
  type?: string;
}

/** Blank vehicle form used when adding a new record or resetting the form. */
export const DEFAULT_VEHICLE_FORM: PatrolCar = {
  name: '',
  type: 'patrol-car',
  plateNumber: '',
  capacity: 4,
};

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

/** Filter options for the availability column. */
export type AvailabilityFilter = 'all' | 'available' | 'unavailable';

/** Configuration object that drives the shared confirmation dialog. */
export interface ConfirmationConfig {
  isOpen: boolean;
  title: string;
  description: string;
  action: () => Promise<void>;
  variant: 'warning' | 'info' | 'danger';
}

/** Default (closed) state for the confirmation dialog. */
export const DEFAULT_CONFIRMATION: ConfirmationConfig = {
  isOpen: false,
  title: '',
  description: '',
  action: async () => {},
  variant: 'info',
};

/** Item pending deletion — used by the deactivation dialog. */
export interface DeleteTarget {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/** Ordered list of weekday names used by the duty-roster UI. */
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Number of items displayed per page in list/grid views. */
export const ITEMS_PER_PAGE = 10;
