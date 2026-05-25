import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FullUser {
  id: number;
  user_email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface EditUserModalProps {
  open: boolean;
  user: FullUser | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (user: FullUser) => void;
  isSubmitting: boolean;
}

const roles = [
  { value: 'operations', label: 'Operation', description: 'Can edit deployment plan' },
  { value: 'admin', label: 'Admin', description: 'Full access' },
];

export function EditUserModal({ open, user, onOpenChange, onUpdate, isSubmitting }: EditUserModalProps) {
  const [role, setRole] = useState(user?.role || 'viewer');

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  const handleUpdate = () => {
    if (user) {
      onUpdate({ ...user, role });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Edit User Permissions
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the user's role and permissions in the system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="edit-email"
              type="text"
              value={user?.user_email || ''}
              disabled
              className="bg-muted/30 text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role" className="text-sm font-medium text-foreground">
              Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {roles.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isSubmitting}
            className="bg-brand hover:bg-brand/90 text-brand-foreground"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}