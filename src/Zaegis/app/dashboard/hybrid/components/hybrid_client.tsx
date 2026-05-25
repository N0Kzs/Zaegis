/**
 * @file Orchestrator client component for the Hybrid Deployment module.
 *
 * Wires together the four hooks (useHybridBaseData, useHybridActions,
 * useHybridMapRenderer, useHybridComputedData) and delegates rendering
 * to focused child components.
 */

'use client';

import { format } from 'date-fns';
import { Lock, MapPin, Grid3X3, Users, Car, Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useHybridStore } from '@/lib/store/hybrid_store';

import { useHybridBaseData } from '../hooks/use_hybrid_base_data';
import { useHybridActions } from '../hooks/use_hybrid_actions';
import { useHybridMapRenderer } from '../hooks/use_hybrid_map_renderer';
import { useHybridComputedData } from '../hooks/use_hybrid_computed_data';

import { HybridToolbar } from './hybrid_toolbar';
import { EditShiftDialog } from './edit_shift_dialog';
import { HistoryView } from './history_view';
import { RosterView } from './roster_view';
import { TacticalView } from './tactical_view';
import { MapView } from './map_view';
import { UtilizationView } from './utilization_view';

export default function HybridClient() {
  const store = useHybridStore();
  const {
    weeklySchedules, selectedDate, setSelectedDate,
    viewMode, setViewMode, tabView, setTabView,
    hasChanges, isReadOnly, ignoreSchedule, setIgnoreSchedule,
    mapTimeSlot, setMapTimeSlot,
  } = store;

  const base = useHybridBaseData();
  const actions = useHybridActions();
  const computed = useHybridComputedData();
  const mapRenderer = useHybridMapRenderer(
    base.boundariesData,
    computed.dailyGroupedData,
    actions.setEditingShift,
  );

  const handleViewHistory = (date: Date) => {
    store.setHasChanges(false);
    setSelectedDate(date);
    setViewMode('planning');
  };

  return (
    <div className="min-h-screen font-sans text-foreground pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-card border-b px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            HYBRID DEPLOYMENT PLAN
            {isReadOnly && (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20">
                <Lock className="w-3 h-3 mr-1" /> Finalized
              </Badge>
            )}
            {hasChanges && !isReadOnly && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
                Unsaved Draft
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Optimized Deployment drafting with 5MRT spatial targeting</p>
        </div>
        <div className="bg-card p-1 rounded-lg border shadow-sm flex items-center">
          <button
            onClick={() => setViewMode('planning')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'planning' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            Planning View
          </button>
          <div className="w-px h-4 bg-muted mx-1" />
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'history' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {viewMode === 'history' ? (
        <HistoryView
          historyWeeks={base.historyWeeks}
          isLoadingHistory={base.isLoadingHistory}
          loadHistoryWeeks={base.loadHistoryWeeks}
          onViewHistory={handleViewHistory}
        />
      ) : (
        <main className="max-w-[1600px] mx-auto px-6 space-y-6">
          <HybridToolbar
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            weekStart={computed.weekStart}
            weekEnd={computed.weekEnd}
            isReadOnly={isReadOnly}
            hasChanges={hasChanges}
            schedulesLength={weeklySchedules.length}
            isGenerating={actions.isGenerating}
            ignoreSchedule={ignoreSchedule}
            setIgnoreSchedule={setIgnoreSchedule}
            onGenerate={actions.handleGenerateWeek}
            onSaveConfirm={() => actions.setIsSaveConfirmOpen(true)}
            onClearConfirm={() => actions.setIsClearConfirmOpen(true)}
            onVehicleDialog={() => actions.setIsVehicleDialogOpen(true)}
            onExportWord={() => actions.handleExport('word')}
            onExportExcel={() => actions.handleExport('excel')}
          />

          {/* Content Tabs */}
          <div className="space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Tabs value={tabView} onValueChange={(v: any) => setTabView(v)} className="w-full">
              <div className="flex justify-end mb-4">
                <TabsList className="bg-muted p-1">
                  <TabsTrigger value="tactical" className="text-xs px-4"><MapPin className="w-3 h-3 mr-2" /> Tactical Plan</TabsTrigger>
                  <TabsTrigger value="roster" className="text-xs px-4"><Grid3X3 className="w-3 h-3 mr-2" /> Roster Matrix</TabsTrigger>
                  <TabsTrigger value="map" className="text-xs px-4"><MapPin className="w-3 h-3 mr-2" /> Map View</TabsTrigger>
                  <TabsTrigger value="utilization" className="text-xs px-4"><Users className="w-3 h-3 mr-2" /> Utilization</TabsTrigger>
                </TabsList>
              </div>

              {/* Day selector for tactical/map tabs */}
              {(tabView === 'tactical' || tabView === 'map') && (
                <Tabs
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onValueChange={(v) => {
                    const matchedDay = computed.weekDays.find((d) => format(d, 'yyyy-MM-dd') === v);
                    if (matchedDay) setSelectedDate(matchedDay);
                  }}
                  className="w-full mb-6"
                >
                  <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-card border shadow-sm rounded-xl">
                    {computed.weekDays.map((day) => (
                      <TabsTrigger
                        key={format(day, 'yyyy-MM-dd')}
                        value={format(day, 'yyyy-MM-dd')}
                        className="flex flex-col py-2.5 rounded-lg data-[state=active]:bg-brand/10 data-[state=active]:text-brand transition-all border-transparent border-2 data-[state=active]:border-brand/20"
                      >
                        <span className="text-xs font-medium text-muted-foreground mb-0.5">{format(day, 'EEE')}</span>
                        <span className="text-lg font-bold">{format(day, 'd')}</span>
                        {(computed.schedulesByDay[format(day, 'yyyy-MM-dd')] || []).length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand/60 mt-0.5 group-data-[state=active]:bg-brand" />
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              <div className={tabView === 'tactical' ? 'block' : 'hidden'}>
                <TacticalView
                  isGenerating={actions.isGenerating}
                  weeklySchedules={weeklySchedules}
                  dailyGroupedData={computed.dailyGroupedData}
                  isReadOnly={isReadOnly}
                  setEditingShift={actions.setEditingShift}
                  riskMap={base.riskMap}
                  maxRisk={base.maxRisk}
                />
              </div>

              <div className={tabView === 'roster' ? 'block' : 'hidden'}>
                <RosterView
                  isGenerating={actions.isGenerating}
                  weeklySchedules={weeklySchedules}
                  draftedPersonnel={computed.draftedPersonnel}
                  weekDays={computed.weekDays}
                  schedulesByDay={computed.schedulesByDay}
                />
              </div>

              <div className={tabView === 'map' ? 'block' : 'hidden'}>
                <MapView
                  weeklySchedules={weeklySchedules}
                  isGenerating={actions.isGenerating}
                  isMapLoading={mapRenderer.isMapLoading}
                  mapTimeSlot={mapTimeSlot}
                  setMapTimeSlot={setMapTimeSlot}
                  mapContainer={mapRenderer.mapContainer}
                  dailyGroupedData={computed.dailyGroupedData}
                  selectedDate={selectedDate}
                />
              </div>

              <div className={tabView === 'utilization' ? 'block' : 'hidden'}>
                <UtilizationView officerStats={computed.officerStats} />
              </div>
            </Tabs>
          </div>
        </main>
      )}

      {/* Dialogs */}
      <EditShiftDialog
        shift={actions.editingShift}
        onClose={() => actions.setEditingShift(null)}
        onSave={actions.handleShiftEdit}
        allPersonnel={computed.draftedPersonnel}
        allBarangays={computed.allBarangaysInSchedule}
      />

      <Dialog open={actions.isSaveConfirmOpen} onOpenChange={actions.setIsSaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Hybrid Plan?</DialogTitle>
            <DialogDescription>This will lock the current plan for further editing.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsSaveConfirmOpen(false)}>Cancel</Button>
            <Button onClick={actions.handleSaveLock} className="bg-brand hover:bg-brand/90 text-brand-foreground">Confirm Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actions.isClearConfirmOpen} onOpenChange={actions.setIsClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Draft?</DialogTitle>
            <DialogDescription>Are you sure you want to clear the current draft? All unsaved changes will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsClearConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={actions.handleClearDraft}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Vehicles Dialog */}
      <Dialog open={actions.isVehicleDialogOpen} onOpenChange={actions.setIsVehicleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-brand" /> Manage Patrol Cars
            </DialogTitle>
            <DialogDescription>
              Toggle patrol cars on/off for this deployment plan.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto divide-y divide-border -mx-6 px-6">
            {base.allPatrolCars.filter((c) => c.isActive).map((car) => {
              const isInPlan = computed.vehiclesInPlan.has(car.id);
              return (
                <div key={car.id} className={`flex items-center justify-between py-3 ${!car.isAvailable && !isInPlan ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isInPlan ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground/70'}`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{car.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {car.plateNumber}
                        {!car.isAvailable && <span className="ml-2 text-amber-600 font-medium">· Unavailable</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInPlan ? (
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 h-8"
                        onClick={() => actions.handleRemoveVehicle(car.id, car.name)}>
                        <Minus className="w-3.5 h-3.5" /> Remove
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-brand hover:bg-brand/10 hover:text-brand/90 gap-1.5 h-8"
                        onClick={() => actions.handleAddVehicle({ id: car.id, name: car.name })}>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {base.allPatrolCars.filter((c) => c.isActive).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No patrol cars found in the system.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsVehicleDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
