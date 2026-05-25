// Server component — fetches locations and barangay names, passes to client.

import { getAllLocations, getBarangayNames } from '@/lib/actions/crime';
import CrimeMapClient from './components/crime_map_client';

export const dynamic = 'force-dynamic';

export default async function CrimeMapPage() {
  const [allLocations, barangayNames] = await Promise.all([
    getAllLocations(),
    getBarangayNames(),
  ]);

  return (
    <CrimeMapClient
      allLocations={allLocations}
      barangayOptions={barangayNames}
    />
  );
}