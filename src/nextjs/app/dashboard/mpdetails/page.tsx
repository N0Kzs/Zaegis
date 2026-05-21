/**
 * @file Entry point for the Resources (mpdetails) page.
 *
 * Thin wrapper that renders the ResourcesClient orchestrator,
 * following the same pattern as crime_mapping/page.tsx and ciras_rep/page.tsx.
 */

import ResourcesClient from './components/ResourcesClient';

export default function ManpowerDetails() {
  return <ResourcesClient />;
}