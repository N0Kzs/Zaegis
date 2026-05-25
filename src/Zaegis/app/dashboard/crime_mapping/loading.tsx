// Skeleton loading state for the crime mapping page.

import { Skeleton } from '@/components/ui/skeleton';

export default function CrimeMapLoading() {
  return (
    <div className="container mx-auto p-4 sm:p-6 bg-card min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm mb-6 shrink-0 z-20">
        <div className="flex items-center gap-4 flex-wrap">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <div className="h-6 w-px bg-muted hidden sm:block" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap w-full xl:w-auto mt-2 xl:mt-0">
          <Skeleton className="h-10 w-full sm:w-[150px] rounded-lg" />
          <Skeleton className="h-10 w-full sm:w-[130px] rounded-lg" />
          <div className="h-6 w-px bg-muted hidden sm:block mx-1" />
          <Skeleton className="h-10 w-full xl:w-auto rounded-lg px-8" />
        </div>
      </div>

      <div className="w-full h-[calc(100vh-250px)] min-h-[600px] relative rounded-xl overflow-hidden border shadow-sm ring-1 ring-gray-100 bg-card p-1 animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-border border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground/70 font-medium">
            Initializing Map Engine...
          </p>
        </div>
      </div>
    </div>
  );
}
