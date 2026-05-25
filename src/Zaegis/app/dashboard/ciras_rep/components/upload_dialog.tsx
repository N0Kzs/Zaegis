'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Trash2,
  File,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { UploadOutcome } from '../types';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: File | null;
  isUploading: boolean;
  uploadOutcome: UploadOutcome;
  feedbackMessage: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onDelete: () => void;
}

export default function UploadDialog({
  open,
  onOpenChange,
  selectedFile,
  isUploading,
  uploadOutcome,
  feedbackMessage,
  onFileChange,
  onUpload,
  onDelete,
}: UploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-brand hover:bg-brand/90 text-brand-foreground font-medium">
          <Upload size={16} className="mr-2" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Upload File
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {!selectedFile && uploadOutcome === 'idle' ? (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground/70" />
                <p className="text-sm font-medium text-foreground/80">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: XLSX, XLS
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={onFileChange}
                accept=".xlsx,.xls"
              />
            </div>
          ) : selectedFile ? (
            <div className="p-4 border border-border rounded-lg bg-brand/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand/15 rounded flex-shrink-0">
                  <File size={20} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-sm font-medium text-foreground break-all line-clamp-2"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
                  disabled={isUploading}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              {isUploading && (
                <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand animate-pulse"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          ) : null}

          {feedbackMessage && !isUploading && (
            <FeedbackBanner outcome={uploadOutcome} message={feedbackMessage} />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            className="font-medium"
          >
            Cancel
          </Button>
          <Button
            className="bg-brand hover:bg-brand/90 text-brand-foreground font-medium"
            onClick={onUpload}
            disabled={
              !selectedFile ||
              isUploading ||
              uploadOutcome === 'success' ||
              uploadOutcome === 'info' ||
              uploadOutcome === 'warn'
            }
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (uploadOutcome === 'success' ||
                uploadOutcome === 'warn' ||
                uploadOutcome === 'info') &&
              !selectedFile ? (
              <span className="flex items-center gap-2">
                <Check size={16} /> Processed
              </span>
            ) : (
              'Upload File'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Feedback banner sub-component
function FeedbackBanner({
  outcome,
  message,
}: {
  outcome: UploadOutcome;
  message: string;
}) {
  const styles: Record<string, string> = {
    success: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
    warn: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20',
    info: 'bg-brand/10 text-brand border border-brand/20',
    error: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
  };

  return (
    <div
      className={`mt-4 p-3 rounded-lg flex items-start gap-2.5 text-sm ${styles[outcome] || 'hidden'}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {outcome === 'success' && <Check size={16} />}
        {(outcome === 'warn' || outcome === 'info' || outcome === 'error') && (
          <AlertCircle size={16} />
        )}
      </div>
      <span className="break-words flex-1 leading-relaxed">{message}</span>
    </div>
  );
}
