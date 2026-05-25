/**
 * @file Orchestrator component for the Standard Deployment module.
 *
 * Wires together the Zustand store, three domain hooks, and existing UI components.
 */

'use client';

import { useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Save, Download, RefreshCw, AlertTriangle, CheckCircle2, Zap, ArrowRight,
  Settings, ChevronDown, Undo2, Redo2, BarChart3, CalendarDays,
  Calendar as CalendarIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useStandardStore } from '@/lib/store/standard_store';
import { useStandardBaseData } from '../hooks/use_standard_base_data';
import { useStandardActions } from '../hooks/use_standard_actions';
import { useStandardComputedData } from '../hooks/use_standard_computed_data';
import { ConfigDialog } from './config_dialog';
import { EditScheduleDialog } from './edit_schedule_dialog';
import { HistoryView } from './history_view';
import { UtilizationPanel } from './utilization_panel';
import { SchedulePanel } from './schedule_panel';
import Loading from '../loading';

export default function StandardClient() {
  const store = useStandardStore();

  // Initialize week start on mount if not set
  useEffect(() => {
    if (!store.selectedWeekStart) {
      store.setSelectedWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    }
  }, []);

  const baseData = useStandardBaseData();
  const actions = useStandardActions({
    personnel: baseData.personnel,
    patrolCars: baseData.patrolCars,
    checkIfWeekSaved: baseData.checkIfWeekSaved,
  });
  const computed = useStandardComputedData({
    personnel: baseData.personnel,
    barangays: baseData.barangays,
    searchPersonnel: actions.searchPersonnel,
    searchAreas: actions.searchAreas,
  });

  const handleViewHistory = (date: string) => {
    store.setSelectedWeekStart(date);
    store.setViewMode('planning');
  };

  if (baseData.isLoading) return <Loading />;

  return (
    <div className="container mx-auto p-4 sm:p-6 min-h-screen">
      {/* Header & Mode Switch */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">DEPLOYMENT PLAN</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage weekly patrol schedules and resource allocation</p>
        </div>

        <div className="bg-card p-1 rounded-lg border shadow-sm flex items-center">
          <button
            onClick={() => store.setViewMode('planning')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${store.viewMode === 'planning' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'}`}
          >
            Planning
          </button>
          <div className="w-px h-4 bg-muted mx-1" />
          <button
            onClick={() => store.setViewMode('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${store.viewMode === 'history' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'}`}
          >
            History
          </button>
        </div>
      </div>

      {store.viewMode === 'planning' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Planning Toolbar */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
            {/* Left: Week Navigation */}
            <div className="flex items-center gap-3 w-full xl:w-auto">
              <div className="flex items-center bg-muted/30 rounded-lg p-1 border">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const prev = addDays(new Date(store.selectedWeekStart), -7);
                    store.setSelectedWeekStart(format(startOfWeek(prev, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                  }}>
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="px-4 text-sm font-semibold text-foreground min-w-[200px] hover:bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                      {format(new Date(store.selectedWeekStart), 'MMM d')} - {format(addDays(new Date(store.selectedWeekStart), 6), 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar mode="single" selected={new Date(store.selectedWeekStart)}
                      onSelect={(date) => { if (date) store.setSelectedWeekStart(format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')); }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const next = addDays(new Date(store.selectedWeekStart), 7);
                    store.setSelectedWeekStart(format(startOfWeek(next, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
                  }}>
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>

              {store.weekHasBeenSaved && (
                <Badge variant="secondary" className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 px-3 py-1">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" /> Locked & Saved
                </Badge>
              )}
              {!store.weekHasBeenSaved && store.schedules.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 px-3 py-1">Draft Mode</Badge>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full xl:w-auto justify-end flex-wrap">
              {store.weekHasBeenSaved && (
                <>
                  <Link href="/dashboard/risk-analysis">
                    <Button variant="outline" size="sm" className="text-muted-foreground">
                      <AlertTriangle className="mr-2 h-4 w-4" /> Risk Analysis
                    </Button>
                  </Link>
                  <Button variant="default" size="sm" className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm"
                    onClick={actions.handleExport} disabled={actions.isExporting}>
                    <Download className={`mr-2 h-4 w-4 ${actions.isExporting ? 'hidden' : ''}`} />
                    {actions.isExporting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    {actions.isExporting ? 'Exporting...' : 'Export Plan'}
                  </Button>
                </>
              )}

              {!store.weekHasBeenSaved && store.schedules.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" onClick={actions.handleUndo} disabled={!actions.canUndo} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Undo">
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={actions.handleRedo} disabled={!actions.canRedo} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Redo">
                    <Redo2 className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-muted mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => actions.setIsConfigModalOpen(true)} className="text-muted-foreground">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-muted mx-1" />
                  <Button variant="ghost" size="sm" onClick={() => actions.setIsConfirmDiscardOpen(true)} disabled={actions.saving} className="text-red-600 hover:bg-red-500/10 dark:hover:bg-red-900/30 hover:text-red-700">
                    Clear
                  </Button>
                  <Button variant="default" size="sm" onClick={() => actions.setIsConfirmSaveOpen(true)} disabled={actions.saving} className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm min-w-[120px]">
                    {actions.saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {actions.saving ? 'Saving...' : 'Save & Lock'}
                  </Button>
                </>
              )}

              {!store.weekHasBeenSaved && store.schedules.length === 0 && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => actions.setIsConfigModalOpen(true)} className="text-muted-foreground">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button onClick={actions.handleGenerateSchedule} disabled={actions.generating} variant="default" size="sm" className="bg-brand hover:bg-brand/90 text-brand-foreground shadow-sm min-w-[140px]">
                    {actions.generating
                      ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                      : <><Zap className="h-4 w-4 mr-2" /> Generate Schedule</>}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-1 bg-card border rounded-xl p-1 shadow-sm w-fit">
                <button onClick={() => store.setContentTab('schedule')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${store.contentTab === 'schedule' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                  <CalendarDays className="h-4 w-4" /> Schedule
                </button>
                <button onClick={() => store.setContentTab('utilization')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${store.contentTab === 'utilization' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}>
                  <BarChart3 className="h-4 w-4" /> Utilization
                  {computed.weeklyStats.personnelUtilization.filter((p) => p.hours > 0).length > 0 && (
                    <span className="ml-1 bg-brand/15 text-brand text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {computed.weeklyStats.personnelUtilization.filter((p) => p.hours > 0).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {store.contentTab === 'utilization' && (
              <UtilizationPanel weeklyStats={computed.weeklyStats} personnelCount={baseData.personnel.length} workloadBalance={computed.workloadBalance} />
            )}
            {store.contentTab === 'schedule' && (
              <SchedulePanel weekDates={baseData.weekDates} schedules={store.schedules} weekHasBeenSaved={store.weekHasBeenSaved}
                isTableLoading={baseData.isTableLoading} riskMap={baseData.riskMap} maxRisk={baseData.maxRisk}
                onAddTimeSlot={actions.handleAddTimeSlot} onEditSchedule={actions.handleEditModalOpen} onRemoveTimeSlot={actions.handleRemoveTimeSlot} />
            )}
          </div>
        </div>
      ) : (
        <HistoryView isLoadingHistory={baseData.isLoadingHistory} historyWeeks={baseData.historyWeeks}
          fetchHistoryWeeks={baseData.fetchHistoryWeeks} handleViewHistory={handleViewHistory} />
      )}

      {/* Dialogs */}
      <ConfigDialog isOpen={actions.isConfigModalOpen} onOpenChange={actions.setIsConfigModalOpen}
        config={store.config} setConfig={store.setConfig} onSave={actions.handleSaveConfig} />

      {actions.isEditModalOpen && actions.editingSchedule && (
        <EditScheduleDialog
          isOpen={actions.isEditModalOpen} onOpenChange={actions.setIsEditModalOpen}
          editingSchedule={actions.editingSchedule} setEditingSchedule={actions.setEditingSchedule}
          editingTimeSlot={actions.editingTimeSlot} setEditingTimeSlot={actions.setEditingTimeSlot}
          timeSlotValidation={actions.timeSlotValidation}
          patrolCars={baseData.patrolCars}
          filteredPersonnel={computed.filteredPersonnel} unavailablePersonnel={computed.unavailablePersonnel}
          selectedPersonnel={actions.selectedPersonnel} setSelectedPersonnel={actions.setSelectedPersonnel}
          searchPersonnel={actions.searchPersonnel} setSearchPersonnel={actions.setSearchPersonnel}
          selectedAreas={actions.selectedAreas} setSelectedAreas={actions.setSelectedAreas}
          filteredAreas={computed.filteredAreas}
          searchAreas={actions.searchAreas} setSearchAreas={actions.setSearchAreas}
          schedules={store.schedules} onSave={actions.handleSaveSchedule} />
      )}

      <Dialog open={actions.isConfirmSaveOpen} onOpenChange={actions.setIsConfirmSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save & Lock Week</DialogTitle>
            <DialogDescription>
              This will save {store.schedules.length} deployments to the database. Once saved, this week cannot be edited or regenerated. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsConfirmSaveOpen(false)}>Cancel</Button>
            <Button onClick={actions.handleSaveToDatabase} disabled={actions.saving}>
              {actions.saving ? 'Saving...' : 'Save & Lock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actions.isConfirmDiscardOpen} onOpenChange={actions.setIsConfirmDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Cache</DialogTitle>
            <DialogDescription>
              This will delete all unsaved schedules from cache. This cannot be undone. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsConfirmDiscardOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={actions.handleDiscardCache}>Clear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="mt-6 flex justify-between items-center">
        <Button variant="outline" onClick={actions.handleExport} disabled={actions.isExporting}>
          {actions.isExporting
            ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
            : <><Download className="mr-2 h-4 w-4" /> Export</>}
        </Button>
        <Link href="/dashboard/5mrt">
          <Button className="bg-brand hover:bg-brand/90 text-brand-foreground">5-Min Response <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  );
}
