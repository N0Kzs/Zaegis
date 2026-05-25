'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { getFileContents } from '@/lib/actions/crime';
import type { UploadHistoryEntry, FileContentRow } from '../types';
import { ITEMS_PER_PAGE } from '../types';

interface UseFileViewerReturn {
  selectedEntry: UploadHistoryEntry | null;
  modalOpen: boolean;
  fileContents: FileContentRow[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  paginatedContents: FileContentRow[];
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  openFile: (entry: UploadHistoryEntry) => void;
  closeModal: () => void;
}

export function useFileViewer(): UseFileViewerReturn {
  const [selectedEntry, setSelectedEntry] = useState<UploadHistoryEntry | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fileContents, setFileContents] = useState<FileContentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const openFile = useCallback(async (entry: UploadHistoryEntry) => {
    setSelectedEntry(entry);
    setModalOpen(true);
    setCurrentPage(1);

    try {
      setIsLoading(true);
      const data = await getFileContents(entry.id);
      setFileContents(data);
    } catch {
      toast.error('Failed to load file contents');
      setFileContents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const totalPages = Math.ceil(fileContents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedContents = useMemo(
    () => fileContents.slice(startIndex, endIndex),
    [fileContents, startIndex, endIndex],
  );

  return {
    selectedEntry,
    modalOpen,
    fileContents,
    isLoading,
    currentPage,
    totalPages,
    paginatedContents,
    startIndex,
    endIndex,
    setCurrentPage,
    openFile,
    closeModal,
  };
}
