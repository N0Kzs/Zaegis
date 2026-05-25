import { Skeleton } from "@/components/ui/skeleton";

export default function AdministrationLoading() {
    return (
        <div className="min-h-screen p-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-10 w-32 rounded-md" />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 flex items-center gap-2">
                <Skeleton className="h-10 w-28 rounded-lg" />
                <Skeleton className="h-10 w-28 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-20" /></th>
                                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-32" /></th>
                                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-24" /></th>
                                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-32" /></th>
                                <th className="px-6 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                    <td className="px-6 py-4 flex justify-end gap-2">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
