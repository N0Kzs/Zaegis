/**
 * @file Hook encapsulating all personnel state management.
 *
 * Handles data fetching, CRUD operations, form validation, filtering,
 * pagination, and availability toggling for personnel records.
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getPersonnel,
  createPersonnel,
  updatePersonnel,
  deactivatePersonnel,
  togglePersonnelAvailability,
  getPositions,
  getRoles,
} from '@/lib/actions/resources';
import type {
  Personnel,
  Position,
  Role,
  PersonnelFormErrors,
  ConfirmationConfig,
  DeleteTarget,
  AvailabilityFilter,
} from '../types';
import {
  DEFAULT_PERSONNEL_FORM,
  DEFAULT_CONFIRMATION,
  ITEMS_PER_PAGE,
} from '../types';

/** Public API exposed by the `usePersonnel` hook. */
export interface UsePersonnelReturn {
  personnelList: Personnel[];
  positions: Position[];
  roles: Role[];
  isLoading: boolean;

  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterPosition: string;
  setFilterPosition: (v: string) => void;
  filterRole: string;
  setFilterRole: (v: string) => void;
  filterAvailability: AvailabilityFilter;
  setFilterAvailability: (v: AvailabilityFilter) => void;

  filteredPersonnel: Personnel[];
  paginatedPersonnel: Personnel[];
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  uniquePositions: string[];
  uniqueRoles: string[];

  formData: Personnel;
  setFormData: (v: Personnel) => void;
  formErrors: PersonnelFormErrors;
  isSubmitting: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  editingItem: Personnel | null;

  confirmation: ConfirmationConfig;
  setConfirmation: (v: ConfirmationConfig) => void;
  isConfirmingAction: boolean;
  setIsConfirmingAction: (v: boolean) => void;

  itemToDelete: DeleteTarget | null;
  isConfirmDeleteOpen: boolean;
  setIsConfirmDeleteOpen: (v: boolean) => void;

  resetForm: () => void;
  handleSave: () => Promise<void>;
  handleEdit: (person: Personnel) => void;
  handleToggleAvailability: (id: number, current: boolean) => void;
  confirmDelete: (id: number, name: string) => void;
  performDelete: () => Promise<void>;
}

/**
 * Manages the full lifecycle of personnel records including fetching,
 * filtering, pagination, form validation, and CRUD operations.
 */
export function usePersonnel(): UsePersonnelReturn {
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterAvailability, setFilterAvailability] =
    useState<AvailabilityFilter>('all');

  const [formData, setFormData] = useState<Personnel>(DEFAULT_PERSONNEL_FORM);
  const [formErrors, setFormErrors] = useState<PersonnelFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Personnel | null>(null);

  const [confirmation, setConfirmation] =
    useState<ConfirmationConfig>(DEFAULT_CONFIRMATION);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Reset body styles when all dialogs close (Radix cleanup safety net).
  useEffect(() => {
    if (!isModalOpen && !confirmation.isOpen && !isConfirmDeleteOpen) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, confirmation.isOpen, isConfirmDeleteOpen]);

  // Fetch personnel, positions, and roles on mount.
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [personnelRes, positionsRes, rolesRes] = await Promise.all([
          getPersonnel(),
          getPositions(),
          getRoles(),
        ]);
        if (personnelRes.success && personnelRes.data)
          setPersonnelList(personnelRes.data as Personnel[]);
        if (positionsRes.success && positionsRes.data)
          setPositions(positionsRes.data as Position[]);
        if (rolesRes.success && rolesRes.data)
          setRoles(rolesRes.data as Role[]);
      } catch {
        toast.error('Could not load personnel information. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  /** Active personnel matching the current search + filter criteria. */
  const filteredPersonnel = useMemo(() => {
    let result = personnelList.filter((p) => p.isActive !== false);

    if (filterPosition !== 'all') {
      result = result.filter((p) => p.position === filterPosition);
    }
    if (filterRole !== 'all') {
      result = result.filter((p) => p.role === filterRole);
    }
    if (filterAvailability !== 'all') {
      result = result.filter((p) =>
        filterAvailability === 'available'
          ? p.isAvailable !== false
          : p.isAvailable === false,
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q) ||
          (p.role || '').toLowerCase().includes(q) ||
          (p.contact || '').toLowerCase().includes(q),
      );
    }

    return result.sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName),
    );
  }, [personnelList, searchTerm, filterPosition, filterRole, filterAvailability]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / ITEMS_PER_PAGE),
  );

  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPersonnel.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPersonnel, currentPage]);

  const uniquePositions = useMemo(
    () =>
      Array.from(
        new Set(
          personnelList.filter((p) => p.isActive !== false).map((p) => p.position),
        ),
      ).sort(),
    [personnelList],
  );

  const uniqueRoles = useMemo(
    () =>
      Array.from(
        new Set(
          personnelList.filter((p) => p.isActive !== false).map((p) => p.role),
        ),
      ).sort(),
    [personnelList],
  );

  /** Validates the current form state and sets field-level errors. */
  const validateForm = useCallback((): boolean => {
    const errors: PersonnelFormErrors = {};
    let valid = true;

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
      valid = false;
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
      valid = false;
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
      valid = false;
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
      valid = false;
    }

    if (!formData.positionId) {
      errors.position = 'Position/Rank is required';
      valid = false;
    }
    if (!formData.roleId) {
      errors.role = 'Role/Unit is required';
      valid = false;
    }

    if (formData.contact?.trim()) {
      if (!/^(09|\+639)\d{9}$/.test(formData.contact)) {
        errors.contact = 'Invalid phone number format (e.g., 09123456789)';
        valid = false;
      }
    }

    setFormErrors(errors);
    return valid;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_PERSONNEL_FORM);
    setFormErrors({});
    setEditingItem(null);
  }, []);

  /** Refresh the personnel list from the server. */
  const refreshList = useCallback(async () => {
    const res = await getPersonnel();
    if (res.success && res.data) setPersonnelList(res.data as Personnel[]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly before saving.');
      return;
    }

    const performSave = async () => {
      setIsSubmitting(true);
      try {
        if (editingItem?.id) {
          const result = await updatePersonnel(editingItem.id, {
            name: `${formData.firstName} ${formData.lastName}`,
            positionId: formData.positionId!,
            roleId: formData.roleId!,
            contact: formData.contact,
            isAvailable: formData.isAvailable,
          });
          if (result.success) {
            toast.success('Personnel record updated successfully.');
            await refreshList();
          } else {
            toast.error('Could not update the personnel record. Please try again.');
            return;
          }
        } else {
          const result = await createPersonnel([
            {
              firstName: formData.firstName,
              lastName: formData.lastName,
              positionId: formData.positionId!,
              roleId: formData.roleId!,
              contact: formData.contact,
            },
          ]);
          if (result.success) {
            toast.success('Personnel added successfully.');
            await refreshList();
          } else {
            toast.error('Could not add the personnel record. Please try again.');
            return;
          }
        }
        setIsModalOpen(false);
        resetForm();
      } catch {
        toast.error('Something went wrong. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (editingItem) {
      setConfirmation({
        isOpen: true,
        title: 'Confirm Update',
        description:
          "Are you sure you want to save the changes to this personnel's record?",
        variant: 'info',
        action: performSave,
      });
    } else {
      performSave();
    }
  }, [validateForm, editingItem, formData, resetForm, refreshList]);

  const handleEdit = useCallback(
    (person: Personnel) => {
      const pos = positions.find((p) => p.name === person.position);
      const role = roles.find((r) => r.name === person.role);
      setFormData({ ...person, positionId: pos?.id, roleId: role?.id });
      setEditingItem(person);
      setTimeout(() => setIsModalOpen(true), 100);
    },
    [positions, roles],
  );

  const handleToggleAvailability = useCallback(
    (id: number, current: boolean) => {
      const toggle = async () => {
        const result = await togglePersonnelAvailability(id, !current);
        if (result.success) {
          toast.success(
            `Personnel marked as ${!current ? 'available' : 'unavailable'}.`,
          );
          setPersonnelList((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, isAvailable: !current } : p,
            ),
          );
        } else {
          toast.error('Could not update availability status. Please try again.');
        }
      };

      if (current) {
        setTimeout(() => {
          setConfirmation({
            isOpen: true,
            title: 'Mark as Unavailable',
            description:
              'Are you sure? This personnel will be removed from the available roster.',
            variant: 'warning',
            action: toggle,
          });
        }, 100);
      } else {
        toggle();
      }
    },
    [],
  );

  const confirmDelete = useCallback((id: number, name: string) => {
    setItemToDelete({ id, name });
    setTimeout(() => setIsConfirmDeleteOpen(true), 100);
  }, []);

  const performDelete = useCallback(async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;

    setIsConfirmDeleteOpen(false);
    await new Promise((r) => setTimeout(r, 100));

    const result = await deactivatePersonnel(id);
    if (result.success) {
      toast.success('Personnel removed from the active roster.');
      setPersonnelList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)),
      );
    } else {
      toast.error('Could not remove the personnel record. Please try again.');
    }
    setItemToDelete(null);
  }, [itemToDelete]);

  return {
    personnelList,
    positions,
    roles,
    isLoading,

    searchTerm,
    setSearchTerm,
    filterPosition,
    setFilterPosition,
    filterRole,
    setFilterRole,
    filterAvailability,
    setFilterAvailability,

    filteredPersonnel,
    paginatedPersonnel,
    currentPage,
    setCurrentPage,
    totalPages,
    uniquePositions,
    uniqueRoles,

    formData,
    setFormData,
    formErrors,
    isSubmitting,
    isModalOpen,
    setIsModalOpen,
    editingItem,

    confirmation,
    setConfirmation,
    isConfirmingAction,
    setIsConfirmingAction,

    itemToDelete,
    isConfirmDeleteOpen,
    setIsConfirmDeleteOpen,

    resetForm,
    handleSave,
    handleEdit,
    handleToggleAvailability,
    confirmDelete,
    performDelete,
  };
}
