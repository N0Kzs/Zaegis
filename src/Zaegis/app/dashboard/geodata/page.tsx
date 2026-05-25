/**
 * @file Entry point for the GeoData (geodata) page.
 */

import { Suspense } from 'react';
import GeoDataClient from './components/geo_data_client';

export default function SettingsPage() {
  return (
    <Suspense>
      <GeoDataClient />
    </Suspense>
  );
}