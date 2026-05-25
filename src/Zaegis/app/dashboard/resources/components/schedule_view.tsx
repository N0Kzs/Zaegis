/**
 * @file Schedule orchestrator component.
 *
 * Wires the `useSchedule` hook to the ScheduleTable presentational component.
 * Displays a loading skeleton while data is being fetched.
 */

'use client';

import { useSchedule } from '../hooks/use_schedule';
import ScheduleTable from './schedule_table';
import { Skeleton } from '@/components/ui/skeleton';

export default function ScheduleView() {
  const schedule = useSchedule();

  if (schedule.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border border-border">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30 flex gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-10 ml-auto" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 border-b flex items-center justify-between"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-12" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
      <ScheduleTable schedule={schedule} />
    </div>
  );
}
