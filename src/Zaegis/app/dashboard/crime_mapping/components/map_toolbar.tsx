

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Filter,
  Map as MapIcon,
  Flame,
  X,
  BarChart3,
  Clock,
} from 'lucide-react';
import type { LayerType } from '../types';


interface MapToolbarProps {
  totalCount: number;
  filteredCount: number;
  temporalDescription: string;
  selectedLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
  boundaryDataLoaded: boolean;
  zoningDataLoaded: boolean;
  showHeatmap: boolean;
  isLoadingHeatmap: boolean;
  onToggleHeatmap: () => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
}


export default function MapToolbar({
  totalCount,
  filteredCount,
  temporalDescription,
  selectedLayer,
  onLayerChange,
  boundaryDataLoaded,
  zoningDataLoaded,
  showHeatmap,
  isLoadingHeatmap,
  onToggleHeatmap,
  activeFilterCount,
  onOpenFilters,
}: MapToolbarProps) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm mb-6 shrink-0 z-20">
      {/* Statistics */}
      <div className="flex items-center gap-4 flex-wrap">
        <Card className="shadow-none border-0 bg-muted/30 shrink-0">
          <CardContent className="px-4 py-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {filteredCount}
              </span>
              {totalCount !== filteredCount && (
                <span className="text-sm text-muted-foreground">of {totalCount}</span>
              )}
              <span className="text-sm text-muted-foreground">incidents</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border-0 bg-brand/10 shrink-0">
          <CardContent className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-brand">
                {temporalDescription}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={selectedLayer}
          onValueChange={(v) => onLayerChange(v as LayerType)}
        >
          <SelectTrigger className="w-[160px] h-9 bg-muted/30">
            <SelectValue placeholder="Select layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-muted-foreground/70" />
                No Layer
              </div>
            </SelectItem>
            <SelectItem value="boundaries" disabled={!boundaryDataLoaded}>
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-brand" />
                Boundaries
                {!boundaryDataLoaded && (
                  <span className="text-xs text-muted-foreground/70">(not loaded)</span>
                )}
              </div>
            </SelectItem>
            <SelectItem value="zoning" disabled={!zoningDataLoaded}>
              <div className="flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                Zoning
                {!zoningDataLoaded && (
                  <span className="text-xs text-muted-foreground/70">(not loaded)</span>
                )}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showHeatmap ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleHeatmap}
          disabled={isLoadingHeatmap}
          className={`gap-2 h-9 border ${
            showHeatmap
              ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white border-orange-500/20'
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
        >
          {isLoadingHeatmap ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Generating...
            </>
          ) : (
            <>
              <Flame
                className={`w-4 h-4 ${
                  showHeatmap ? 'text-white' : 'text-orange-500'
                }`}
              />
              Heatmap
            </>
          )}
        </Button>

        <div className="w-px h-6 bg-muted mx-1 hidden sm:block" />

        <Button
          variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
          size="sm"
          onClick={onOpenFilters}
          className={`gap-2 h-9 ${
            activeFilterCount > 0
              ? 'bg-brand/10 text-brand hover:bg-brand/20 border-brand/30'
              : 'bg-card hover:bg-muted/50'
          }`}
        >
          <Filter
            className={`w-4 h-4 ${
              activeFilterCount > 0 ? 'text-brand' : 'text-muted-foreground'
            }`}
          />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-brand text-brand-foreground hover:bg-brand/90 ml-1 px-1.5 py-0 text-xs border-0"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
