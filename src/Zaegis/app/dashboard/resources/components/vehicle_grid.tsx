/**
 * @file Presentational component rendering the vehicle grid with search,
 * filters, and per-card action menus.
 */

'use client';

import {
  Plus,
  Car,
  Search,
  Edit,
  Trash2,
  Truck,
  MoreVertical,
  CircleOff,
  CheckCircle2,
  User,
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
import type { PatrolCar, VehicleType, AvailabilityFilter } from '../types';

interface VehicleGridProps {
  isLoading: boolean;
  filteredCount: number;
  filteredVehicles: PatrolCar[];
  paginatedVehicles: PatrolCar[];
  searchTerm: string;
  vehicleFilterType: 'all' | VehicleType;
  vehicleFilterAvailability: AvailabilityFilter;
  onSearchChange: (v: string) => void;
  onFilterType: (v: 'all' | VehicleType) => void;
  onFilterAvailability: (v: AvailabilityFilter) => void;
  onAdd: () => void;
  onEdit: (car: PatrolCar) => void;
  onToggleAvailability: (id: number, current: boolean) => void;
  onDeactivate: (id: number, name: string) => void;
}

/** Loading skeleton shown while data is being fetched. */
function GridSkeleton() {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="border border-border rounded-lg p-5 h-[200px] flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between mb-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleGrid({
  isLoading,
  filteredCount,
  filteredVehicles,
  paginatedVehicles,
  searchTerm,
  vehicleFilterType,
  vehicleFilterAvailability,
  onSearchChange,
  onFilterType,
  onFilterAvailability,
  onAdd,
  onEdit,
  onToggleAvailability,
  onDeactivate,
}: VehicleGridProps) {
  if (isLoading) return <GridSkeleton />;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <span className="bg-brand/15 text-brand px-3 py-1 rounded-full text-sm font-semibold">
          {filteredCount} Units
        </span>
        <Button
          className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm"
          onClick={onAdd}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by name or plate number..."
            className="w-full border border-border rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all bg-background"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select
          value={vehicleFilterType}
          onValueChange={(v) => onFilterType(v as 'all' | VehicleType)}
        >
          <SelectTrigger className="w-full lg:w-[180px] border-border">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="patrol-car">Patrol Car</SelectItem>
            <SelectItem value="motorcycle">Motorcycle</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={vehicleFilterAvailability}
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

      {/* Grid body */}
      {filteredVehicles.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg">
          <Car className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">
            No vehicles found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedVehicles.map((car) => (
            <div
              key={car.id}
              className="border border-border rounded-lg p-5 hover:shadow-md hover:border-brand/30 transition-all bg-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      car.type === 'patrol-car'
                        ? 'bg-brand/15 text-brand'
                        : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {car.type === 'patrol-car' ? (
                      <Car className="w-6 h-6" />
                    ) : (
                      <Truck className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      car.isAvailable
                        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {car.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground mb-1">
                  {car.name}
                </h3>
                <p className="text-sm font-mono text-muted-foreground bg-muted inline-block px-2 py-1 rounded">
                  {car.plateNumber}
                </p>
                <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Capacity: {car.capacity} officers</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(car)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        onToggleAvailability(car.id!, !!car.isAvailable)
                      }
                    >
                      {car.isAvailable ? (
                        <>
                          <CircleOff className="mr-2 h-4 w-4" />
                          Mark Unavailable
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Available
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeactivate(car.id!, car.name)}
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
      )}
    </div>
  );
}
