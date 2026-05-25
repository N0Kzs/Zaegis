/**
 * @file Orchestrator component for the GeoData (geodata) module.
 *
 * Manages tab navigation between Population, Zoning, and Boundary sections.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, MapPinXInside, MapPlusIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PopulationTable from './population_table';
import ZoningUpload from './zoning_upload';
import BoundaryUpload from './boundary_upload';

type TabId = 'overview' | 'profile' | 'zoning' | 'activity';

const SECTION_CARDS = [
  {
    id: 'profile' as TabId,
    icon: Users,
    title: 'Population',
    description: 'Manage demographic data and population statistics',
    color: 'blue',
    hoverShadow: 'hover:shadow-blue-500/20',
  },
  {
    id: 'zoning' as TabId,
    icon: MapPinXInside,
    title: 'Zoning',
    description: 'Manage land use and zoning regulations',
    color: 'green',
    hoverShadow: 'hover:shadow-green-500/20',
  },
  {
    id: 'activity' as TabId,
    icon: MapPlusIcon,
    title: 'Baranggay Boundary',
    description: 'Manage administrative boundaries',
    color: 'purple',
    hoverShadow: 'hover:shadow-purple-500/20',
  },
];

const ICON_BG: Record<string, { bg: string; hover: string; icon: string }> = {
  blue:   { bg: 'bg-blue-50 dark:bg-blue-500/10',   hover: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20',   icon: 'text-blue-600 dark:text-blue-400' },
  green:  { bg: 'bg-green-50 dark:bg-green-500/10', hover: 'group-hover:bg-green-100 dark:group-hover:bg-green-500/20', icon: 'text-green-600 dark:text-green-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', hover: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20', icon: 'text-purple-600 dark:text-purple-400' },
};

export default function GeoDataClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get('tab') as TabId | null;
    return tab && ['profile', 'zoning', 'activity'].includes(tab) ? tab : 'overview';
  });

  // Keep the URL in sync when the tab changes programmatically
  const navigateTab = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      router.replace('/dashboard/geodata', { scroll: false });
    } else {
      router.replace(`/dashboard/geodata?tab=${tab}`, { scroll: false });
    }
  };

  // Sync if the URL changes externally (e.g. back/forward or search nav)
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    const valid = tab && ['profile', 'zoning', 'activity'].includes(tab) ? tab : 'overview';
    setActiveTab(valid);
  }, [searchParams]);

  return (
    <div className={`flex flex-col w-full ${activeTab === 'overview' ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'min-h-screen'}`}>
      {/* Header */}
      <div className="py-6 px-8 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">GEODATA</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Data about area</p>
        </div>
        {activeTab !== 'overview' && (
          <button
            onClick={() => navigateTab('overview')}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium hover:-translate-x-1 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Sections
          </button>
        )}
      </div>

      <div className="p-4 sm:p-8">
        {activeTab === 'overview' && (
          <div className="flex-1 flex items-center justify-center p-4 min-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
              {SECTION_CARDS.map((card) => {
                const c = ICON_BG[card.color];
                return (
                  <Card
                    key={card.id}
                    onClick={() => navigateTab(card.id)}
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
        )}

        {activeTab === 'profile' && (
          <div className="min-h-screen pb-8">
            <PopulationTable />
          </div>
        )}

        {activeTab === 'zoning' && (
          <div className="min-h-screen pb-8">
            <div className="-mt-8">
              <ZoningUpload />
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="min-h-screen pb-8">
            <div className="-mt-8">
              <BoundaryUpload />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
