import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-muted/30/50">
            <div className="py-6 px-8 shrink-0">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-card rounded-xl shadow-sm border border-border p-8 flex flex-col items-center justify-center text-center h-[350px] w-full"
                        >
                            <Skeleton className="w-20 h-20 rounded-full mb-6" />
                            <Skeleton className="h-8 w-32 mb-2" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
