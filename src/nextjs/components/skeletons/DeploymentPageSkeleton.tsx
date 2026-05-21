import { Skeleton } from "@/components/ui/skeleton";

export function DeploymentPageSkeleton() {
    return (
        <div className="container mx-auto p-4 sm:p-6 min-h-screen">
            {/* Header & Mode Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <Skeleton className="h-10 w-48 rounded-lg" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm mb-6">
                <Skeleton className="h-10 w-full xl:w-72 rounded-lg" />
                <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                    <Skeleton className="h-9 w-24 rounded" />
                    <Skeleton className="h-9 w-32 rounded" />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Stats - Col 1 */}
                <div className="lg:col-span-1 hidden lg:block">
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content - Col 3 */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Tabs */}
                    <div className="grid grid-cols-7 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Skeleton key={i} className="h-16 rounded-lg" />
                        ))}
                    </div>

                    {/* Table Card */}
                    <div className="bg-card rounded-xl border border-border shadow-sm min-h-[500px]">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                            <div className="space-y-1">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-8 w-28 rounded" />
                        </div>
                        <div className="p-0">
                            <DeploymentTableSkeleton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DeploymentTableSkeleton() {
    return (
        <table className="w-full text-sm text-left animate-pulse">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                <tr>
                    <th className="px-6 py-3 font-medium">Time Slot</th>
                    <th className="px-6 py-3 font-medium">Team & Resources</th>
                    <th className="px-6 py-3 font-medium">Patrol Areas</th>
                    <th className="px-6 py-3 text-right w-24">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap w-[180px]">
                            <Skeleton className="h-5 w-32" />
                        </td>
                        <td className="px-6 py-4">
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                    <Skeleton className="h-6 w-24 rounded-full" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded" />
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex gap-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 w-full">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
