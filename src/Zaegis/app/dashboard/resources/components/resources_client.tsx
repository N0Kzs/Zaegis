'use client';

import { useState } from 'react';
import { Users, Car, Calendar, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PersonnelView from './personnel_view';
import VehiclesView from './vehicles_view';
import ScheduleView from './schedule_view';
import type { Tab } from '../types';

const MENU_CARDS: {
  tab: Exclude<Tab, 'menu'>;
  icon: typeof Users;
  title: string;
  description: string;
  color: string;
  hoverShadow: string;
}[] = [
  {
    tab: 'personnel',
    icon: Users,
    title: 'Personnel',
    description: 'Manage officer profiles, ranks, and roles',
    color: 'brand',
    hoverShadow: 'hover:shadow-brand/20',
  },
  {
    tab: 'vehicles',
    icon: Car,
    title: 'Vehicles',
    description: 'Manage patrol cars and motorcycle fleet',
    color: 'orange',
    hoverShadow: 'hover:shadow-orange-500/20',
  },
  {
    tab: 'schedule',
    icon: Calendar,
    title: 'Duty Roster',
    description: 'Manage weekly working schedules',
    color: 'indigo',
    hoverShadow: 'hover:shadow-indigo-500/20',
  },
];

const ICON_BG: Record<string, { bg: string; hover: string; icon: string }> = {
  brand:  { bg: 'bg-brand/10',     hover: 'group-hover:bg-brand/20',     icon: 'text-brand' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', hover: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20', icon: 'text-orange-600 dark:text-orange-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', hover: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20', icon: 'text-indigo-600 dark:text-indigo-400' },
};

export default function ResourcesClient() {
  const [activeTab, setActiveTab] = useState<Tab>('menu');

  const renderContent = () => {
    switch (activeTab) {
      case 'personnel': return <PersonnelView />;
      case 'vehicles':  return <VehiclesView />;
      case 'schedule':  return <ScheduleView />;
      default:          return null;
    }
  };

  return (
    <div className={`flex flex-col w-full ${activeTab === 'menu' ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'min-h-screen'}`}>
      {/* Header */}
      <div className="py-6 px-8 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">RESOURCES</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage personnel, vehicles, and schedules</p>
        </div>
        {activeTab !== 'menu' && (
          <button
            onClick={() => setActiveTab('menu')}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium hover:-translate-x-1 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Menu
          </button>
        )}
      </div>

      <div className="p-4 sm:p-8">
        {activeTab === 'menu' ? (
          <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
              {MENU_CARDS.map((card) => {
                const c = ICON_BG[card.color];
                return (
                  <Card
                    key={card.tab}
                    onClick={() => setActiveTab(card.tab)}
                    className={`flex flex-col items-center justify-center text-center h-[350px] w-full max-w-xs mx-auto cursor-pointer group animate-in fade-in zoom-in-95 duration-500 hover:duration-200 hover:-translate-y-4 transition-transform hover:shadow-2xl ${card.hoverShadow}`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 h-full">
                      <div className={`w-20 h-20 ${c.bg} rounded-full flex items-center justify-center mb-6 ${c.hover} transition-colors duration-300`}>
                        <card.icon className={`w-10 h-10 ${c.icon} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mt-2">{card.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{card.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        )}
      </div>
    </div>
  );
}
