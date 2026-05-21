import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div>
            <div className="py-6 px-4">
                <Skeleton className="h-8 w-48" />
            </div>
            <div className="p-2 space-y-4">
                {[1, 2].map((i) => (
                    <div
                        key={i}
                        className="bg-card rounded-lg shadow-sm p-6 border border-border"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-12 h-12 rounded-full" />
                                <div>
                                    <Skeleton className="h-6 w-40 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <Skeleton className="w-6 h-6 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
