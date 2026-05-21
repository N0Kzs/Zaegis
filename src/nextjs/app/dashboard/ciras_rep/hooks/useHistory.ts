'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getUploadHistory } from '@/lib/actions/crime';
import type { UploadHistoryEntry } from '../types';
import { ITEMS_PER_PAGE } from '../types';

interface UseHistoryReturn {
  uploadHistory: UploadHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  paginatedHistory: UploadHistoryEntry[];
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  refresh: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUploadHistory();
      setUploadHistory(data);
    } catch (err) {
      setUploadHistory([]);
      setError(
        err instanceof Error ? err.message : 'Unknown error fetching history',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalPages = Math.ceil(uploadHistory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedHistory = useMemo(
    () => uploadHistory.slice(startIndex, endIndex),
    [uploadHistory, startIndex, endIndex],
  );

  return {
    uploadHistory,
    isLoading,
    error,
    currentPage,
    totalPages,
    paginatedHistory,
    startIndex,
    endIndex,
    setCurrentPage,
    refresh: fetchHistory,
  };
}
