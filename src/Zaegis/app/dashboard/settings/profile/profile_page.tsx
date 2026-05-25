'use client';
import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { EmailSection } from './email_section';
import { PasswordSection } from './password_section';
import { User as UserType, Message } from '@/app/types';
import { getUser } from '@/lib/actions/user';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileTab() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>({ type: '', text: '' });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const result = await getUser();
      if (result.success && result.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="w-5 h-5 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md mt-2" />
            </div>
            <div className="space-y-4 pt-6 border-t border-border">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-8 text-red-600">Failed to load user data</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">

      <div className="bg-card rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-2xl font-semibold text-foreground">Personal Information</h2>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-3 rounded-lg transition-all ${message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <EmailSection user={user} onUpdate={loadUser} onMessage={setMessage} />
          <PasswordSection onMessage={setMessage} />
        </div>
      </div>
    </div>
  );
}