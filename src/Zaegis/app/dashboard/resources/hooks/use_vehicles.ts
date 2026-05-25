/**
 * @file Hook encapsulating all vehicle state management.
 *
 * Handles data fetching, CRUD operations, form validation, filtering,
 * pagination, and availability toggling for patrol-car / motorcycle records.
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getPatrolCars,
  createPatrolCar,
  updatePatrolCar,
  deactivatePatrolCar,
  togglePatrolCarAvailability,
} from '@/lib/actions/resources';
import type {
  PatrolCar,
  VehicleType,
  VehicleFormErrors,
  ConfirmationConfig,
  DeleteTarget,
  AvailabilityFilter,
} from '../types';
import {
  DEFAULT_VEHICLE_FORM,
  DEFAULT_CONFIRMATION,
  ITEMS_PER_PAGE,
} from '../types';

export interface UseVehiclesReturn {
  patrolCars: PatrolCar[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  vehicleFilterType: 'all' | VehicleType;
  setVehicleFilterType: (v: 'all' | VehicleType) => void;
  vehicleFilterAvailability: AvailabilityFilter;
  setVehicleFilterAvailability: (v: AvailabilityFilter) => void;
  filteredVehicles: PatrolCar[];
  paginatedVehicles: PatrolCar[];
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  formData: PatrolCar;
  setFormData: (v: PatrolCar) => void;
  formErrors: VehicleFormErrors;
  isSubmitting: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  editingItem: PatrolCar | null;
  confirmation: ConfirmationConfig;
  setConfirmation: (v: ConfirmationConfig) => void;
  isConfirmingAction: boolean;
  setIsConfirmingAction: (v: boolean) => void;
  itemToDelete: DeleteTarget | null;
  isConfirmDeleteOpen: boolean;
  setIsConfirmDeleteOpen: (v: boolean) => void;
  resetForm: () => void;
  handleSave: () => Promise<void>;
  handleEdit: (car: PatrolCar) => void;
  handleToggleAvailability: (id: number, current: boolean) => void;
  confirmDelete: (id: number, name: string) => void;
  performDelete: () => Promise<void>;
}

/**
 * Manages the full lifecycle of vehicle records including fetching,
 * filtering, pagination, form validation, and CRUD operations.
 */
export function useVehicles(): UseVehiclesReturn {
  const [patrolCars, setPatrolCars] = useState<PatrolCar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [vehicleFilterType, setVehicleFilterType] = useState<'all' | VehicleType>('all');
  const [vehicleFilterAvailability, setVehicleFilterAvailability] =
    useState<AvailabilityFilter>('all');
  const [formData, setFormData] = useState<PatrolCar>(DEFAULT_VEHICLE_FORM);
  const [formErrors, setFormErrors] = useState<VehicleFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PatrolCar | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationConfig>(DEFAULT_CONFIRMATION);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen && !confirmation.isOpen && !isConfirmDeleteOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, confirmation.isOpen, isConfirmDeleteOpen]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await getPatrolCars();
        if (res.success && res.data) setPatrolCars(res.data as PatrolCar[]);
      } catch {
        toast.error('Could not load vehicle data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredVehicles = useMemo(() => {
    let result = patrolCars.filter((c) => c.isActive !== false);
    if (vehicleFilterType !== 'all') result = result.filter((c) => c.type === vehicleFilterType);
    if (vehicleFilterAvailability !== 'all') {
      result = result.filter((c) =>
        vehicleFilterAvailability === 'available' ? c.isAvailable !== false : c.isAvailable === false,
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.plateNumber.toLowerCase().includes(q));
    }
    return result;
  }, [patrolCars, vehicleFilterType, vehicleFilterAvailability, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE));

  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVehicles, currentPage]);

  const validateForm = useCallback((): boolean => {
    const errors: VehicleFormErrors = {};
    let valid = true;
    if (!formData.name.trim()) { errors.name = 'Vehicle name/ID is required'; valid = false; }
    else if (formData.name.trim().length < 3) { errors.name = 'Vehicle name must be at least 3 characters'; valid = false; }
    if (!formData.plateNumber.trim()) { errors.plateNumber = 'Plate number is required'; valid = false; }
    else if (!/^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(formData.plateNumber.toUpperCase())) { errors.plateNumber = 'Invalid format. Use ABC-1234 format'; valid = false; }
    setFormErrors(errors);
    return valid;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_VEHICLE_FORM);
    setFormErrors({});
    setEditingItem(null);
  }, []);

  const refreshList = useCallback(async () => {
    const res = await getPatrolCars();
    if (res.success && res.data) setPatrolCars(res.data as PatrolCar[]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!validateForm()) { toast.error('Please fill in all required fields correctly before saving.'); return; }
    const performSave = async () => {
      setIsSubmitting(true);
      try {
        if (editingItem?.id) {
          const result = await updatePatrolCar(editingItem.id, {
            name: formData.name, type: formData.type,
            plateNumber: formData.plateNumber, capacity: formData.capacity,
            isAvailable: formData.isAvailable,
          });
          if (result.success) { toast.success('Vehicle details updated successfully.'); await refreshList(); }
          else { toast.error('Could not update the vehicle. Please try again.'); return; }
        } else {
          const result = await createPatrolCar({
            name: formData.name, type: formData.type,
            plateNumber: formData.plateNumber, capacity: formData.capacity || 4,
          });
          if (result.success) { toast.success('Vehicle added successfully.'); await refreshList(); }
          else { toast.error('Could not add the vehicle. Please try again.'); return; }
        }
        setIsModalOpen(false);
        resetForm();
      } catch { toast.error('Something went wrong. Please try again.'); } finally { setIsSubmitting(false); }
    };
    if (editingItem) {
      setConfirmation({ isOpen: true, title: 'Confirm Update', description: 'Are you sure you want to save the changes to this vehicle?', variant: 'info', action: performSave });
    } else { performSave(); }
  }, [validateForm, editingItem, formData, resetForm, refreshList]);

  const handleEdit = useCallback((car: PatrolCar) => {
    setFormData({ ...car, plateNumber: car.plateNumber || '', capacity: car.capacity || 4 });
    setEditingItem(car);
    setTimeout(() => setIsModalOpen(true), 100);
  }, []);

  const handleToggleAvailability = useCallback((id: number, current: boolean) => {
    const toggle = async () => {
      const result = await togglePatrolCarAvailability(id, !current);
      if (result.success) {
        toast.success(`Vehicle marked as ${!current ? 'available' : 'unavailable'}.`);
        setPatrolCars((prev) => prev.map((c) => (c.id === id ? { ...c, isAvailable: !current } : c)));
      } else { toast.error('Could not update the vehicle status. Please try again.'); }
    };
    if (current) {
      setTimeout(() => {
        setConfirmation({ isOpen: true, title: 'Mark as Unavailable', description: 'Are you sure? This vehicle will be removed from the available fleet.', variant: 'warning', action: toggle });
      }, 100);
    } else { toggle(); }
  }, []);

  const confirmDelete = useCallback((id: number, name: string) => {
    setItemToDelete({ id, name });
    setTimeout(() => setIsConfirmDeleteOpen(true), 100);
  }, []);

  const performDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setIsConfirmDeleteOpen(false);
    await new Promise((r) => setTimeout(r, 100));
    const result = await deactivatePatrolCar(id);
    if (result.success) {
      toast.success('Vehicle removed from the active fleet.');
      setPatrolCars((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
    } else { toast.error('Could not remove the vehicle. Please try again.'); }
    setItemToDelete(null);
  }, [itemToDelete]);

  return {
    patrolCars, isLoading, searchTerm, setSearchTerm,
    vehicleFilterType, setVehicleFilterType,
    vehicleFilterAvailability, setVehicleFilterAvailability,
    filteredVehicles, paginatedVehicles, currentPage, setCurrentPage, totalPages,
    formData, setFormData, formErrors, isSubmitting,
    isModalOpen, setIsModalOpen, editingItem,
    confirmation, setConfirmation, isConfirmingAction, setIsConfirmingAction,
    itemToDelete, isConfirmDeleteOpen, setIsConfirmDeleteOpen,
    resetForm, handleSave, handleEdit, handleToggleAvailability, confirmDelete, performDelete,
  };
}
