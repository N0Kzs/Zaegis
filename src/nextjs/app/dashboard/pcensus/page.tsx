/**
 * @file Entry point for the GeoData (pcensus) page.
 */

import { Suspense } from 'react';
import GeoDataClient from './components/GeoDataClient';

export default function SettingsPage() {
  return (
    <Suspense>
      <GeoDataClient />
    </Suspense>
  );
}