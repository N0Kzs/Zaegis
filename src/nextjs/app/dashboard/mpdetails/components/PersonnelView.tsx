/**
 * @file Personnel orchestrator component.
 *
 * Wires the `usePersonnel` hook to the presentational components:
 * PersonnelList, PersonnelFormDialog, ConfirmDialog, and a deactivation dialog.
 */

'use client';

import { usePersonnel } from '../hooks/usePersonnel';
import PersonnelList from './PersonnelList';
import PersonnelFormDialog from './PersonnelFormDialog';
import ConfirmDialog from './ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function PersonnelView() {
  const p = usePersonnel();

  return (
    <>
      <PersonnelList
        isLoading={p.isLoading}
        filteredCount={p.filteredPersonnel.length}
        filteredPersonnel={p.filteredPersonnel}
        paginatedPersonnel={p.paginatedPersonnel}
        currentPage={p.currentPage}
        totalPages={p.totalPages}
        searchTerm={p.searchTerm}
        filterPosition={p.filterPosition}
        filterRole={p.filterRole}
        filterAvailability={p.filterAvailability}
        uniquePositions={p.uniquePositions}
        uniqueRoles={p.uniqueRoles}
        onSearchChange={p.setSearchTerm}
        onFilterPosition={p.setFilterPosition}
        onFilterRole={p.setFilterRole}
        onFilterAvailability={p.setFilterAvailability}
        onPageChange={p.setCurrentPage}
        onAdd={() => {
          p.resetForm();
          p.setIsModalOpen(true);
        }}
        onEdit={p.handleEdit}
        onToggleAvailability={p.handleToggleAvailability}
        onDeactivate={p.confirmDelete}
      />

      <PersonnelFormDialog
        open={p.isModalOpen}
        onOpenChange={p.setIsModalOpen}
        formData={p.formData}
        onFormChange={p.setFormData}
        formErrors={p.formErrors}
        positions={p.positions}
        roles={p.roles}
        isEditing={!!p.editingItem}
        isSubmitting={p.isSubmitting}
        onSave={p.handleSave}
        onCancel={() => p.setIsModalOpen(false)}
      />

      <ConfirmDialog
        config={p.confirmation}
        isExecuting={p.isConfirmingAction}
        onClose={() =>
          p.setConfirmation({ ...p.confirmation, isOpen: false })
        }
        onConfirm={() => {
          p.setIsConfirmingAction(true);
          p.confirmation
            .action()
            .finally(() => p.setIsConfirmingAction(false));
        }}
      />

      {/* Deactivation dialog */}
      <Dialog
        open={p.isConfirmDeleteOpen}
        onOpenChange={p.setIsConfirmDeleteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Personnel</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{p.itemToDelete?.name}</strong>?
              <br />
              This action will hide them from active rosters but keep their
              history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => p.setIsConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={p.performDelete}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
