/**
 * @file Population census data table with search, sort, pagination, and edit.
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PopulationData = {
  pop_id: number;
  correspondence_code?: string;
  barangays: string;
  type: string;
  population: number;
};

export default function PopulationTable() {
  const [populationData, setPopulationData] = useState<PopulationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBarangay, setSelectedBarangay] = useState<PopulationData | null>(null);
  const [editedPopulation, setEditedPopulation] = useState<number | ''>('');

  const pageSize = 10;

  const filteredAndSortedData = useMemo(() => {
    return populationData
      .filter((item) => item.barangays.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (sortAsc ? a.population - b.population : b.population - a.population));
  }, [populationData, search, sortAsc]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedData.slice(start, start + pageSize);
  }, [filteredAndSortedData, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search]);

  useEffect(() => {
    const fetchPopulation = async () => {
      try {
        const res = await fetch('/api/population');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setPopulationData(json.data);
        } else {
          toast.error('The data we received was in an unexpected format. Please refresh and try again.');
          setPopulationData([]);
        }
      } catch {
        toast.error('Could not load the population data. Please check your connection and try again.');
        setPopulationData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPopulation();
  }, []);

  const handleEdit = useCallback((item: PopulationData) => {
    setSelectedBarangay(item);
    setEditedPopulation(item.population);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedBarangay(null);
    setEditedPopulation('');
  }, []);

  const handleSave = async () => {
    if (!selectedBarangay) return;
    if (editedPopulation === '' || editedPopulation <= 0) {
      toast.error('Please enter a valid population count (must be greater than 0).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/population/${selectedBarangay.pop_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ population: Number(editedPopulation) }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update population');
      }

      await res.json();

      setPopulationData((prev) =>
        prev.map((item) =>
          item.pop_id === selectedBarangay.pop_id
            ? { ...item, population: Number(editedPopulation) }
            : item,
        ),
      );

      toast.success(`Population for ${selectedBarangay.barangays} has been updated.`);
      handleCloseDialog();
    } catch (error) {
      toast.error('Could not save the changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatPopulation = (population: number) => population.toLocaleString();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) handleSave();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">BARANGAY DEMOGRAPHICS</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and update population census data for all barangays
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">Total Barangays: {populationData.length}</div>
        <Input placeholder="Search barangay..." className="w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="rounded-lg border shadow-sm bg-card">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 w-full">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
            <div className="p-0">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-9 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barangay</TableHead>
                  <TableHead>10-Digit Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Population
                      {sortAsc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No barangays found matching &quot;{search}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.pop_id}>
                      <TableCell className="font-medium">{item.barangays}</TableCell>
                      <TableCell>{item.pop_id}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell>{formatPopulation(item.population)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedData.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length} barangays
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          <Dialog open={!!selectedBarangay} onOpenChange={handleCloseDialog}>
            <DialogContent onKeyDown={handleKeyDown}>
              <DialogHeader>
                <DialogTitle>Edit Population</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label htmlFor="barangay-name">Barangay</Label>
                  <Input id="barangay-name" value={selectedBarangay?.barangays || ''} disabled className="bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="barangay-type">Type</Label>
                  <Input id="barangay-type" value={selectedBarangay?.type || ''} disabled className="bg-muted/30" />
                </div>
                <div>
                  <Label htmlFor="population-input">Population</Label>
                  <Input
                    id="population-input" type="number" min="0" value={editedPopulation}
                    onChange={(e) => setEditedPopulation(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter population count" autoFocus
                  />
                  {editedPopulation !== '' && (
                    <p className="text-sm text-muted-foreground mt-1">Formatted: {formatPopulation(Number(editedPopulation))}</p>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving || editedPopulation === '' || editedPopulation <= 0}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
