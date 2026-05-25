import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Upload History Section */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-6 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>

                {/* List Skeleton */}
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="flex items-start gap-4 p-4 rounded-lg border border-border animate-pulse"
                        >
                            <div className="p-2 bg-muted rounded w-10 h-10 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                                <div className="h-3 bg-muted rounded w-1/3"></div>
                            </div>
                            <div className="h-8 w-16 bg-muted rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
