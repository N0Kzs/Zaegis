'use client';

import { Button } from '@/components/ui/button';
import {
  File,
  Clock,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import type { UploadHistoryEntry } from '../types';

interface HistoryListProps {
  uploadHistory: UploadHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  paginatedHistory: UploadHistoryEntry[];
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onViewFile: (entry: UploadHistoryEntry) => void;
}

export default function HistoryList({
  uploadHistory,
  isLoading,
  error,
  currentPage,
  totalPages,
  paginatedHistory,
  startIndex,
  endIndex,
  onPageChange,
  onRefresh,
  onViewFile,
}: HistoryListProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">UPLOAD HISTORY</h2>
          <span className="bg-brand/15 text-brand px-3 py-1 rounded-full text-sm font-semibold">
            {uploadHistory.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Refresh history"
          disabled={isLoading}
        >
          <RefreshCw
            size={16}
            className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">
            Error loading history: {error}
          </p>
        </div>
      ) : isLoading ? (
        <HistorySkeleton />
      ) : uploadHistory.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground text-sm">No upload history found.</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            Upload a file to get started.
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-3">
            {paginatedHistory.map((entry) => (
              <div
                key={entry.fileHash}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="p-2 bg-brand/15 rounded flex-shrink-0">
                  <File size={20} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm text-foreground break-words mb-2"
                    title={entry.filename}
                  >
                    {entry.filename}
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(entry.uploadedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {' at '}
                      {new Date(entry.uploadedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={12} className="flex-shrink-0" />
                      <span className="text-brand font-medium">
                        {entry.uploader.user_email}
                      </span>
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewFile(entry)}
                  className="flex-shrink-0"
                >
                  <Eye size={16} className="mr-1" />
                  View
                </Button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={uploadHistory.length}
              label="uploads"
              onPageChange={onPageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Shared pagination controls
export function Pagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  label,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  label: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of{' '}
        {totalItems} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 p-0 ${
                currentPage === page ? 'bg-brand hover:bg-brand/90 text-brand-foreground' : ''
              }`}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-lg border border-border animate-pulse"
        >
          <div className="p-2 bg-muted rounded w-10 h-10 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="h-8 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
