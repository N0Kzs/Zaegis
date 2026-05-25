/**
 * @file Reusable hook for shapefile upload, history fetching, and pagination.
 *
 * Shared between BoundaryUpload and ZoningUpload components to eliminate
 * the ~90% code duplication between them.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface UploadResult {
  success: boolean;
  message: string;
  featuresInserted?: number;
  errors?: string[];
}

export interface UseShapefileUploadOptions<T> {
  fetchHistory: () => Promise<{ success: boolean; data?: T[]; error?: string }>;
  uploadAction: (formData: FormData) => Promise<UploadResult>;
  itemsPerPage?: number;
}

export function useShapefileUpload<T>({
  fetchHistory,
  uploadAction,
  itemsPerPage = 10,
}: UseShapefileUploadOptions<T>) {
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadHistory, setUploadHistory] = useState<T[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetchHistory();
      if (res.success && res.data) {
        setUploadHistory(res.data);
      } else {
        toast.error('Could not load upload history. Please try again.');
      }
    } catch {
      toast.error('Could not load upload history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [fetchHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Wrong file type', {
        description: 'Please select a ZIP file that contains your shapefile.',
      });
      setSelectedFile(null);
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File is too large', { description: 'The file must be smaller than 50MB. Please try a smaller file.' });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setResult(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('No file selected', { description: 'Please choose a shapefile to upload before submitting.' });
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('shapefile', selectedFile);
      const response = await uploadAction(formData);
      setResult(response);

      if (response.success) {
        toast.success('Upload complete!', {
          description: response.featuresInserted
            ? `${response.featuresInserted} features inserted`
            : response.message,
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadHistory();
      } else {
        toast.error('Upload failed', { description: response.message });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setResult({ success: false, message: msg });
      toast.error('Upload failed. Please check the file and try again.', { description: msg });
    } finally {
      setUploading(false);
    }
  }, [selectedFile, uploadAction, loadHistory]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    handleReset();
  }, [handleReset]);

  const totalPages = Math.max(1, Math.ceil(uploadHistory.length / itemsPerPage));
  const paginatedHistory = uploadHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return {
    uploading, isModalOpen, setIsModalOpen, result,
    selectedFile, fileInputRef, uploadHistory, isLoadingHistory,
    currentPage, setCurrentPage, totalPages, paginatedHistory,
    handleFileChange, handleSubmit, handleReset,
    handleDropZoneClick, handleCloseModal, loadHistory,
  };
}
