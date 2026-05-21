'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Map,
  FileText,
  Users,
  Car,
  Building2,
  Upload,
  Settings,
  Shield,
  AlertTriangle,
  GitCompare,
  Database,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

// ── Static navigation items ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',            href: '/dashboard',                    icon: LayoutDashboard,  group: 'Pages' },
  { label: 'Standard Deployment',  href: '/dashboard/reports',            icon: FileText,         group: 'Pages' },
  { label: 'Hybrid Deployment',    href: '/dashboard/hybrid',             icon: GitCompare,       group: 'Pages' },
  { label: '5MRT Deployment',      href: '/dashboard/5mrt',               icon: Shield,           group: 'Pages' },
  { label: 'Crime Mapping',        href: '/dashboard/crime_mapping',      icon: Map,              group: 'Pages' },
  { label: 'Risk Analysis',        href: '/dashboard/riskanalysis',       icon: AlertTriangle,    group: 'Pages' },
  { label: 'GeoData',             href: '/dashboard/pcensus',            icon: Building2,        group: 'Pages' },
  { label: 'Barangay Demographics',href: '/dashboard/pcensus?tab=profile',   icon: Building2,   group: 'Pages' },
  { label: 'Zoning Management',    href: '/dashboard/pcensus?tab=zoning',    icon: Building2,   group: 'Pages' },
  { label: 'Boundary Shapefile',   href: '/dashboard/pcensus?tab=activity',  icon: Building2,   group: 'Pages' },
  { label: 'CIRAS Report',         href: '/dashboard/ciras_rep',          icon: Upload,           group: 'Pages' },
  { label: 'MP Details',           href: '/dashboard/mpdetails',          icon: Users,            group: 'Pages' },
  { label: 'Personnel',            href: '/dashboard/mpdetails',          icon: Users,            group: 'Pages' },
  { label: 'Vehicles',             href: '/dashboard/mpdetails/vehicles', icon: Car,              group: 'Pages' },
  { label: 'Administration',       href: '/dashboard/administration',     icon: Database,         group: 'Pages' },
  { label: 'Settings',             href: '/dashboard/settings',           icon: Settings,         group: 'Pages' },
];

// Pre-group at module level (static data — no need for useMemo)
function buildGrouped() {
  const map: Record<string, typeof NAV_ITEMS> = {};
  for (const item of NAV_ITEMS) {
    if (!map[item.group]) map[item.group] = [];
    map[item.group].push(item);
  }
  return Object.entries(map);
}
const GROUPED_ITEMS = buildGrouped();

interface GlobalSearchProps {
  /** Optionally pass open state up if the trigger is external */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearch({ open: openProp, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const isControlled = openProp !== undefined;
  const isOpen = isControlled ? openProp : open;
  const setIsOpen = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setOpen;

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const navigate = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  // NAV_ITEMS is static so no need for useMemo
  const grouped = GROUPED_ITEMS;

  return (
    <>
      {/* Trigger button (shown in navbar) */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 hover:bg-muted/70 text-muted-foreground text-sm transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search…</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile icon-only button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex sm:hidden items-center justify-center h-9 w-9 rounded-md border border-border bg-muted/40 hover:bg-muted/70 text-muted-foreground transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Command Dialog */}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput placeholder="Search pages, modules…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {grouped.map(([group, items], idx) => (
            <React.Fragment key={group}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href + item.label}
                      value={item.label}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
