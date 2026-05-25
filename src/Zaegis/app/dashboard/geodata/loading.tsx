import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            <div className="py-6 px-4 shrink-0">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col items-center justify-center text-center h-[350px] w-full max-w-xs mx-auto animate-pulse"
                        >
                            <div className="w-20 h-20 bg-muted rounded-full mb-6"></div>
                            <div className="h-8 w-32 bg-muted rounded-md mb-2"></div>
                            <div className="h-4 w-48 bg-muted rounded-md mt-2"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
