/**
 * @file Add / Edit dialog for personnel records.
 *
 * Renders a form with first name, last name, rank, unit, contact,
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
import type { Personnel, Position, Role, PersonnelFormErrors } from '../types';

interface PersonnelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Personnel;
  onFormChange: (data: Personnel) => void;
  formErrors: PersonnelFormErrors;
  positions: Position[];
  roles: Role[];
  isEditing: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function PersonnelFormDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  formErrors,
  positions,
  roles,
  isEditing,
  isSubmitting,
  onSave,
  onCancel,
}: PersonnelFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Personnel' : 'Add Personnel'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Make changes to the personnel record.'
              : 'Add a new personnel record to the database.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <input
                className={`flex h-10 w-full rounded-md border text-sm px-3 py-2 ${
                  formErrors.firstName ? 'border-destructive' : 'border-border'
                }`}
                value={formData.firstName}
                onChange={(e) =>
                  onFormChange({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
              />
              {formErrors.firstName && (
                <p className="text-xs text-destructive">{formErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                className={`flex h-10 w-full rounded-md border text-sm px-3 py-2 ${
                  formErrors.lastName ? 'border-destructive' : 'border-border'
                }`}
                value={formData.lastName}
                onChange={(e) =>
                  onFormChange({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
              />
              {formErrors.lastName && (
                <p className="text-xs text-destructive">{formErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Rank */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rank / Position</label>
            <Select
              value={formData.positionId?.toString()}
              onValueChange={(val) =>
                onFormChange({ ...formData, positionId: parseInt(val) })
              }
            >
              <SelectTrigger
                className={formErrors.position ? 'border-destructive' : ''}
              >
                <SelectValue placeholder="Select Rank" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.position && (
              <p className="text-xs text-destructive">{formErrors.position}</p>
            )}
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit / Role</label>
            <Select
              value={formData.roleId?.toString()}
              onValueChange={(val) =>
                onFormChange({ ...formData, roleId: parseInt(val) })
              }
            >
              <SelectTrigger
                className={formErrors.role ? 'border-destructive' : ''}
              >
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.role && (
              <p className="text-xs text-destructive">{formErrors.role}</p>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact Number</label>
            <div className="relative">
              <input
                className={`flex h-10 w-full rounded-md border text-sm px-3 py-2 pl-10 ${
                  formErrors.contact ? 'border-destructive' : 'border-border'
                }`}
                value={formData.contact}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onFormChange({ ...formData, contact: val });
                }}
                placeholder="09123456789"
                maxLength={11}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                📞
              </span>
            </div>
            {formErrors.contact && (
              <p className="text-xs text-destructive">{formErrors.contact}</p>
            )}
          </div>

          {/* Availability toggle (edit mode only) */}
          {isEditing && (
            <div className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) =>
                  onFormChange({ ...formData, isAvailable: e.target.checked })
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label
                htmlFor="isAvailable"
                className="text-sm font-medium leading-none"
              >
                Currently Available for Deployment
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
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Record
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
