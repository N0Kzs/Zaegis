'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { File } from 'lucide-react';
import { Pagination } from './history_list';
import type { UploadHistoryEntry, FileContentRow } from '../types';

interface FileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntry: UploadHistoryEntry | null;
  fileContents: FileContentRow[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  paginatedContents: FileContentRow[];
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
}

export default function FileViewerModal({
  open,
  onOpenChange,
  selectedEntry,
  fileContents,
  isLoading,
  currentPage,
  totalPages,
  paginatedContents,
  startIndex,
  endIndex,
  onPageChange,
}: FileViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] w-full h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            File Contents: {selectedEntry?.filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <TableSkeleton />
          ) : fileContents.length === 0 ? (
            <div className="text-center py-12">
              <File size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                No data found in this file.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Blotter No</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Municipal</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Barangay</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Type of Place</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Date Reported</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Time Reported</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Date Committed</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Time Committed</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Incident Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Offense</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Offense Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Latitude</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Longitude</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedContents.map((row: any, index: number) => (
                    <tr key={index} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-foreground">{row.blotterno}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.municipal}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.barangay}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.typeofPlace}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.dateReported
                          ? new Date(row.dateReported).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.timeReported || '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.dateCommitted
                          ? new Date(row.dateCommitted).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.timeCommitted || '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{row.incidentType}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.offense || '-'}</td>
                      <td className="px-4 py-3 text-foreground/80">{row.offenseType || '-'}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.lat ? Number(row.lat).toFixed(6) : '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {row.lng ? Number(row.lng).toFixed(6) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="border-t pt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={fileContents.length}
                    label="records"
                    onPageChange={onPageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              Total Records:{' '}
              <span className="font-semibold text-brand">{fileContents.length}</span>
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 bg-muted rounded animate-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}
