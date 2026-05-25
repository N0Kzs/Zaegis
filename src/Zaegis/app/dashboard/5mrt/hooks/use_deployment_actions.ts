/**
 * @file Hook encapsulating deployment actions: generate, commit, clear,
 * local updates, edit-modal helpers, and document export.
 */

'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  generateWeeklyDeployment,
  commitDeploymentToDatabase,
  getDeploymentForDate,
} from '@/lib/optimization/5mrt_optimization';
import { useDeploymentStore } from '@/lib/store/deployment_store';
import type {
  ProposedSchedule,
  PersonnelWithRelations,
  DeploymentConfig,
} from '../types';

/** Public API exposed by the `useDeploymentActions` hook. */
export interface UseDeploymentActionsReturn {
  isGenerating: boolean;
  editingTeam: ProposedSchedule | null;
  isEditOpen: boolean;
  setIsEditOpen: (v: boolean) => void;
  isSaveConfirmOpen: boolean;
  setIsSaveConfirmOpen: (v: boolean) => void;
  isClearConfirmOpen: boolean;
  setIsClearConfirmOpen: (v: boolean) => void;
  isConfigOpen: boolean;
  setIsConfigOpen: (v: boolean) => void;
  handleGenerateWeek: () => Promise<void>;
  handleCommit: () => Promise<void>;
  handleClearDraft: () => void;
  handleLocalUpdate: (id: string, updates: Partial<ProposedSchedule>) => void;
  openEditModal: (team: ProposedSchedule) => void;
  saveEdit: () => void;
  resetEditingLocation: () => void;
  toggleOfficer: (person: PersonnelWithRelations) => void;
  toggleBarangay: (barangay: string) => void;
  handleExport: (type: 'word' | 'excel') => void;
  handleExportForDate: (weekStartDate: Date, type?: 'word' | 'excel') => Promise<void>;
}

/**
 * Manages all user-initiated deployment actions including generation,
 * persistence, draft management, editing, and document export.
 */
export function useDeploymentActions(): UseDeploymentActionsReturn {
  const {
    deploymentData,
    setDeploymentData,
    setAllPersonnelPool,
    selectedDate,
    shiftPattern,
    ignoreSchedule,
    isReadOnly,
    setHasChanges,
    setIsReadOnly,
    setTabView,
    updateDeployment,
    resetDraft,
  } = useDeploymentStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ProposedSchedule | null>(null);
  const [originalEditingTeam, setOriginalEditingTeam] = useState<ProposedSchedule | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  /** Generate a full weekly deployment schedule via the optimization engine. */
  const handleGenerateWeek = useCallback(async () => {
    setIsGenerating(true);
    try {
      const config: DeploymentConfig = {
        shiftDuration: shiftPattern,
        startHour: 8,
        minPerTeam: 2,
        maxPerTeam: 6,
        allowNonPatrol: true,
        patrolMinHours: 40,
        patrolMaxHours: 48,
        targetDate: selectedDate,
        ignoreDutySchedule: ignoreSchedule,
      };
      const res = await generateWeeklyDeployment(config);
      if (res.success && res.data) {
        setDeploymentData(res.data);
        if (res.allPersonnel) setAllPersonnelPool(res.allPersonnel);
        setHasChanges(true);
        setIsReadOnly(false);
        setTabView('daily');
        toast.success(`Generated ${res.data.length} shifts`);
      } else {
        toast.error(res.error || 'Failed');
      }
    } catch {
      toast.error('Error generating schedule');
    } finally {
      setIsGenerating(false);
    }
  }, [shiftPattern, selectedDate, ignoreSchedule, setDeploymentData, setAllPersonnelPool, setHasChanges, setIsReadOnly, setTabView]);

  /** Commit the current draft to the database and lock it. */
  const handleCommit = useCallback(async () => {
    setIsSaveConfirmOpen(false);
    const toastId = toast.loading('Saving...');
    const res = await commitDeploymentToDatabase(deploymentData);
    if (res.success) {
      setHasChanges(false);
      setIsReadOnly(true);
      toast.success('Saved! Plan is now finalized.', { id: toastId });
    } else {
      toast.error(res.error || 'Failed', { id: toastId });
    }
  }, [deploymentData, setHasChanges, setIsReadOnly]);

  /** Discard the current draft and reload. */
  const handleClearDraft = useCallback(() => {
    setIsClearConfirmOpen(false);
    resetDraft();
    toast.success('Draft discarded');
    window.location.reload();
  }, [resetDraft]);

  /** Apply a local (in-memory) update to a single deployment entry. */
  const handleLocalUpdate = useCallback(
    (id: string, updates: Partial<ProposedSchedule>) => {
      if (isReadOnly) return;
      updateDeployment(id, updates);
    },
    [isReadOnly, updateDeployment],
  );

  /** Open the edit assignment modal for a specific team. */
  const openEditModal = useCallback(
    (team: ProposedSchedule) => {
      if (isReadOnly) {
        toast.info('This plan is finalized and cannot be edited.');
        return;
      }
      setEditingTeam({ ...team });
      setOriginalEditingTeam({ ...team });
      setIsEditOpen(true);
    },
    [isReadOnly],
  );

  /** Save the edit modal changes and close it. */
  const saveEdit = useCallback(() => {
    if (editingTeam) {
      updateDeployment(editingTeam.id, editingTeam);
      setIsEditOpen(false);
      setEditingTeam(null);
    }
  }, [editingTeam, updateDeployment]);

  /** Reset the editing team's coordinates to their original values. */
  const resetEditingLocation = useCallback(() => {
    if (editingTeam && originalEditingTeam) {
      setEditingTeam({
        ...editingTeam,
        lat: originalEditingTeam.lat,
        lng: originalEditingTeam.lng,
      });
      toast.info('Coordinates reset to original position');
    }
  }, [editingTeam, originalEditingTeam]);

  /** Toggle an officer in/out of the currently editing team. */
  const toggleOfficer = useCallback(
    (person: PersonnelWithRelations) => {
      if (!editingTeam) return;
      const exists = editingTeam.assignedPersonnel.find(
        (p) => p.id === person.id,
      );
      const newList = exists
        ? editingTeam.assignedPersonnel.filter((p) => p.id !== person.id)
        : [...editingTeam.assignedPersonnel, person];
      setEditingTeam({ ...editingTeam, assignedPersonnel: newList });
    },
    [editingTeam],
  );

  /** Toggle a barangay in/out of the currently editing team's coverage. */
  const toggleBarangay = useCallback(
    (barangay: string) => {
      if (!editingTeam) return;
      const exists = editingTeam.coverageAreas.includes(barangay);
      const newList = exists
        ? editingTeam.coverageAreas.filter((a) => a !== barangay)
        : [...editingTeam.coverageAreas, barangay];
      setEditingTeam({ ...editingTeam, coverageAreas: newList });
    },
    [editingTeam],
  );

  /** Generate and download an HTML-based Word or Excel document. */
  const handleExport = useCallback(
    (type: 'word' | 'excel') => {
      const groupedData: Record<string, ProposedSchedule[]> = {};
      const sortedData = [...deploymentData].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
      sortedData.forEach((row) => {
        const dateKey = format(new Date(row.date), 'yyyy-MM-dd');
        if (!groupedData[dateKey]) groupedData[dateKey] = [];
        groupedData[dateKey].push(row);
      });
      const sortedDates = Object.keys(groupedData).sort();

      const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>Deployment Schedule</title>
          <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
          <style>
            @page { size: landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            .page-break { page-break-before: always; }
            h2 { color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 4px; margin-top: 8px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
            th { background-color: #2b6cb0; color: white; padding: 6px 8px; text-align: left; font-size: 9pt; }
            td { padding: 5px 8px; font-size: 9pt; border: 1px solid #ccc; }
            tr:nth-child(even) { background-color: #f7fafc; }
          </style>
        </head>
        <body>
          ${sortedDates
            .map((dateKey, idx) => {
              const dayRows = groupedData[dateKey];
              const pageBreak = idx > 0 ? 'class="page-break"' : '';
              return `<div ${pageBreak}>
             <h2>${format(new Date(dayRows[0].date), 'EEEE, MMMM do, yyyy')}</h2>
             <table>
               <thead><tr><th>Shift</th><th>Vehicle</th><th>Personnel</th><th>Areas</th><th>Coords</th></tr></thead>
               <tbody>${dayRows
                 .map(
                   (r) => `<tr>
                 <td>${r.timeSlot}</td>
                 <td><b>${r.vehicleName}</b></td>
                 <td>${r.assignedPersonnel.map((p) => p.name).join(', ')}</td>
                 <td>${Array.isArray(r.coverageAreas) ? r.coverageAreas.join(', ') : ''}</td>
                 <td>${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</td>
               </tr>`,
                 )
                 .join('')}</tbody>
             </table>
            </div>`;
            })
            .join('')}
        </body></html>`;

      const mimeType =
        type === 'word' ? 'application/msword' : 'application/vnd.ms-excel';
      const extension = type === 'word' ? 'doc' : 'xls';
      const blob = new Blob([htmlContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Deployment_${format(selectedDate, 'yyyy-MM-dd')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [deploymentData, selectedDate],
  );

  /** Export a saved plan for a specific historical week. */
  const handleExportForDate = useCallback(
    async (weekStartDate: Date, type: 'word' | 'excel' = 'word') => {
      const toastId = toast.loading('Loading plan...');
      try {
        const res = await getDeploymentForDate(weekStartDate);
        if (!res.success || !res.data || res.data.length === 0) {
          toast.error('No data found for this week', { id: toastId });
          return;
        }
        toast.dismiss(toastId);
        const prevData = deploymentData;
        setDeploymentData(res.data);
        setTimeout(() => {
          handleExport(type);
          setDeploymentData(prevData);
        }, 50);
      } catch {
        toast.error('Export failed', { id: toastId });
      }
    },
    [deploymentData, setDeploymentData, handleExport],
  );

  return {
    isGenerating,
    editingTeam,
    isEditOpen,
    setIsEditOpen,
    isSaveConfirmOpen,
    setIsSaveConfirmOpen,
    isClearConfirmOpen,
    setIsClearConfirmOpen,
    isConfigOpen,
    setIsConfigOpen,
    handleGenerateWeek,
    handleCommit,
    handleClearDraft,
    handleLocalUpdate,
    openEditModal,
    saveEdit,
    resetEditingLocation,
    toggleOfficer,
    toggleBarangay,
    handleExport,
    handleExportForDate,
  };
}
