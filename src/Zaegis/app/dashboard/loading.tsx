import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function Loading() {
    return (
        <div className="min-h-screen bg-muted/30/50 p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[350px]" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-[120px]" />
                    <Skeleton className="h-9 w-[120px]" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <Skeleton className="h-8 w-[60px] mb-1" />
                            <Skeleton className="h-4 w-[100px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Chart Skeleton */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <Skeleton className="h-6 w-[200px]" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-[100px]" />
                            <Skeleton className="h-9 w-[100px]" />
                            <Skeleton className="h-9 w-[100px]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>

            {/* Secondary Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[200px] mb-4" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-[100px]" />
                            <Skeleton className="h-9 w-[100px]" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full rounded-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-[200px] mb-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-6 w-6 rounded-full" />
                                        <Skeleton className="h-4 w-[150px]" />
                                    </div>
                                    <Skeleton className="h-4 w-[40px]" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
