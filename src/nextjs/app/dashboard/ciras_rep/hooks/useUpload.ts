'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { uploadCirasFile } from '@/lib/actions/crime';
import type { UploadOutcome } from '../types';

interface UseUploadReturn {
  selectedFile: File | null;
  isUploading: boolean;
  uploadOutcome: UploadOutcome;
  feedbackMessage: string | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => Promise<void>;
  handleDelete: () => void;
}

export function useUpload(onUploadComplete: () => void): UseUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadOutcome, setUploadOutcome] = useState<UploadOutcome>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpenInternal] = useState(false);

  const setDialogOpen = useCallback((open: boolean) => {
    setDialogOpenInternal(open);
    if (!open) {
      setSelectedFile(null);
      setUploadOutcome('idle');
      setFeedbackMessage(null);
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
          toast.error('Invalid file type', {
            description: 'Only .xlsx or .xls files are supported.',
          });
          setSelectedFile(null);
          return;
        }
        setSelectedFile(file);
        setUploadOutcome('idle');
        setFeedbackMessage(null);
      }
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadOutcome('idle');
    setFeedbackMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await uploadCirasFile(formData);

      setIsUploading(false);
      setFeedbackMessage(result.message);

      switch (result.status) {
        case 'success':
          toast.success('Upload Successful!', { description: result.message });
          setUploadOutcome('success');
          setSelectedFile(null);
          break;
        case 'partial_success_on_conflict':
          toast.warning('Partial Upload', { description: result.message });
          setUploadOutcome('warn');
          setSelectedFile(null);
          break;
        case 'success_all_records_exist_in_db':
        case 'success_all_new_identified_existed_on_conflict':
          toast.info('File Processed: No New Data', { description: result.message });
          setUploadOutcome('info');
          setSelectedFile(null);
          break;
        case 'success_no_unique_data_in_file':
          toast.info('File Processed', { description: result.message });
          setUploadOutcome('info');
          setSelectedFile(null);
          break;
        case 'error':
          toast.error('Upload Failed', { description: result.message });
          setUploadOutcome('error');
          break;
        default:
          toast.success('Process Completed', { description: result.message });
          setUploadOutcome('success');
          setSelectedFile(null);
          break;
      }
    } catch (error) {
      setIsUploading(false);
      setUploadOutcome('error');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred.';
      setFeedbackMessage(`Upload error: ${errorMessage}`);
      toast.error('Upload Failed', { description: errorMessage });
    } finally {
      onUploadComplete();
    }
  }, [selectedFile, onUploadComplete]);

  const handleDelete = useCallback(() => {
    setSelectedFile(null);
    setUploadOutcome('idle');
    setFeedbackMessage(null);
  }, []);

  return {
    selectedFile,
    isUploading,
    uploadOutcome,
    feedbackMessage,
    dialogOpen,
    setDialogOpen,
    handleFileChange,
    handleUpload,
    handleDelete,
  };
}
