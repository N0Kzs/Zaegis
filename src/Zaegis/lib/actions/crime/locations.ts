'use server';

import prisma from '@/lib/db';
import type { CrimeLocation } from '@/lib/types/crimes';

/**
 * Get ALL crime locations (no filtering on server)
 */
export async function getAllLocations(): Promise<CrimeLocation[]> {
  const locations = await prisma.ciras_data.findMany({
    where: {
      lat: { not: null },
      lng: { not: null },
    },
    select: {
      blotterno: true,
      lat: true,
      lng: true,
      offenseType: true,
      offense: true,
      incidentType: true,
      barangay: true,
      dateCommitted: true,
      dateReported: true,
    },
    orderBy: {
      dateCommitted: 'desc',
    },
    take: 5000, // Adjust based on your data size
  });

  // Validate and format coordinates
  return locations
    .filter(loc => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      return (
        !isNaN(lat) && 
        !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
      );
    })
    .map(loc => ({
      id: loc.blotterno,
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      offenseType: loc.offenseType || undefined,
      offense: loc.offense || undefined,
      incidentType: loc.incidentType || undefined,
      barangay: loc.barangay || undefined,
      dateCommitted: loc.dateCommitted?.toISOString(),
      dateReported: loc.dateReported?.toISOString(),
    }));
}

/**
 * Get all barangay names from crime data
 */
export async function getBarangayNames(): Promise<string[]> {
  const barangaysQuery = `
    SELECT DISTINCT "barangay"
    FROM "ciras_data"
    WHERE "barangay" IS NOT NULL 
    AND "barangay" != ''
    ORDER BY "barangay" ASC
  `;
  
  const result = await prisma.$queryRawUnsafe(barangaysQuery);
  
  return Array.isArray(result)
    ? result.map((item: any) => item.barangay).filter(Boolean)
    : [];
}