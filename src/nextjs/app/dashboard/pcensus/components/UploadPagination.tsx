/**
 * @file Shared pagination controls used by upload history lists.
 */

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function UploadPagination({
  currentPage, totalPages, totalItems, itemsPerPage, onPageChange,
}: UploadPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} uploads
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-brand hover:bg-brand/90 text-brand-foreground' : ''}`}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
