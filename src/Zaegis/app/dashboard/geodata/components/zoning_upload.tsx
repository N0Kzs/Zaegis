/**
 * @file Zoning shapefile upload view — refactored to use shared hook and components.
 */

'use client';

import { useCallback } from 'react';
import { Layers, Clock, RefreshCw, Upload, BarChart3, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getZoningUploadHistory, uploadZoningShapefileAction } from '@/lib/actions/geo';
import { useShapefileUpload } from '../hooks/use_shapefile_upload';
import { UploadFormDialog } from './upload_form_dialog';
import { UploadPagination } from './upload_pagination';

interface ZoningHistoryEntry {
  id: number;
  filename: string;
  featuresInserted: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  uploadedAt: string;
  uploader: { id: number; user_email: string };
}

const ZONING_CLASSIFICATIONS = [
  { code: 'R1-Z', name: 'Residential Zone 1', color: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  { code: 'R2-Z', name: 'Residential Zone 2', color: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  { code: 'R3-Z', name: 'Residential Zone 3', color: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  { code: 'C1-Z', name: 'Commercial Zone 1', color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  { code: 'C2-Z', name: 'Commercial Zone 2', color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  { code: 'C3-Z', name: 'Commercial Zone 3', color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
  { code: 'I1-Z', name: 'Industrial Zone 1', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
  { code: 'I3-Z', name: 'Industrial Zone 3', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
  { code: 'GInZ', name: 'General Institutional', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  { code: 'PRZ', name: 'Park & Recreation', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  { code: 'AGZ', name: 'Agricultural Zone', color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400' },
  { code: 'PUDZ', name: 'Planned-Unit Development', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400' },
  { code: 'SHZ', name: 'Socialized Housing', color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400' },
  { code: 'TZ', name: 'Tourism Zone', color: 'bg-pink-500/15 text-pink-700 dark:text-pink-400' },
  { code: 'AgIndZ', name: 'Agri-Industrial Zone', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  { code: 'SAFDZ', name: 'Strategic Agri & Fisheries', color: 'bg-lime-500/15 text-lime-700 dark:text-lime-400' },
];

export default function ZoningUpload() {
  const fetchHistory = useCallback(async () => {
    const res = await getZoningUploadHistory();
    return { success: res.success, data: res.data as ZoningHistoryEntry[] | undefined, error: res.error };
  }, []);

  const upload = useShapefileUpload<ZoningHistoryEntry>({
    fetchHistory,
    uploadAction: uploadZoningShapefileAction,
  });

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">ZONING MANAGEMENT</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Upload and manage Pavia zoning classification shapefiles (2017-2026 CLUP)
              </p>
            </div>
            <Button onClick={() => upload.setIsModalOpen(true)} className="bg-brand hover:bg-brand/90 text-brand-foreground w-full md:w-auto">
              <Upload className="w-4 h-4 mr-2" /> Upload Zoning Shapefile
            </Button>
          </div>
        </div>

        {/* Zone Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Zones</p>
                <p className="text-3xl font-bold text-foreground">18</p>
              </div>
              <div className="p-3 bg-brand/10 rounded-lg"><Layers className="w-6 h-6 text-brand" /></div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Land Use Categories</p>
                <p className="text-3xl font-bold text-foreground">12</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg"><BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan Period</p>
                <p className="text-2xl font-bold text-foreground">2017-2026</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg"><Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" /></div>
            </div>
          </div>
        </div>

        {/* Zoning Classifications */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">PAVIA ZONING CLASSIFICATIONS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ZONING_CLASSIFICATIONS.map((zone) => (
              <div key={zone.code} className="flex items-center gap-2 p-2 rounded border border-border">
                <span className={`px-2 py-1 rounded text-xs font-bold ${zone.color}`}>{zone.code}</span>
                <span className="text-xs text-muted-foreground truncate">{zone.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upload History */}
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
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : upload.uploadHistory.length === 0 ? (
            <div className="text-center py-16">
              <Layers size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">No upload history found.</p>
              <p className="text-muted-foreground/70 text-xs mt-1">Upload a zoning shapefile to get started.</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {upload.paginatedHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="p-2 bg-brand/15 rounded flex-shrink-0">
                      <Layers size={20} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground break-words mb-2" title={entry.filename}>
                        {entry.filename}
                      </p>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(entry.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' at '}
                          {new Date(entry.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {entry.featuresInserted !== null && (
                          <span className="text-green-600 dark:text-green-400 font-medium">Features: {entry.featuresInserted}</span>
                        )}
                        {entry.metadata?.totalFeatures && (
                          <span className="text-muted-foreground">Total processed: {entry.metadata.totalFeatures}</span>
                        )}
                        {entry.metadata?.errors > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">Warnings: {entry.metadata.errors}</span>
                        )}
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
          title="Upload Zoning Shapefile"
          description="Upload a ZIP file containing Pavia zoning shapefile components (2017-2026 CLUP)"
          selectedFile={upload.selectedFile} uploading={upload.uploading}
          result={upload.result} fileInputRef={upload.fileInputRef}
          onFileChange={upload.handleFileChange} onSubmit={upload.handleSubmit}
          onReset={upload.handleReset} onDropZoneClick={upload.handleDropZoneClick}
        />
      </div>
    </div>
  );
}
