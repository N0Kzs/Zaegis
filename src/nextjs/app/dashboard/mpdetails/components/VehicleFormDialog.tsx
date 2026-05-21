/**
 * @file Add / Edit dialog for vehicle records.
 *
 * Renders a form with vehicle name, type, capacity, plate number,
 * and an availability toggle (visible only in edit mode).
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import type { PatrolCar, VehicleType, VehicleFormErrors } from '../types';

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: PatrolCar;
  onFormChange: (data: PatrolCar) => void;
  formErrors: VehicleFormErrors;
  isEditing: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function VehicleFormDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  formErrors,
  isEditing,
  isSubmitting,
  onSave,
  onCancel,
}: VehicleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update vehicle details.'
              : 'Register a new vehicle to the fleet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle Name / ID</label>
            <input
              className={`flex h-10 w-full rounded-md border text-sm px-3 py-2 ${
                formErrors.name ? 'border-red-500' : 'border-border'
              }`}
              value={formData.name}
              onChange={(e) =>
                onFormChange({ ...formData, name: e.target.value })
              }
              placeholder="Patrol Car 01"
            />
            {formErrors.name && (
              <p className="text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          {/* Type + Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formData.type}
                onValueChange={(val: VehicleType) =>
                  onFormChange({ ...formData, type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patrol-car">Patrol Car</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity</label>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-border text-sm px-3 py-2"
                value={formData.capacity}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    capacity: parseInt(e.target.value) || 0,
                  })
                }
                min={1}
                max={10}
              />
            </div>
          </div>

          {/* Plate Number */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plate Number</label>
            <input
              className={`flex h-10 w-full rounded-md border text-sm px-3 py-2 ${
                formErrors.plateNumber ? 'border-red-500' : 'border-border'
              }`}
              value={formData.plateNumber}
              onChange={(e) =>
                onFormChange({ ...formData, plateNumber: e.target.value })
              }
              placeholder="ABC-1234"
              maxLength={8}
            />
            {formErrors.plateNumber && (
              <p className="text-xs text-red-500">{formErrors.plateNumber}</p>
            )}
          </div>

          {/* Availability toggle (edit mode only) */}
          {isEditing && (
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="isCarAvailable"
                checked={formData.isAvailable}
                onChange={(e) =>
                  onFormChange({ ...formData, isAvailable: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label
                htmlFor="isCarAvailable"
                className="text-sm font-medium leading-none"
              >
                Currently Available
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSubmitting}
            className="bg-brand hover:bg-brand/90 text-brand-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
