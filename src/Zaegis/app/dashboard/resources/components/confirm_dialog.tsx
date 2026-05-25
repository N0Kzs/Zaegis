/**
 * @file Reusable confirmation dialog shared across personnel and vehicle views.
 *
 * Renders a modal with a title, description, and confirm/cancel actions.
 * Supports `warning`, `info`, and `danger` visual variants.
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
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ConfirmationConfig } from '../types';

interface ConfirmDialogProps {
  config: ConfirmationConfig;
  isExecuting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  config,
  isExecuting,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={config.isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isExecuting}>
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
