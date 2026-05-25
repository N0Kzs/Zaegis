import { Edit, Trash2, RefreshCw, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullUser {
  id: number;
  user_email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UserTableRowProps {
  user: FullUser;
  onEdit: (user: FullUser) => void;
  onToggleStatus: (userId: number, currentStatus: boolean) => void;
  onResetPassword: (userId: number, userEmail: string) => void;
}

const roleBadgeColors: Record<string, string> = {
  viewer: 'bg-muted text-foreground/80',
  editor: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  admin: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  chief: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export function UserTableRow({ user, onEdit, onToggleStatus, onResetPassword }: UserTableRowProps) {
  return (
    <tr className={`hover:bg-muted/30 transition-colors ${!user.isActive ? 'bg-red-500/5' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          user.isActive 
            ? 'bg-green-500/15 text-green-700 dark:text-green-400' 
            : 'bg-red-500/15 text-red-700 dark:text-red-400'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
        #{user.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80">
        {user.user_email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          roleBadgeColors[user.role] || 'bg-muted text-foreground/80'
        }`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          {user.isActive && (
            <>
              <button
                onClick={() => onResetPassword(user.id, user.user_email)}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 p-1.5 rounded hover:bg-orange-500/10 dark:hover:bg-orange-900/30 transition-colors"
                title="Reset password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(user)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1.5 rounded hover:bg-blue-500/10 dark:hover:bg-blue-900/30 transition-colors"
                title="Edit user"
              >
                <Edit className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => onToggleStatus(user.id, user.isActive)}
            className={`p-1.5 rounded transition-colors ${
              user.isActive 
                ? "text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-500/10 dark:hover:bg-red-900/30" 
                : "text-green-600 dark:text-green-400 hover:text-green-700 hover:bg-green-500/10 dark:hover:bg-green-900/30"
            }`}
            title={user.isActive ? "Deactivate user" : "Reactivate user"}
          >
            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}