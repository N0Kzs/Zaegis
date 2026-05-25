import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DeploymentMapSkeleton() {
    return (
        <div className="bg-card rounded-xl border shadow-sm p-1 relative h-[600px] animate-pulse">
            <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-muted-foreground/20 border-t-brand rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground font-medium">Initializing Map...</p>
                </div>
            </div>
        </div>
    );
}

export function DeploymentTableSkeleton() {
    return (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-pulse mb-6">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-card text-muted-foreground text-xs uppercase border-b">
                    <tr>
                        <th className="px-4 py-3 font-medium w-40">Unit</th>
                        <th className="px-4 py-3 font-medium">Personnel</th>
                        <th className="px-4 py-3 font-medium w-64">Assigned Areas</th>
                        <th className="px-4 py-3 font-medium w-32">Coordinates</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {[1, 2, 3].map((i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-4 align-top">
                                <Skeleton className="h-4 w-24 mb-2" />
                            </td>
                            <td className="px-4 py-4 align-top">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-3 w-28" />
                                </div>
                            </td>
                            <td className="px-4 py-4 align-top">
                                <Skeleton className="h-4 w-full max-w-[200px]" />
                            </td>
                            <td className="px-4 py-4 align-top">
                                <Skeleton className="h-4 w-20" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function DeploymentControlsSkeleton() {
    return (
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm mb-6 animate-pulse">
            {/* Left: Date Nav */}
            <div className="flex gap-1 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <div key={i} className="w-14 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                ))}
            </div>

            {/* Right: Actions */}
            <div className="flex gap-2 w-full xl:w-auto justify-end">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
            </div>
        </div>
    );
}
