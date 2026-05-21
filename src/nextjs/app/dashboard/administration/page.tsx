'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import AdministrationLoading from './loading';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddUserModal } from './components/AddUserModal';
import { EditUserModal } from './components/EditUserModal';
import { CredentialsModal } from './components/CredentialsModal';
import { UserTableRow } from './components/UserTableRow';
import { toast } from 'sonner';
import {
  getUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  resetUserPassword,
} from '@/lib/actions/user';

interface FullUser {
  id: number;
  user_email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface GeneratedCredentials {
  id: number;
  email: string;
  password: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';

const ITEMS_PER_PAGE = 10;

export default function AdministrationPage() {
  const [users, setUsers] = useState<FullUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<FullUser | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation dialogs
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showToggleStatusDialog, setShowToggleStatusDialog] = useState(false);
  const [userToReset, setUserToReset] = useState<{ id: number; email: string } | null>(null);
  const [userToToggle, setUserToToggle] = useState<{ id: number; email: string; isActive: boolean } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success && result.data) {
        setUsers(result.data as FullUser[]);
      } else {
        toast.error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filterStatus === 'active') return user.isActive;
    if (filterStatus === 'inactive') return !user.isActive;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddUser = async (newUser: { email: string; role: string }) => {
    setIsSubmitting(true);
    try {
      const result = await createUser(newUser);

      if (result.success && result.data) {
        setGeneratedCredentials({
          id: result.data.user.id,
          email: result.data.user.user_email,
          password: result.data.password,
        });

        setUsers([result.data.user as FullUser, ...users]);
        setShowAddModal(false);
        setShowCredentialsModal(true);
        toast.success('User created successfully');
      } else {
        toast.error(result.error || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (userId: number, userEmail: string) => {
    setUserToReset({ id: userId, email: userEmail });
    setShowResetPasswordDialog(true);
  };

  const confirmResetPassword = async () => {
    if (!userToReset) return;

    try {
      const result = await resetUserPassword(userToReset.id);

      if (result.success && result.data) {
        setGeneratedCredentials({
          id: userToReset.id,
          email: userToReset.email,
          password: result.data.password
        });
        setShowCredentialsModal(true);
        toast.success('Password reset successfully');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Failed to reset password');
    } finally {
      setShowResetPasswordDialog(false);
      setUserToReset(null);
    }
  };

  const handleEditUser = (user: FullUser) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (updatedUser: FullUser) => {
    setIsSubmitting(true);
    try {
      const result = await updateUserRole(updatedUser.id, updatedUser.role);

      if (result.success && result.data) {
        setUsers(users.map(u => u.id === updatedUser.id ? result.data as FullUser : u));
        setShowEditModal(false);
        setEditingUser(null);
        toast.success('User updated successfully');
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, userEmail: string, currentStatus: boolean) => {
    setUserToToggle({ id: userId, email: userEmail, isActive: currentStatus });
    setShowToggleStatusDialog(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;

    const action = userToToggle.isActive ? 'deactivate' : 'reactivate';

    try {
      const result = await toggleUserStatus(userToToggle.id, !userToToggle.isActive);

      if (result.success && result.data) {
        setUsers(users.map(u => u.id === userToToggle.id ? result.data as FullUser : u));
        toast.success(`User ${action}d successfully`);
      } else {
        toast.error(result.error || `Failed to ${action} user`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    } finally {
      setShowToggleStatusDialog(false);
      setUserToToggle(null);
    }
  };

  if (loading) return <AdministrationLoading />;

  return (
    <div className="min-h-screen p-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              USER ADMINISTRATION
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage users and their roles
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-brand hover:bg-brand/90 text-brand-foreground"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => {
            setFilterStatus('active');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterStatus === 'active'
            ? 'bg-brand text-brand-foreground'
            : 'bg-card text-foreground/80 hover:bg-muted/50 border border-border'
            }`}
        >
          Active ({users.filter(u => u.isActive).length})
        </button>
        <button
          onClick={() => {
            setFilterStatus('inactive');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterStatus === 'inactive'
            ? 'bg-brand text-brand-foreground'
            : 'bg-card text-foreground/80 hover:bg-muted/50 border border-border'
            }`}
        >
          Inactive ({users.filter(u => !u.isActive).length})
        </button>
        <button
          onClick={() => {
            setFilterStatus('all');
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterStatus === 'all'
            ? 'bg-brand text-brand-foreground'
            : 'bg-card text-foreground/80 hover:bg-muted/50 border border-border'
            }`}
        >
          All Users ({users.length})
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {filterStatus === 'active' && 'No active users found.'}
                      {filterStatus === 'inactive' && 'No inactive users found.'}
                      {filterStatus === 'all' && 'No users found. Click "Add User" to create your first user.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onEdit={handleEditUser}
                    onToggleStatus={(userId, currentStatus) => handleToggleUserStatus(userId, user.user_email, currentStatus)}
                    onResetPassword={handleResetPassword}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
              {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 p-0 ${currentPage === page ? "bg-brand hover:bg-brand/90 text-brand-foreground" : ""
                      }`}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={handleAddUser}
        isSubmitting={isSubmitting}
      />

      <EditUserModal
        open={showEditModal}
        user={editingUser}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setEditingUser(null);
        }}
        onUpdate={handleUpdateUser}
        isSubmitting={isSubmitting}
      />

      <CredentialsModal
        credentials={generatedCredentials}
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
      />

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to reset the password for this user?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-foreground/80">
              User: <span className="font-semibold">{userToReset?.email}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A new random password will be generated. You'll be able to view and copy it after confirmation.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowResetPasswordDialog(false);
                setUserToReset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResetPassword}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirmation Dialog */}
      <Dialog open={showToggleStatusDialog} onOpenChange={setShowToggleStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              {userToToggle?.isActive ? 'Deactivate User' : 'Reactivate User'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to {userToToggle?.isActive ? 'deactivate' : 'reactivate'} this user?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-foreground/80">
              User: <span className="font-semibold">{userToToggle?.email}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {userToToggle?.isActive
                ? 'This user will no longer be able to log in to the system.'
                : 'This user will regain access to the system.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowToggleStatusDialog(false);
                setUserToToggle(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmToggleStatus}
              className={userToToggle?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {userToToggle?.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}