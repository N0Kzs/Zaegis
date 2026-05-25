import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-muted/30 font-sans text-foreground pb-20">
            {/* HEADER ROW */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-card border-b px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 uppercase">
                        HYBRID DEPLOYMENT PLAN
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Optimized Deployment drafting with 5MRT spatial targeting
                    </p>
                </div>
                <div className="bg-muted p-1 rounded-lg flex gap-2">
                    <Skeleton className="h-9 w-[130px] rounded-md" />
                    <Skeleton className="h-9 w-[130px] rounded-md" />
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 space-y-6 animate-pulse mt-8">

                {/* Controls Row */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    {/* Date picker skeleton */}
                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        <div className="flex items-center bg-muted/30 border shadow-sm rounded-lg p-1 w-[320px]">
                            <Skeleton className="h-8 w-8 ml-1 rounded-md" />
                            <Skeleton className="h-6 w-full mx-4 rounded-md bg-transparent border-none" />
                            <Skeleton className="h-8 w-8 mr-1 rounded-md" />
                        </div>
                    </div>

                    {/* Generate / Setting button skeleton */}
                    <div className="flex items-center gap-2 w-full xl:w-auto justify-end flex-wrap">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-9 w-[180px] rounded-md" />
                    </div>
                </div>

                {/* Schedule / Utilization toggle row */}
                <div className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <div className="bg-muted p-1 rounded-lg flex gap-1 w-[480px]">
                            <Skeleton className="h-8 w-[116px] rounded-md" />
                            <Skeleton className="h-8 w-[116px] rounded-md" />
                            <Skeleton className="h-8 w-[116px] rounded-md" />
                            <Skeleton className="h-8 w-[116px] rounded-md" />
                        </div>
                    </div>

                    {/* Days Row */}
                    <div className="w-full mb-6">
                        <div className="grid grid-cols-7 w-full h-auto p-1 bg-card border shadow-sm rounded-xl gap-1">
                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <Skeleton key={i} className={`h-[68px] rounded-lg ${i === 1 ? 'bg-brand/5 border-brand/20 border-2' : 'bg-transparent'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Selected Day Content Card (Empty State Match) */}
                    <div className="space-y-6">
                        <div className="text-center py-16 bg-card rounded-xl border shadow-sm border-dashed">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Skeleton className="w-8 h-8 rounded-full" />
                            </div>
                            <Skeleton className="h-6 w-56 mx-auto mb-2" />
                            <Skeleton className="h-4 w-96 mx-auto max-w-md" />
                            <Skeleton className="h-4 w-72 mx-auto mt-2 max-w-md" />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
