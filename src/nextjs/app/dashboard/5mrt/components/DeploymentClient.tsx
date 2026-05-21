/**
 * @file Orchestrator client component for the 5MRT deployment module.
 *
 * Wires together the four hooks (useBaseData, useDeploymentActions,
 * useMapRenderer, useComputedData) and delegates rendering to focused
 * child components. Manages the planning/history mode toggle and
 * confirmation dialogs.
 */

'use client';

import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { MapPin, LayoutList, Users, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { DeploymentControlsSkeleton } from '@/components/skeletons/DeploymentSkeletons';
import { useDeploymentStore } from '@/lib/store/deployment-store';

import { useBaseData } from '../hooks/useBaseData';
import { useDeploymentActions } from '../hooks/useDeploymentActions';
import { useMapRenderer } from '../hooks/useMapRenderer';
import { useComputedData } from '../hooks/useComputedData';

import { PlanningToolbar } from './PlanningToolbar';
import { MapViewPanel } from './MapViewPanel';
import { ConfigDialog } from './ConfigDialog';
import { EditAssignmentDialog } from './EditAssignmentDialog';
import { StatsSummaryDialog } from './StatsSummaryDialog';
import { WeeklyTableView } from './WeeklyTableView';
import { RosterMatrixView } from './RosterMatrixView';
import { UtilizationView } from './UtilizationView';
import { HistoryView } from './HistoryView';

export default function DeploymentClient() {
  const store = useDeploymentStore();
  const {
    deploymentData, selectedDate, setSelectedDate,
    viewMode, setViewMode, tabView, setTabView,
    shiftPattern, setShiftPattern, ignoreSchedule, setIgnoreSchedule,
    activeShiftFilter, setActiveShiftFilter,
    hasChanges, isReadOnly,
  } = store;

  const base = useBaseData();
  const actions = useDeploymentActions();
  const computed = useComputedData();
  const mapRenderer = useMapRenderer(
    base.boundariesData,
    actions.openEditModal,
    actions.handleLocalUpdate,
  );

  /** Reset shift filter when switching from 8hr to 12hr pattern. */
  useEffect(() => {
    if (shiftPattern === 12 && activeShiftFilter === 'Shift 3') {
      setActiveShiftFilter('All');
    }
  }, [shiftPattern, activeShiftFilter, setActiveShiftFilter]);

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
            5-MINUTE RESPONSE DEPLOYMENT
            {viewMode === 'planning' && isReadOnly && (
              <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20">
                <Lock className="w-3 h-3 mr-1" /> Finalized
              </Badge>
            )}
            {viewMode === 'planning' && hasChanges && !isReadOnly && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
                Unsaved Draft
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Optimized tactical positioning and coverage.
          </p>
        </div>
        <div className="bg-card p-1 rounded-lg border shadow-sm flex items-center">
          <button
            onClick={() => setViewMode('planning')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === 'planning' ? 'bg-brand/15 text-brand shadow-sm' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            Planning
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

      <main className="max-w-[1600px] mx-auto px-6 space-y-6">
        {/* Planning Mode */}
        {viewMode === 'planning' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            {base.isLoadingPlan && !deploymentData.length && !hasChanges ? (
              <DeploymentControlsSkeleton />
            ) : (
              <PlanningToolbar
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                weekStart={computed.weekStart}
                weekEnd={computed.weekEnd}
                isReadOnly={isReadOnly}
                hasChanges={hasChanges}
                deploymentDataLength={deploymentData.length}
                isGenerating={actions.isGenerating}
                onGenerate={actions.handleGenerateWeek}
                onSaveConfirm={() => actions.setIsSaveConfirmOpen(true)}
                onClearConfirm={() => actions.setIsClearConfirmOpen(true)}
                onConfigOpen={() => actions.setIsConfigOpen(true)}
                onExportWord={() => actions.handleExport('word')}
                onExportExcel={() => actions.handleExport('excel')}
              />
            )}

            {/* Content Tabs */}
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tabs value={tabView} onValueChange={(v: any) => setTabView(v)} className="w-full">
                <div className="flex justify-end mb-4">
                  <TabsList className="bg-muted p-1">
                    <TabsTrigger value="daily" className="text-xs px-4"><MapPin className="w-3 h-3 mr-2" /> Map View</TabsTrigger>
                    <TabsTrigger value="weekly" className="text-xs px-4"><LayoutList className="w-3 h-3 mr-2" /> Weekly Table</TabsTrigger>
                    <TabsTrigger value="roster" className="text-xs px-4"><Users className="w-3 h-3 mr-2" /> Roster Matrix</TabsTrigger>
                    <TabsTrigger value="utilization" className="text-xs px-4"><BarChart3 className="w-3 h-3 mr-2" /> Utilization</TabsTrigger>
                  </TabsList>
                </div>

                <div className={tabView === 'daily' ? 'block' : 'hidden'}>
                  <MapViewPanel
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    weekDays={computed.weekDays}
                    mapContainer={mapRenderer.mapContainer}
                    isGenerating={actions.isGenerating}
                    isMapLoading={mapRenderer.isMapLoading}
                    isReadOnly={isReadOnly}
                    activeShiftFilter={activeShiftFilter}
                    setActiveShiftFilter={setActiveShiftFilter}
                    shiftPattern={shiftPattern}
                    dailyGroupedData={computed.dailyGroupedData}
                    openEditModal={actions.openEditModal}
                    riskMap={base.riskMap}
                    maxRisk={base.maxRisk}
                  />
                </div>

                <div className={tabView === 'weekly' ? 'block' : 'hidden'}>
                  <WeeklyTableView
                    isGenerating={actions.isGenerating}
                    isLoadingPlan={base.isLoadingPlan}
                    isReadOnly={isReadOnly}
                    deploymentData={deploymentData}
                    shiftPattern={shiftPattern}
                    openEditModal={actions.openEditModal}
                    riskMap={base.riskMap}
                    maxRisk={base.maxRisk}
                  />
                </div>

                <div className={tabView === 'roster' ? 'block' : 'hidden'}>
                  <RosterMatrixView
                    isGenerating={actions.isGenerating}
                    rosterMatrix={computed.rosterMatrix}
                  />
                </div>

                <div className={tabView === 'utilization' ? 'block' : 'hidden'}>
                  <UtilizationView officerStats={computed.officerStats} />
                </div>
              </Tabs>
            </div>
          </div>
        )}

        {/* History Mode */}
        {viewMode === 'history' && (
          <HistoryView
            isLoadingHistory={base.isLoadingHistory}
            historyWeeks={base.historyWeeks}
            loadHistoryWeeks={base.loadHistoryWeeks}
            handleViewHistory={handleViewHistory}
            handleExportForDate={actions.handleExportForDate}
          />
        )}
      </main>

      {/* Dialogs */}
      <ConfigDialog
        isOpen={actions.isConfigOpen}
        onOpenChange={actions.setIsConfigOpen}
        shiftPattern={shiftPattern}
        setShiftPattern={setShiftPattern}
        ignoreSchedule={ignoreSchedule}
        setIgnoreSchedule={setIgnoreSchedule}
        isReadOnly={isReadOnly}
      />

      <EditAssignmentDialog
        isOpen={actions.isEditOpen}
        onOpenChange={actions.setIsEditOpen}
        editingTeam={actions.editingTeam}
        allPersonnelPool={store.allPersonnelPool}
        allBarangays={base.allBarangays}
        onToggleOfficer={actions.toggleOfficer}
        onToggleBarangay={actions.toggleBarangay}
        onResetLocation={actions.resetEditingLocation}
        onSave={actions.saveEdit}
      />

      <Dialog open={actions.isSaveConfirmOpen} onOpenChange={actions.setIsSaveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Schedule?</DialogTitle>
            <DialogDescription>
              This will save the current plan to the database and lock it for further editing.
              This action overwrites any existing plan for this week.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsSaveConfirmOpen(false)}>Cancel</Button>
            <Button onClick={actions.handleCommit} className="bg-brand hover:bg-brand/90 text-brand-foreground">Confirm Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actions.isClearConfirmOpen} onOpenChange={actions.setIsClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Draft?</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear the current draft? All unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.setIsClearConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={actions.handleClearDraft}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StatsSummaryDialog
        isOpen={false}
        onOpenChange={() => {}}
        officerStats={computed.officerStats}
      />
    </div>
  );
}
