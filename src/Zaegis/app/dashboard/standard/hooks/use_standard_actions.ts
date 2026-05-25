/**
 * @file Hook for Standard deployment actions: generate, save, edit, undo/redo, discard, export.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { saveDeploymentPlan, generateDeploymentSchedule } from '@/lib/actions/deployment';
import { downloadDeploymentPlan } from '@/lib/utils';
import { useStandardStore } from '@/lib/store/standard_store';
import type { Personnel, PatrolCar, PatrolSchedule } from '../utils';
import { hasTimeConflict, findNextAvailableTimeSlot, normalizeTimeSlot } from '../utils';

interface UseStandardActionsOptions {
  personnel: Personnel[];
  patrolCars: PatrolCar[];
  checkIfWeekSaved: () => Promise<void>;
}

export function useStandardActions({ personnel, patrolCars, checkIfWeekSaved }: UseStandardActionsOptions) {
  const {
    selectedWeekStart, schedules, setSchedules,
    weekHasBeenSaved, setWeekHasBeenSaved,
    config, setConfig, pushHistory, undo, redo,
    schedulesHistory, schedulesRedoStack,
  } = useStandardStore();

  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PatrolSchedule | null>(null);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [searchPersonnel, setSearchPersonnel] = useState('');
  const [searchAreas, setSearchAreas] = useState('');
  const [editingTimeSlot, setEditingTimeSlot] = useState<{ start: string; end: string } | null>(null);

  const handleGenerateSchedule = useCallback(async () => {
    if (weekHasBeenSaved) {
      toast.error('This week\'s plan has already been saved and cannot be changed. Start a new week to generate a fresh plan.');
      return;
    }
    setGenerating(true);
    setProgress(0);

    try {
      setProgress(20);
      const result = await generateDeploymentSchedule({
        weekStartDate: selectedWeekStart,
        config,
      });
      setProgress(60);

      if (!result.success || !result.data) throw new Error(result.error || 'Schedule generation failed');

      setProgress(80);
      const generatedSchedules: PatrolSchedule[] = result.data.plans.map((p: any) => {
        const personnelIds = p.personnelIds || [];
        const planPersonnel = personnel.filter((person) => personnelIds.includes(Number(person.id)));
        const car = patrolCars.find((c) => Number(c.id) === Number(p.vehicleId));
        return {
          id: `temp-${Date.now()}-${Math.random()}`,
          timeSlot: p.timeSlot,
          date: format(new Date(p.date), 'yyyy-MM-dd'),
          patrolCar: car?.name || '',
          personnel: planPersonnel,
          areas: p.areas || [],
          priority: p.priority,
        };
      });

      setSchedules(generatedSchedules);
      setProgress(100);
      toast.success(`Deployment schedule ready — ${generatedSchedules.length} entries generated.`, {
        description: `Area coverage: ${result.data.metrics.coverage.coveragePercent.toFixed(1)}%`,
      });
    } catch (error: any) {
      toast.error('Could not generate the deployment schedule. Please try again.');
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [weekHasBeenSaved, selectedWeekStart, config, personnel, patrolCars, setSchedules]);

  const handleSaveConfig = useCallback(() => {
    setConfig(config);
    setIsConfigModalOpen(false);
    toast.success('Settings saved.');
  }, [config, setConfig]);

  const handleSaveToDatabase = useCallback(async () => {
    try {
      setSaving(true);
      setProgress(0);

      const schedulesByDate = schedules.reduce((acc, schedule) => {
        if (!acc[schedule.date]) acc[schedule.date] = [];
        acc[schedule.date].push(schedule);
        return acc;
      }, {} as Record<string, PatrolSchedule[]>);

      const totalDays = Object.keys(schedulesByDate).length;
      let completed = 0;

      for (const [date, daySchedules] of Object.entries(schedulesByDate)) {
        const result = await saveDeploymentPlan({ date, schedules: daySchedules });
        if (!result.success) throw new Error(`Failed to save ${format(new Date(date), 'MMM d')}: ${result.error}`);
        completed++;
        setProgress((completed / totalDays) * 100);
      }

      setSchedules([]);
      setWeekHasBeenSaved(true);
      toast.success(`${schedules.length} deployment entries saved successfully.`, { description: 'This week is now locked and cannot be edited.' });
      await checkIfWeekSaved();
    } catch (error: any) {
      toast.error('Could not save the deployment plan. Please try again.');
    } finally {
      setSaving(false);
      setProgress(0);
      setIsConfirmSaveOpen(false);
    }
  }, [schedules, setSchedules, setWeekHasBeenSaved, checkIfWeekSaved]);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) { setSchedules(prev); toast.info('Last change undone.'); }
  }, [undo, setSchedules]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) { setSchedules(next); toast.info('Change restored.'); }
  }, [redo, setSchedules]);

  const handleDiscardCache = useCallback(() => {
    pushHistory(schedules);
    setSchedules([]);
    setIsConfirmDiscardOpen(false);
    toast.info('Schedule cleared. You can generate a new one.');
  }, [schedules, pushHistory, setSchedules]);

  const handleEditModalOpen = useCallback((schedule: PatrolSchedule) => {
    if (weekHasBeenSaved) { toast.error('This week\'s plan has been saved and can no longer be edited.'); return; }
    setEditingSchedule(schedule);
    setSelectedPersonnel(schedule.personnel?.map((p) => p.id) || []);
    setSelectedAreas(schedule.areas || []);
    setSearchPersonnel('');
    setSearchAreas('');
    setEditingTimeSlot(null);
    setIsEditModalOpen(true);
  }, [weekHasBeenSaved]);

  const handleSaveSchedule = useCallback(() => {
    if (!editingSchedule) return;
    if (!editingSchedule.patrolCar) { toast.error('Please select a patrol car before saving.'); return; }
    if (selectedPersonnel.length === 0) { toast.error('Please assign at least one officer to this schedule.'); return; }
    if (selectedAreas.length === 0) { toast.error('Please select at least one patrol area.'); return; }

    if (editingTimeSlot) {
      const existingSlots = schedules
        .filter((s) => s.id !== editingSchedule.id && s.date === editingSchedule.date)
        .map((s) => s.timeSlot);
      const conflict = hasTimeConflict(editingTimeSlot, existingSlots);
      if (conflict.hasConflict) { toast.error(conflict.message || 'This time slot overlaps with an existing one. Please choose a different time.'); return; }
    }

    pushHistory(schedules);
    const updatedSchedule: PatrolSchedule = {
      ...editingSchedule,
      timeSlot: editingTimeSlot
        ? normalizeTimeSlot(`${editingTimeSlot.start} - ${editingTimeSlot.end}`)
        : editingSchedule.timeSlot,
      personnel: personnel.filter((p) => selectedPersonnel.includes(p.id)),
      areas: selectedAreas,
    };

    setSchedules(schedules.map((s) => (s.id === editingSchedule.id ? updatedSchedule : s)));
    setIsEditModalOpen(false);
    toast.success('Schedule entry updated.');
  }, [editingSchedule, selectedPersonnel, selectedAreas, editingTimeSlot, schedules, personnel, pushHistory, setSchedules]);

  const handleAddTimeSlot = useCallback((date: string) => {
    const daySchedules = schedules.filter((s) => s.date === date);
    const nextSlot = findNextAvailableTimeSlot(daySchedules);
    if (!nextSlot) { toast.error('All time slots for this day are already taken. No more can be added.'); return; }

    const newSchedule: PatrolSchedule = {
      id: `temp-${Date.now()}-${Math.random()}`,
      timeSlot: nextSlot, date, patrolCar: '', personnel: [], areas: [],
    };

    pushHistory(schedules);
    setSchedules([...schedules, newSchedule]);
    setEditingSchedule(newSchedule);
    setSelectedPersonnel([]);
    setSelectedAreas([]);
    setSearchPersonnel('');
    setSearchAreas('');
    setEditingTimeSlot(null);
    setIsEditModalOpen(true);
  }, [schedules, pushHistory, setSchedules]);

  const handleRemoveTimeSlot = useCallback((id: string) => {
    pushHistory(schedules);
    setSchedules(schedules.filter((s) => s.id !== id));
    toast.success('Time slot removed.');
  }, [schedules, pushHistory, setSchedules]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      await new Promise((r) => setTimeout(r, 2000));
      await downloadDeploymentPlan(selectedWeekStart);
      toast.success('Your file is being downloaded.');
    } catch {
      toast.error('Download failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedWeekStart]);

  const timeSlotValidation = useMemo(() => {
    if (!editingTimeSlot || !editingSchedule) return null;
    const existingSlots = schedules
      .filter((s) => s.id !== editingSchedule.id && s.date === editingSchedule.date)
      .map((s) => s.timeSlot);
    return hasTimeConflict(editingTimeSlot, existingSlots);
  }, [editingTimeSlot, schedules, editingSchedule]);

  return {
    saving, generating, progress, isExporting,
    isConfirmSaveOpen, setIsConfirmSaveOpen,
    isConfirmDiscardOpen, setIsConfirmDiscardOpen,
    isConfigModalOpen, setIsConfigModalOpen,

    isEditModalOpen, setIsEditModalOpen,
    editingSchedule, setEditingSchedule,
    selectedPersonnel, setSelectedPersonnel,
    selectedAreas, setSelectedAreas,
    searchPersonnel, setSearchPersonnel,
    searchAreas, setSearchAreas,
    editingTimeSlot, setEditingTimeSlot,
    timeSlotValidation,

    canUndo: schedulesHistory.length > 0,
    canRedo: schedulesRedoStack.length > 0,

    handleGenerateSchedule, handleSaveConfig, handleSaveToDatabase,
    handleUndo, handleRedo, handleDiscardCache,
    handleEditModalOpen, handleSaveSchedule,
    handleAddTimeSlot, handleRemoveTimeSlot, handleExport,
  };
}
