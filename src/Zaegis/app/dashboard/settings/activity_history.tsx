"use client";

import { useState, useEffect } from "react";
import { getUserActivityLogs } from "@/lib/actions/user";
import { Activity, Filter, Calendar, Trash2, Edit, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  createdAt: Date;
  metadata?: any;
}

export default function ActivityHistory() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<{
    entity?: string;
    action?: string;
  }>({});

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getUserActivityLogs({
        limit: 50,
        ...filter,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-4 h-4" />;
      case "UPDATE":
        return <Edit className="w-4 h-4" />;
      case "DELETE":
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20";
      case "UPDATE":
        return "bg-brand/10 text-brand border-brand/20";
      case "DELETE":
        return "bg-destructive/15 text-destructive dark:text-red-400 border-destructive/20";
      default:
        return "bg-muted text-foreground/80 border-border";
    }
  };

  const entities = [
    { value: "", label: "All Types" },
    { value: "personnel", label: "Personnel" },
    { value: "patrolCar", label: "Patrol Cars" },
    { value: "population", label: "Population" },
    { value: "boundary", label: "Boundaries" },
    { value: "ciras_data", label: "Crime Data" },
    { value: "patrolSchedule", label: "Schedules" },
    { value: "user", label: "Users" },
  ];

  const actions = [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Created" },
    { value: "UPDATE", label: "Updated" },
    { value: "DELETE", label: "Deleted" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border flex items-center gap-4">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        
        {/* Timeline Items Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 flex items-start gap-4">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Activity History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your recent actions and changes ({total} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground/70" />
          <select
            value={filter.entity || ""}
            onChange={(e) => setFilter({ ...filter, entity: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-background"
          >
            {entities.map((entity) => (
              <option key={entity.value} value={entity.value}>
                {entity.label}
              </option>
            ))}
          </select>
          <select
            value={filter.action || ""}
            onChange={(e) => setFilter({ ...filter, action: e.target.value || undefined })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-background"
          >
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Timeline */}
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
          <Activity className="w-12 h-12 text-muted-foreground/70 mx-auto mb-3" />
          <p className="text-muted-foreground">No activity found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground/70">•</span>
                        <span className="text-xs text-muted-foreground">
                          {log.entity}
                        </span>
                        {log.entityId && (
                          <>
                            <span className="text-xs text-muted-foreground/70">•</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {log.entityId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full border ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </div>

                  {/* Metadata (if you want to show changes) */}
                  {log.metadata && log.metadata.changes && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/80">
                        View details
                      </summary>
                      <div className="mt-2 text-xs bg-muted/30 rounded p-2 border border-border">
                        <pre className="overflow-x-auto">
                          {JSON.stringify(log.metadata.changes, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}