/**
 * @file Hook encapsulating hybrid deployment actions: generate, commit,
 * clear, edit, vehicle management, and document export.
 */

'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  generateWeeklyHybridDeployment,
  commitHybridDeploymentToDatabase,
} from '@/lib/optimization/hybrid-optimizer';
import { useHybridStore } from '@/lib/store/hybrid-store';
import { getRole } from '../utils';
import { TIME_BLOCKS_FULL } from '../utils';
import type { HybridSchedule } from '../types';

export interface UseHybridActionsReturn {
  isGenerating: boolean;
  editingShift: HybridSchedule | null;
  setEditingShift: (s: HybridSchedule | null) => void;
  isSaveConfirmOpen: boolean;
  setIsSaveConfirmOpen: (v: boolean) => void;
  isClearConfirmOpen: boolean;
  setIsClearConfirmOpen: (v: boolean) => void;
  isVehicleDialogOpen: boolean;
  setIsVehicleDialogOpen: (v: boolean) => void;
  handleGenerateWeek: () => Promise<void>;
  handleSaveLock: () => Promise<void>;
  handleClearDraft: () => void;
  handleShiftEdit: (updated: HybridSchedule) => void;
  handleAddVehicle: (vehicle: { id: number; name: string }) => void;
  handleRemoveVehicle: (vehicleId: number, vehicleName: string) => void;
  handleExport: (type: 'word' | 'excel') => void;
}

export function useHybridActions(): UseHybridActionsReturn {
  const store = useHybridStore();
  const {
    weeklySchedules, setWeeklySchedules,
    selectedDate, ignoreSchedule,
    setHasChanges, setIsReadOnly, setTabView,
    updateSchedule, resetDraft,
  } = store;

  const weekStart = (() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  })();

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingShift, setEditingShift] = useState<HybridSchedule | null>(null);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);

  /** Generate a full weekly hybrid deployment schedule. */
  const handleGenerateWeek = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateWeeklyHybridDeployment(weekStart, ignoreSchedule);
      if (result.success && result.data && result.data.length > 0) {
        setWeeklySchedules(result.data);
        setHasChanges(true);
        setIsReadOnly(false);
        setTabView('tactical');
        toast.success(`Deployment schedule ready — ${result.data.length} shifts generated for the week.`);
      } else {
        toast.error('No shifts could be generated. Please check that personnel and vehicles are available.');
      }
    } catch {
      toast.error('Something went wrong while generating the schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [weekStart, ignoreSchedule, setWeeklySchedules, setHasChanges, setIsReadOnly, setTabView]);

  /** Commit the current draft to the database. */
  const handleSaveLock = useCallback(async () => {
    setIsSaveConfirmOpen(false);
    const toastId = toast.loading('Saving your deployment plan...');
    const res = await commitHybridDeploymentToDatabase(weeklySchedules, selectedDate);
    if (res.success) {
      setHasChanges(false);
      setIsReadOnly(true);
      toast.success('Plan saved and locked successfully.', { id: toastId });
    } else {
      toast.error('Could not save the plan. Please try again.', { id: toastId });
    }
  }, [weeklySchedules, selectedDate, setHasChanges, setIsReadOnly]);

  /** Discard the current draft. */
  const handleClearDraft = useCallback(() => {
    setIsClearConfirmOpen(false);
    resetDraft();
    toast.success('Draft cleared. You can start fresh.');
  }, [resetDraft]);

  /** Apply an edit to a single shift entry. */
  const handleShiftEdit = useCallback(
    (updated: HybridSchedule) => {
      updateSchedule(updated.id, updated);
    },
    [updateSchedule],
  );

  /** Add a new vehicle to the deployment plan with empty shifts. */
  const handleAddVehicle = useCallback(
    (vehicle: { id: number; name: string }) => {
      const STATION_LAT = 10.7769;
      const STATION_LNG = 122.5447;
      const newShifts: HybridSchedule[] = [];

      weekDays.forEach((day) => {
        TIME_BLOCKS_FULL.forEach((slot) => {
          newShifts.push({
            id: `hybrid-added-${vehicle.id}-${format(day, 'yyyyMMdd')}-${slot}`,
            day: format(day, 'EEEE'),
            date: day,
            timeSlot: slot,
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            lat: STATION_LAT,
            lng: STATION_LNG,
            locationLabel: `Lat: ${STATION_LAT.toFixed(4)}, Lng: ${STATION_LNG.toFixed(4)}`,
            assignedPersonnel: [],
            coverageAreas: [],
            isActive: true,
          });
        });
      });

      setWeeklySchedules([...weeklySchedules, ...newShifts]);
      setHasChanges(true);
      toast.success(`${vehicle.name} has been added to the deployment plan.`);
    },
    [weekDays, weeklySchedules, setWeeklySchedules, setHasChanges],
  );

  /** Remove a vehicle and all its shifts from the plan. */
  const handleRemoveVehicle = useCallback(
    (vehicleId: number, vehicleName: string) => {
      setWeeklySchedules(weeklySchedules.filter((s) => s.vehicleId !== vehicleId));
      setHasChanges(true);
      toast.success(`${vehicleName} has been removed from the deployment plan.`);
    },
    [weeklySchedules, setWeeklySchedules, setHasChanges],
  );

  /** Generate and download an HTML-based Word or Excel document. */
  const handleExport = useCallback(
    (type: 'word' | 'excel') => {
      const groupedData: Record<string, HybridSchedule[]> = {};
      const sortedData = [...weeklySchedules].sort((a, b) => {
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
          <title>Hybrid Deployment</title>
          <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
          <style>
            @page WordSection1 { size: 29.7cm 21cm; mso-page-orientation: landscape; margin: 1.5cm; }
            body { font-family: Arial, sans-serif; font-size: 10pt; div.WordSection1 { page: WordSection1; } }
            h2 { color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 4px; margin-top: 4px; font-size: 13pt; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
            th { background-color: #2b6cb0; color: white; padding: 5px 8px; text-align: left; font-size: 9pt; }
            td { padding: 4px 8px; font-size: 9pt; border: 1px solid #bbb; vertical-align: top; }
            tr:nth-child(even) td { background-color: #f0f4f8; }
          </style>
        </head>
        <body>
          ${sortedDates.map((dateKey, idx) => {
            const dayRows = groupedData[dateKey];
            const pageBreak = idx > 0
              ? '<br style="mso-special-character:line-break;page-break-before:always" clear="all">'
              : '';
            return `${pageBreak}
             <h2>${format(new Date(dayRows[0].date), 'EEEE, MMMM do, yyyy')}</h2>
             <table>
               <thead><tr><th>Time Block</th><th>Vehicle</th><th>Personnel (Role)</th><th>Coverage Areas</th><th>Position</th></tr></thead>
               <tbody>${dayRows.map((r) => `<tr>
                 <td>${r.timeSlot}</td>
                 <td><b>${r.vehicleName}</b></td>
                 <td>${r.assignedPersonnel.map((p) => `${p.name} [${getRole(p)}]`).join('<br>')}${r.assignedPersonnel.length === 0 ? '<i style="color:#999">Unassigned</i>' : ''}</td>
                 <td>${Array.isArray(r.coverageAreas) ? r.coverageAreas.join(', ') : '—'}</td>
                 <td style="font-size:8pt;color:#555">${r.locationLabel}</td>
               </tr>`).join('')}</tbody>
             </table>`;
          }).join('')}
        </body></html>`;

      const mimeType = type === 'word' ? 'application/msword' : 'application/vnd.ms-excel';
      const extension = type === 'word' ? 'doc' : 'xls';
      const blob = new Blob([htmlContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Hybrid_Deployment_${format(selectedDate, 'yyyy-MM-dd')}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [weeklySchedules, selectedDate],
  );

  return {
    isGenerating, editingShift, setEditingShift,
    isSaveConfirmOpen, setIsSaveConfirmOpen,
    isClearConfirmOpen, setIsClearConfirmOpen,
    isVehicleDialogOpen, setIsVehicleDialogOpen,
    handleGenerateWeek, handleSaveLock, handleClearDraft,
    handleShiftEdit, handleAddVehicle, handleRemoveVehicle, handleExport,
  };
}
