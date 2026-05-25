/**
 * Shared utility for barangay risk-level coloring across deployment pages.
 * The risk map is populated by calling getBarangayRiskAnalysis() at page load.
 */

export interface BarangayRiskInfo {
    name: string;
    totalRisk: number;
}

/**
 * Given a barangay name and a risk lookup map, returns Tailwind classes for the badge.
 * Risk threshold is based on percentage of the max risk score in the dataset:
 *   >=75% → Critical (red)
 *   >=50% → High (orange)
 *   >=25% → Medium (yellow)
 *    <25% → Low (green/default)
 */
export function getBarangayRiskColor(
    barangayName: string,
    riskMap: Map<string, number>,
    maxRisk: number
): { bg: string; text: string; border: string; label: string } {
    const risk = riskMap.get(barangayName) ?? riskMap.get(barangayName.toUpperCase()) ?? 0;
    if (maxRisk <= 0 || risk <= 0) {
        return {
            bg: 'bg-muted/50',
            text: 'text-muted-foreground',
            border: 'border-border',
            label: 'Low',
        };
    }

    const percentage = (risk / maxRisk) * 100;

    if (percentage >= 75) {
        return {
            bg: 'bg-red-50 dark:bg-red-500/15',
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-300 dark:border-red-500/30',
            label: 'Critical',
        };
    }
    if (percentage >= 50) {
        return {
            bg: 'bg-orange-50 dark:bg-orange-500/15',
            text: 'text-orange-700 dark:text-orange-400',
            border: 'border-orange-300 dark:border-orange-500/30',
            label: 'High',
        };
    }
    if (percentage >= 25) {
        return {
            bg: 'bg-yellow-50 dark:bg-yellow-500/15',
            text: 'text-yellow-700 dark:text-yellow-400',
            border: 'border-yellow-300 dark:border-yellow-500/30',
            label: 'Medium',
        };
    }
    return {
        bg: 'bg-green-50 dark:bg-green-500/15',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-500/30',
        label: 'Low',
    };
}
