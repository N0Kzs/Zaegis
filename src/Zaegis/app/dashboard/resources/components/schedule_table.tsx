/**
 * @file Presentational component for the duty roster table.
 *
 * Renders a filterable table of personnel with their assigned duty days
 * and an edit modal for toggling individual days.
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Edit, Loader2, Save, Filter, Check } from 'lucide-react';
import { DAYS_OF_WEEK } from '../types';
import type { UseScheduleReturn } from '../hooks/use_schedule';

interface ScheduleTableProps {
  schedule: UseScheduleReturn;
}

export default function ScheduleTable({ schedule }: ScheduleTableProps) {
  const {
    personnel,
    searchTerm,
    setSearchTerm,
    selectedDay,
    setSelectedDay,
    selectedDays,
    isSubmitting,
    isModalOpen,
    setIsModalOpen,
    handleEdit,
    toggleDay,
    handleSave,
  } = schedule;

  const filteredPersonnel = personnel.filter((p) => {
    const matchesSearch =
      `${p.firstName} ${p.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      p.position.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && p.isActive !== false;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-2">
            Showing status for <strong>{selectedDay}</strong>
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            placeholder="Search personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-background"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Personnel</TableHead>
              <TableHead>Assigned Days</TableHead>
              <TableHead>Status ({selectedDay})</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPersonnel.map((person) => {
              const dutyArr = person.dutyDays
                ? person.dutyDays.split(',')
                : [];
              const isWorkingToday = dutyArr.includes(
                selectedDay.slice(0, 3),
              );

              return (
                <TableRow key={person.id} className="hover:bg-muted/50/50">
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">
                        {person.firstName} {person.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person.position}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {dutyArr.length > 0 ? (
                        dutyArr.map((day) => (
                          <span
                            key={day}
                            className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border"
                          >
                            {day}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground/70 text-sm italic">
                          No days assigned
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isWorkingToday ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400">
                        On Duty
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground/90">
                        Off Duty
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(person)}
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredPersonnel.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No personnel found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit schedule modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Select the duty days for this officer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-3 block">
              Weekly Schedule
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day.slice(0, 3));
                return (
                  <div
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand/15 border-brand/30 text-brand'
                        : 'bg-card border-border hover:border-brand/30 hover:bg-muted/30'
                    }`}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-brand hover:bg-brand/90 text-brand-foreground"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
