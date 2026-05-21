import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="container mx-auto p-4 sm:p-6 bg-background min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground uppercase">
                        DEPLOYMENT PLAN
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage weekly patrol schedules and resource allocation
                    </p>
                </div>
                <div className="bg-card p-1 rounded-lg border shadow-sm flex items-center">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md ml-1" />
                </div>
            </div>

            <div className="space-y-6 animate-pulse mt-8">

                {/* Controls Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                    {/* Date picker skeleton */}
                    <div className="flex items-center bg-card border shadow-sm rounded-lg p-1.5 w-[300px]">
                        <Skeleton className="h-8 w-8 ml-1 rounded-md" />
                        <Skeleton className="h-6 w-full mx-4 rounded-md" />
                        <Skeleton className="h-8 w-8 mr-1 rounded-md" />
                    </div>

                    {/* Generate / Setting button skeleton */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 xl:w-9 rounded-md" />
                        <Skeleton className="h-10 w-[180px] rounded-md" />
                    </div>
                </div>

                {/* Schedule / Utilization toggle row */}
                <div className="flex justify-end w-full">
                    <div className="flex items-center bg-card border shadow-sm rounded-xl p-1 gap-1 w-[220px]">
                        <Skeleton className="h-9 w-1/2 rounded-lg" />
                        <Skeleton className="h-9 w-1/2 rounded-lg bg-transparent border-none" />
                    </div>
                </div>

                {/* Days Row */}
                <div className="bg-card border shadow-sm rounded-xl p-1 grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <Skeleton key={i} className={`h-[72px] rounded-lg ${i === 1 ? 'bg-brand/10 border-brand/20 border-2' : 'bg-transparent'}`} />
                    ))}
                </div>

                {/* Selected Day Content Card (Empty State Match) */}
                <div className="bg-card rounded-xl border shadow-sm mt-4 min-h-[400px]">
                    {/* Card Header */}
                    <div className="p-6 border-b flex justify-between items-center bg-card rounded-t-xl">
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-9 w-28 rounded-md" />
                    </div>

                    {/* Empty State Body Match */}
                    <div className="flex flex-col items-center justify-center py-20">
                        <Skeleton className="h-16 w-16 rounded-full mb-4" />
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

            </div>
        </div>
    );
}
