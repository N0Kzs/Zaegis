"use client";
import { ChevronRight, User, History } from "lucide-react";
import { useState } from "react";
import ProfileTab from "./profile/profile_page";
import ActivityHistory from "./activity_history";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const OverviewContent = () => (
    <div className="p-2 space-y-4">
      {/* Profile Card */}
      <div
        onClick={() => setActiveTab('profile')}
        className="bg-card rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
              <p className="text-sm text-muted-foreground">Manage email and password</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/70" />
        </div>
      </div>

      {/* Activity History Card */}
      <div
        onClick={() => setActiveTab('activity')}
        className="bg-card rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center">
              <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Activity History</h3>
              <p className="text-sm text-muted-foreground">View your recent actions and changes</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/70" />
        </div>
      </div>
    </div>
  );

  const ProfileContent = () => (
    <div className="bg-card rounded-lg shadow-sm p-6 max-w">
      <button
        onClick={() => setActiveTab('overview')}
        className="mb-4 text-brand hover:text-brand/80 flex items-center gap-1 text-sm font-medium hover:-translate-x-1 transition-transform"
      >
        ← Back to Settings
      </button>
      <ProfileTab />
    </div>
  );

  const ActivityContent = () => (
    <div className="bg-card rounded-lg shadow-sm p-6 max-w">
      <button
        onClick={() => setActiveTab('overview')}
        className="mb-4 text-brand hover:text-brand/80 flex items-center gap-1 text-sm font-medium hover:-translate-x-1 transition-transform"
      >
        ← Back to Settings
      </button>
      <ActivityHistory />
    </div>
  );

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="py-6 px-4">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>
      {activeTab === 'overview' && <OverviewContent />}
      {activeTab === 'profile' && <ProfileContent />}
      {activeTab === 'activity' && <ActivityContent />}
    </div>
  );
}