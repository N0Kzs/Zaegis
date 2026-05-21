import { FilterStatus } from "@/app/Types";


interface FilterTabsProps {
  activeCount: number;
  inactiveCount: number;
  totalCount: number;
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

export function FilterTabs({ 
  activeCount, 
  inactiveCount, 
  totalCount, 
  currentFilter, 
  onFilterChange 
}: FilterTabsProps) {
  const tabs = [
    { id: 'active' as FilterStatus, label: `Active Users (${activeCount})`, color: 'green' },
    { id: 'inactive' as FilterStatus, label: `Inactive Users (${inactiveCount})`, color: 'red' },
    { id: 'all' as FilterStatus, label: `All Users (${totalCount})`, color: 'blue' },
  ];

  const getTabStyle = (tabId: FilterStatus) => {
    const isActive = currentFilter === tabId;
    const colors = {
      green: isActive ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground hover:bg-muted/80',
      red: isActive ? 'bg-red-500/15 text-red-700 dark:text-red-400' : 'bg-muted text-muted-foreground hover:bg-muted/80',
      blue: isActive ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    };
    return colors[tabs.find(t => t.id === tabId)?.color as keyof typeof colors];
  };

  return (
    <div className="bg-card rounded-lg shadow-md mb-6 p-4">
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${getTabStyle(tab.id)}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}