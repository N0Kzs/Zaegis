import { Skeleton } from "@/components/ui/skeleton";
import { DeploymentTableSkeleton, DeploymentMapSkeleton } from "@/components/skeletons/DeploymentSkeletons";

export default function Loading() {
    return (
        <div className="min-h-screen bg-muted/30 font-sans text-foreground pb-20">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-card border-b px-6 py-4 sticky top-0 z-30 shadow-sm animate-pulse">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        5-MINUTE RESPONSE DEPLOYMENT
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Optimized tactical positioning and coverage.
                    </p>
                </div>
                <div className="bg-card p-1 rounded-lg border shadow-sm flex items-center">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md ml-1" />
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-6 space-y-6">
                <div className="space-y-6 animate-pulse">
                    {/* TOOLBAR */}
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3 w-full xl:w-auto">
                            <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-9 w-48 mx-1 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end flex-wrap">
                            <Skeleton className="h-9 w-8 rounded-md" />
                            <Skeleton className="h-9 w-32 rounded-md" />
                        </div>
                    </div>

                    {/* CONTENT TABS */}
                    <div className="space-y-4">
                        <div className="flex justify-end mb-4">
                            <div className="bg-muted p-1 rounded-lg flex gap-1">
                                <Skeleton className="h-8 w-28 rounded-md" />
                                <Skeleton className="h-8 w-32 rounded-md" />
                                <Skeleton className="h-8 w-32 rounded-md" />
                                <Skeleton className="h-8 w-28 rounded-md" />
                            </div>
                        </div>

                        {/* MAP VIEW SKELETON (Default View in 5MRT) */}
                        <div className="space-y-6">
                            {/* Date Selector Row */}
                            <div className="w-full">
                                <div className="grid grid-cols-7 w-full h-auto p-1 bg-card border shadow-sm rounded-xl gap-1">
                                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                        <Skeleton key={i} className="h-[68px] rounded-lg" />
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Map Skeleton */}
                            <div className="bg-card rounded-xl border shadow-sm p-1 relative h-[600px]">
                                <DeploymentMapSkeleton />
                            </div>

                            {/* Tables Below Map */}
                            <div className="pt-4 space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <Skeleton className="h-6 w-48 rounded" />
                                </div>
                                <DeploymentTableSkeleton />
                                <DeploymentTableSkeleton />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
