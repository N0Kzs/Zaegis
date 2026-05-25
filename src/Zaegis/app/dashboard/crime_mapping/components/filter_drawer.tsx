

'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import type { FilterState, TemporalView } from '../types';
import { DAYS_OF_WEEK, MONTHS } from '../types';


interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftFilters: FilterState;
  activeFilterCount: number;
  availableYears: number[];
  barangayOptions: string[];
  filterOptions: {
    offenseTypes: string[];
    offenses: string[];
    incidentTypes: string[];
  };
  onUpdateDraftFilter: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;
  onToggleFilter: (
    filterKey: 'offenseTypes' | 'offenses' | 'incidentTypes' | 'barangays',
    value: string,
  ) => void;
  onApply: () => void;
  onClear: () => void;
}


export default function FilterDrawer({
  open,
  onOpenChange,
  draftFilters,
  activeFilterCount,
  availableYears,
  barangayOptions,
  filterOptions,
  onUpdateDraftFilter,
  onToggleFilter,
  onApply,
  onClear,
}: FilterDrawerProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[450px] sm:w-[540px] flex flex-col p-0"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Filter className="w-5 h-5" />
              Filter Crime Data
            </SheetTitle>
            <SheetDescription className="text-base">
              Refine the map view by applying filters below
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <Card className="bg-brand/10 border-brand/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-brand hover:bg-brand/90 text-brand-foreground">{activeFilterCount}</Badge>
                    <span className="text-sm font-medium text-brand">
                      Active{' '}
                      {activeFilterCount === 1 ? 'Filter' : 'Filters'}
                    </span>
                  </div>
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-8 text-brand hover:text-brand/80 hover:bg-brand/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temporal View */}
          <div className="space-y-4 p-4">
            <div className="space-y-3">
              <Label
                htmlFor="temporalView"
                className="text-sm font-medium text-foreground/80"
              >
                Time Period
              </Label>
              <Select
                value={draftFilters.temporalView}
                onValueChange={(v: TemporalView) =>
                  onUpdateDraftFilter('temporalView', v)
                }
              >
                <SelectTrigger id="temporalView" className="h-11 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="year">By Year</SelectItem>
                  <SelectItem value="month">By Month</SelectItem>
                  <SelectItem value="dayOfWeek">By Day of Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draftFilters.temporalView === 'year' && (
              <div className="space-y-3">
                <Label htmlFor="selectedYear">Year</Label>
                <Select
                  value={draftFilters.selectedYear?.toString() || ''}
                  onValueChange={(v) =>
                    onUpdateDraftFilter('selectedYear', parseInt(v))
                  }
                >
                  <SelectTrigger id="selectedYear" className="h-11 bg-card">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draftFilters.temporalView === 'month' && (
              <div className="space-y-3">
                <Select
                  value={draftFilters.selectedMonth?.toString() || ''}
                  onValueChange={(v) =>
                    onUpdateDraftFilter('selectedMonth', parseInt(v))
                  }
                >
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value.toString()}
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Shows all{' '}
                  {draftFilters.selectedMonth
                    ? MONTHS.find(
                        (m) => m.value === draftFilters.selectedMonth,
                      )?.label + 's'
                    : 'selected months'}{' '}
                  across all years
                </p>
              </div>
            )}

            {draftFilters.temporalView === 'dayOfWeek' && (
              <div className="space-y-3">
                <Select
                  value={draftFilters.selectedDayOfWeek?.toString() || ''}
                  onValueChange={(v) =>
                    onUpdateDraftFilter('selectedDayOfWeek', parseInt(v))
                  }
                >
                  <SelectTrigger className="h-11 bg-card">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem
                        key={day.value}
                        value={day.value.toString()}
                      >
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Crime Categories */}
          <MultiSelectSection
            label="Crime Categories"
            items={filterOptions.offenseTypes}
            selectedItems={draftFilters.offenseTypes}
            idPrefix="offense-type"
            onToggle={(v) => onToggleFilter('offenseTypes', v)}
            onSelectAll={() =>
              onUpdateDraftFilter('offenseTypes', filterOptions.offenseTypes)
            }
            onClear={() => onUpdateDraftFilter('offenseTypes', [])}
            emptyMessage="No categories available"
          />

          {/* Specific Offenses */}
          <MultiSelectSection
            label="Specific Offenses"
            items={filterOptions.offenses}
            selectedItems={draftFilters.offenses}
            idPrefix="offense"
            disabled={draftFilters.offenseTypes.length === 0}
            onToggle={(v) => onToggleFilter('offenses', v)}
            onSelectAll={() =>
              onUpdateDraftFilter('offenses', filterOptions.offenses)
            }
            onClear={() => onUpdateDraftFilter('offenses', [])}
            emptyMessage={
              draftFilters.offenseTypes.length === 0
                ? 'Select a category first'
                : 'No offenses available'
            }
          />

          {/* Incident Types */}
          <MultiSelectSection
            label="Incident Types"
            items={filterOptions.incidentTypes}
            selectedItems={draftFilters.incidentTypes}
            idPrefix="incident-type"
            disabled={draftFilters.offenses.length === 0}
            onToggle={(v) => onToggleFilter('incidentTypes', v)}
            onSelectAll={() =>
              onUpdateDraftFilter(
                'incidentTypes',
                filterOptions.incidentTypes,
              )
            }
            onClear={() => onUpdateDraftFilter('incidentTypes', [])}
            emptyMessage={
              draftFilters.offenses.length === 0
                ? 'Select an offense first'
                : 'No incident types available'
            }
          />

          {/* Barangays */}
          <MultiSelectSection
            label="Barangays"
            items={barangayOptions}
            selectedItems={draftFilters.barangays}
            idPrefix="barangay"
            onToggle={(v) => onToggleFilter('barangays', v)}
            onSelectAll={() =>
              onUpdateDraftFilter('barangays', barangayOptions)
            }
            onClear={() => onUpdateDraftFilter('barangays', [])}
            emptyMessage="No barangays available"
          />

          <Separator />

          {/* Date Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Additional Date Range</Label>
              {(draftFilters.startDate || draftFilters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onUpdateDraftFilter('startDate', undefined);
                    onUpdateDraftFilter('endDate', undefined);
                  }}
                  className="h-7 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Start Date</Label>
                <Popover
                  open={startDateOpen}
                  onOpenChange={setStartDateOpen}
                  modal
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-10',
                        !draftFilters.startDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {draftFilters.startDate
                        ? format(draftFilters.startDate, 'MMM dd, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={draftFilters.startDate}
                      onSelect={(date) => {
                        onUpdateDraftFilter('startDate', date);
                        setStartDateOpen(false);
                      }}
                      captionLayout="dropdown"
                      fromYear={2010}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">End Date</Label>
                <Popover
                  open={endDateOpen}
                  onOpenChange={setEndDateOpen}
                  modal
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal h-10',
                        !draftFilters.endDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {draftFilters.endDate
                        ? format(draftFilters.endDate, 'MMM dd, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={draftFilters.endDate}
                      onSelect={(date) => {
                        onUpdateDraftFilter('endDate', date);
                        setEndDateOpen(false);
                      }}
                      captionLayout="dropdown"
                      fromYear={2010}
                      toYear={new Date().getFullYear()}
                      disabled={(date) =>
                        draftFilters.startDate
                          ? date < draftFilters.startDate
                          : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-card px-6 py-4">
          <Button
            onClick={onApply}
            className="w-full h-11 text-base font-semibold bg-brand hover:bg-brand/90 text-brand-foreground"
            size="lg"
          >
            <Check className="w-5 h-5 mr-2" />
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}




interface MultiSelectSectionProps {
  label: string;
  items: string[];
  selectedItems: string[];
  idPrefix: string;
  disabled?: boolean;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  emptyMessage: string;
}

// Scrollable checkbox list with Select All / Clear.
function MultiSelectSection({
  label,
  items,
  selectedItems,
  idPrefix,
  disabled = false,
  onToggle,
  onSelectAll,
  onClear,
  emptyMessage,
}: MultiSelectSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground/80">{label}</Label>
        {selectedItems.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedItems.length} selected
          </Badge>
        )}
      </div>
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={onSelectAll}
          disabled={disabled}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
      <ScrollArea className="h-48 border rounded-md p-3">
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox
                id={`${idPrefix}-${item}`}
                checked={selectedItems.includes(item)}
                onCheckedChange={() => onToggle(item)}
                disabled={disabled}
              />
              <Label
                htmlFor={`${idPrefix}-${item}`}
                className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {item}
              </Label>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
