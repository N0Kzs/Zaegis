/**
 * @file Boundary shapefile upload view — refactored to use shared hook and components.
 */

'use client';

import { useCallback } from 'react';
import { MapPin, Clock, RefreshCw, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadShapefileAction, getShapefileUploadHistory } from '@/lib/actions/geo';
import { useShapefileUpload } from '../hooks/useShapefileUpload';
import { UploadFormDialog } from './UploadFormDialog';
import { UploadPagination } from './UploadPagination';

interface BoundaryHistoryEntry {
  id: number;
  filename: string;
  uploadedAt: Date;
  uploadedBy: number;
  uploader: { id: number; user_email: string };
}

export default function BoundaryUpload() {
  const fetchHistory = useCallback(async () => {
    const res = await getShapefileUploadHistory();
    return { success: res.success, data: res.data as BoundaryHistoryEntry[] | undefined, error: res.error };
  }, []);

  const upload = useShapefileUpload<BoundaryHistoryEntry>({
    fetchHistory,
    uploadAction: uploadShapefileAction,
  });

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">BOUNDARY SHAPEFILE MANAGEMENT</h1>
            <Button onClick={() => upload.setIsModalOpen(true)} className="bg-brand hover:bg-brand/90 text-brand-foreground w-full md:w-auto">
              <Upload className="w-4 h-4 mr-2" /> Upload Shapefile
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">Upload and manage barangay boundary shapefiles</p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">UPLOAD HISTORY</h2>
              <span className="bg-brand/15 text-brand px-3 py-1 rounded-full text-sm font-semibold">
                {upload.uploadHistory.length}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={upload.loadHistory}
              className="text-muted-foreground hover:text-foreground hover:bg-muted" disabled={upload.isLoadingHistory}>
              <RefreshCw size={16} className={`mr-2 ${upload.isLoadingHistory ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          {upload.isLoadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border animate-pulse">
                  <div className="p-2 bg-muted rounded w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : upload.uploadHistory.length === 0 ? (
            <div className="text-center py-16">
              <MapPin size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">No upload history found.</p>
              <p className="text-muted-foreground/70 text-xs mt-1">Upload a shapefile to get started.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {upload.paginatedHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="p-2 bg-brand/15 rounded flex-shrink-0">
                      <MapPin size={20} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground break-words mb-2" title={entry.filename}>
                        {entry.filename}
                      </p>
                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="flex-shrink-0" />
                          {new Date(entry.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' at '}
                          {new Date(entry.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User size={12} className="flex-shrink-0" />
                          <span className="text-brand font-medium">{entry.uploader.user_email}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <UploadPagination
                currentPage={upload.currentPage} totalPages={upload.totalPages}
                totalItems={upload.uploadHistory.length} itemsPerPage={10}
                onPageChange={upload.setCurrentPage}
              />
            </div>
          )}
        </div>

        <UploadFormDialog
          open={upload.isModalOpen} onClose={upload.handleCloseModal}
          title="Upload Boundary Shapefile"
          description="Upload a ZIP file containing shapefile components (.shp, .shx, .dbf, .prj)"
          selectedFile={upload.selectedFile} uploading={upload.uploading}
          result={upload.result} fileInputRef={upload.fileInputRef}
          onFileChange={upload.handleFileChange} onSubmit={upload.handleSubmit}
          onReset={upload.handleReset} onDropZoneClick={upload.handleDropZoneClick}
        />
      </div>
    </div>
  );
}
