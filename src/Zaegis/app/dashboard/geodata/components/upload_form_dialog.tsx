/**
 * @file Shared upload dialog used by both Boundary and Zoning upload views.
 */

'use client';

import {
  Upload, File, X, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { UploadResult } from '../hooks/use_shapefile_upload';

interface UploadFormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  selectedFile: File | null;
  uploading: boolean;
  result: UploadResult | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onDropZoneClick: () => void;
}

export function UploadFormDialog({
  open, onClose, title, description,
  selectedFile, uploading, result, fileInputRef,
  onFileChange, onSubmit, onReset, onDropZoneClick,
}: UploadFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            {!selectedFile ? (
              <div
                onClick={onDropZoneClick}
                className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-brand hover:bg-brand/10 transition-all"
              >
                <Upload className="w-12 h-12 text-muted-foreground/70 mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground/80 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">ZIP file containing .shp, .shx, .dbf, and .prj files (max 50MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={onFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-brand/10">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-brand/15 rounded flex-shrink-0">
                    <File size={20} className="text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground break-all line-clamp-1">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button" onClick={onReset} disabled={uploading}
                    className="text-muted-foreground hover:text-red-600 p-1.5 rounded hover:bg-red-500/10 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className={`rounded-lg p-4 border ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {result.success
                    ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold mb-1 ${result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                    {result.success ? 'Upload Successful!' : 'Upload Failed'}
                  </h3>
                  <p className={`text-sm ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{result.message}</p>
                  {result.featuresInserted !== undefined && (
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-2">Features inserted: {result.featuresInserted}</p>
                  )}
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-500/20">
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Warnings ({result.errors.length})</h4>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <span className="text-red-400 dark:text-red-500 mt-1">•</span>
                        <span className="flex-1">{err}</span>
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                        <span className="text-red-400 dark:text-red-500 mt-1">•</span>
                        <span className="flex-1">... and {result.errors.length - 10} more warnings</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={uploading || !selectedFile} className="bg-brand hover:bg-brand/90 text-brand-foreground">
              {uploading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Processing...</>
                : <><Upload className="w-4 h-4 mr-2" />Upload and Convert</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
