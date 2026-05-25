/**
 * @file Vehicles orchestrator component.
 *
 * Wires the `useVehicles` hook to the presentational components:
 * VehicleGrid, VehicleFormDialog, ConfirmDialog, and a deactivation dialog.
 */

'use client';

import { useVehicles } from '../hooks/use_vehicles';
import VehicleGrid from './vehicle_grid';
import VehicleFormDialog from './vehicle_form_dialog';
import ConfirmDialog from './confirm_dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function VehiclesView() {
  const v = useVehicles();

  return (
    <>
      <VehicleGrid
        isLoading={v.isLoading}
        filteredCount={v.filteredVehicles.length}
        filteredVehicles={v.filteredVehicles}
        paginatedVehicles={v.paginatedVehicles}
        searchTerm={v.searchTerm}
        vehicleFilterType={v.vehicleFilterType}
        vehicleFilterAvailability={v.vehicleFilterAvailability}
        onSearchChange={v.setSearchTerm}
        onFilterType={v.setVehicleFilterType}
        onFilterAvailability={v.setVehicleFilterAvailability}
        onAdd={() => {
          v.resetForm();
          v.setIsModalOpen(true);
        }}
        onEdit={v.handleEdit}
        onToggleAvailability={v.handleToggleAvailability}
        onDeactivate={v.confirmDelete}
      />

      <VehicleFormDialog
        open={v.isModalOpen}
        onOpenChange={v.setIsModalOpen}
        formData={v.formData}
        onFormChange={v.setFormData}
        formErrors={v.formErrors}
        isEditing={!!v.editingItem}
        isSubmitting={v.isSubmitting}
        onSave={v.handleSave}
        onCancel={() => v.setIsModalOpen(false)}
      />

      <ConfirmDialog
        config={v.confirmation}
        isExecuting={v.isConfirmingAction}
        onClose={() =>
          v.setConfirmation({ ...v.confirmation, isOpen: false })
        }
        onConfirm={() => {
          v.setIsConfirmingAction(true);
          v.confirmation
            .action()
            .finally(() => v.setIsConfirmingAction(false));
        }}
      />

      <Dialog
        open={v.isConfirmDeleteOpen}
        onOpenChange={v.setIsConfirmDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{v.itemToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => v.setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={v.performDelete}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
