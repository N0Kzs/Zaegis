/**
 * @file Presentational component rendering the personnel list with search,
 * filters, pagination, and per-row action menus.
 */

'use client';

import {
  Plus,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Personnel, AvailabilityFilter } from '../types';

interface PersonnelListProps {
  isLoading: boolean;
  filteredCount: number;
  filteredPersonnel: Personnel[];
  paginatedPersonnel: Personnel[];
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  filterPosition: string;
  filterRole: string;
  filterAvailability: AvailabilityFilter;
  uniquePositions: string[];
  uniqueRoles: string[];
  onSearchChange: (v: string) => void;
  onFilterPosition: (v: string) => void;
  onFilterRole: (v: string) => void;
  onFilterAvailability: (v: AvailabilityFilter) => void;
  onPageChange: (v: number) => void;
  onAdd: () => void;
  onEdit: (person: Personnel) => void;
  onToggleAvailability: (id: number, current: boolean) => void;
  onDeactivate: (id: number, name: string) => void;
}

/** Loading skeleton shown while data is being fetched. */
function ListSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border border-border rounded-lg p-5 flex justify-between items-center"
          >
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PersonnelList({
  isLoading,
  filteredCount,
  filteredPersonnel,
  paginatedPersonnel,
  currentPage,
  totalPages,
  searchTerm,
  filterPosition,
  filterRole,
  filterAvailability,
  uniquePositions,
  uniqueRoles,
  onSearchChange,
  onFilterPosition,
  onFilterRole,
  onFilterAvailability,
  onPageChange,
  onAdd,
  onEdit,
  onToggleAvailability,
  onDeactivate,
}: PersonnelListProps) {
  if (isLoading) return <ListSkeleton />;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <span className="bg-brand/15 text-brand px-3 py-1 rounded-full text-sm font-semibold">
          {filteredCount} Active Records
        </span>
        <Button
          className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm"
          onClick={onAdd}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Personnel
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by name, position, role or contact..."
            className="w-full border border-border rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all bg-background"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={filterPosition} onValueChange={onFilterPosition}>
          <SelectTrigger className="w-full lg:w-[180px] border-border">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <SelectItem value="all">All Positions</SelectItem>
            {uniquePositions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={onFilterRole}>
          <SelectTrigger className="w-full lg:w-[180px] border-border">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <SelectItem value="all">All Roles</SelectItem>
            {uniqueRoles.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterAvailability}
          onValueChange={(v) => onFilterAvailability(v as AvailabilityFilter)}
        >
          <SelectTrigger className="w-full lg:w-[180px] border-border">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List body */}
      {filteredPersonnel.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg">
          <User className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">
            No personnel found
          </p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            {searchTerm || filterPosition !== 'all' || filterRole !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first personnel member to get started'}
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-3">
            {paginatedPersonnel.map((person) => (
              <div
                key={person.id ?? `${person.firstName}-${person.lastName}`}
                className="border border-border rounded-lg p-5 hover:shadow-md hover:border-brand/30 transition-all bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg text-foreground">
                        {person.firstName} {person.lastName}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          person.isAvailable
                            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {person.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded">
                        <span className="font-medium text-foreground">
                          Rank:
                        </span>{' '}
                        {person.position}
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded">
                        <span className="font-medium text-foreground">
                          Unit:
                        </span>{' '}
                        {person.role}
                      </div>
                      {person.contact && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground/70">•</span>
                          {person.contact}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(person)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          onToggleAvailability(
                            person.id!,
                            !!person.isAvailable,
                          )
                        }
                      >
                        {person.isAvailable ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Mark Unavailable
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Mark Available
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          onDeactivate(
                            person.id!,
                            `${person.firstName} ${person.lastName}`,
                          )
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
