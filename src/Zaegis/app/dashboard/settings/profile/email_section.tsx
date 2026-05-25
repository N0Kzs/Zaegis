'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Message, User } from '@/app/types';
import { updateEmail } from '@/lib/actions/user';



interface Props {
  user: User;
  onUpdate: () => void;
  onMessage: (msg: Message) => void;
}

export function EmailSection({ user, onUpdate, onMessage }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.user_email);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    onMessage({ type: '', text: '' });

    try {
      const result = await updateEmail(email, password);

      if (result.success) {
        onMessage({ type: 'success', text: result.message || 'Email updated!' });
        setEditing(false);
        setPassword('');
        onUpdate();
      } else {
        onMessage({ type: 'error', text: result.error || 'Failed to update email' });
      }
    } catch (error) {
      onMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEmail(user.user_email);
    setPassword('');
    onMessage({ type: '', text: '' });
  };

  if (!editing) {
    return (
      <div className="border-b pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Email Address</h3>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Change Email
          </button>
        </div>
        <p className="text-foreground/80">{user.user_email}</p>
      </div>
    );
  }

  return (
    <div className="border-b pb-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Email Address</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            New Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Email'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 bg-muted text-foreground/80 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}