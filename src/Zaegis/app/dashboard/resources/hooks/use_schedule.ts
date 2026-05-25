/**
 * @file Hook encapsulating schedule (duty roster) state management.
 *
 * Handles fetching personnel, managing the schedule edit modal,
 * toggling duty days, and persisting schedule updates.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getPersonnel, updatePersonnel } from '@/lib/actions/resources';
import type { Personnel } from '../types';
import { DAYS_OF_WEEK } from '../types';

/** Public API exposed by the `useSchedule` hook. */
export interface UseScheduleReturn {
  personnel: Personnel[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  selectedDay: string;
  setSelectedDay: (v: string) => void;
  editingId: number | null;
  selectedDays: string[];
  isSubmitting: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  handleEdit: (person: Personnel) => void;
  toggleDay: (day: string) => void;
  handleSave: () => Promise<void>;
  refresh: () => void;
}

/**
 * Manages the duty roster — loading personnel, editing weekly schedules,
 * and persisting changes via server actions.
 */
export function useSchedule(): UseScheduleReturn {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long' }),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPersonnel();
      if (res.success && res.data) setPersonnel(res.data as Personnel[]);
    } catch {
      toast.error('Could not load duty schedule data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Open the edit modal pre-populated with the person's current duty days. */
  const handleEdit = useCallback((person: Personnel) => {
    setEditingId(person.id ?? null);
    setSelectedDays(person.dutyDays ? person.dutyDays.split(',') : []);
    setIsModalOpen(true);
  }, []);

  /** Toggle a single day in the current selection. */
  const toggleDay = useCallback(
    (day: string) => {
      const short = day.slice(0, 3);
      setSelectedDays((prev) =>
        prev.includes(short)
          ? prev.filter((d) => d !== short)
          : [...prev, short],
      );
    },
    [],
  );

  /** Persist the updated duty-day selection for the current person. */
  const handleSave = useCallback(async () => {
    if (!editingId) return;
    setIsSubmitting(true);
    try {
      const sorted = DAYS_OF_WEEK.map((d) => d.slice(0, 3)).filter((d) =>
        selectedDays.includes(d),
      );
      const dutyDaysString = sorted.join(',');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await updatePersonnel(editingId, { dutyDays: dutyDaysString } as any);
      if (res.success) {
        toast.success('Duty schedule saved successfully.');
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error('Could not save the schedule. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, selectedDays, fetchData]);

  return {
    personnel, isLoading, searchTerm, setSearchTerm,
    selectedDay, setSelectedDay, editingId, selectedDays,
    isSubmitting, isModalOpen, setIsModalOpen,
    handleEdit, toggleDay, handleSave, refresh: fetchData,
  };
}
