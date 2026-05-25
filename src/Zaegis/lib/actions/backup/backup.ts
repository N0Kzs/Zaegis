'use server';

import prisma from '@/lib/db';
import type { CrimeFilters, CrimeLocation, FilterOptions } from '@/lib/types/crimes';

/**
 * Get filtered crime locations for map display
 */
export async function getFilteredLocations(filters: CrimeFilters): Promise<CrimeLocation[]> {
  const whereClause: any = {
    lat: { not: null },
    lng: { not: null },
  };

  // Apply filters
  if (filters.offenseType && filters.offenseType !== 'All') {
    whereClause.offenseType = filters.offenseType;
  }

  if (filters.offense && filters.offense !== 'All') {
    whereClause.offense = filters.offense;
  }

  if (filters.incidentType && filters.incidentType !== 'All') {
    whereClause.incidentType = filters.incidentType;
  }

  if (filters.barangay && filters.barangay !== 'All') {
    // Use case-insensitive search to handle potential mismatches
    whereClause.barangay = {
      equals: filters.barangay,
      mode: 'insensitive'
    };
  }

  // Date range filter
  if (filters.startDate && filters.endDate) {
    const dateField = filters.dateField || 'dateCommitted';
    whereClause[dateField] = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  }
  // Query database
  const locations = await prisma.ciras_data.findMany({
    where: whereClause,
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
    take: 2500,
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
 * Get available filter options based on current selections
 */
export async function getFilterOptions(
  currentOffenseType?: string,
  currentOffense?: string
): Promise<FilterOptions> {
  // Get all offense types
  const offenseTypesQuery = `
    SELECT "offenseType", COUNT(*) as count
    FROM "ciras_data" 
    WHERE "offenseType" IS NOT NULL 
    AND "offenseType" != '' 
    GROUP BY "offenseType"
    ORDER BY count DESC, "offenseType" ASC
    LIMIT 100
  `;
  
  const offenseTypesResult = await prisma.$queryRawUnsafe(offenseTypesQuery);
  const offenseTypes = Array.isArray(offenseTypesResult)
    ? offenseTypesResult.map((item: any) => item.offenseType).filter(Boolean)
    : [];

  // Get offenses filtered by type
  let offensesQuery = `
    SELECT "offense", COUNT(*) as count
    FROM "ciras_data" 
    WHERE "offense" IS NOT NULL 
    AND "offense" != ''
  `;
  const queryParams: any[] = [];
  
  if (currentOffenseType && currentOffenseType !== 'All') {
    offensesQuery += ` AND "offenseType" = $1`;
    queryParams.push(currentOffenseType);
  }
  
  offensesQuery += ` GROUP BY "offense" ORDER BY count DESC LIMIT 100`;

  const offensesResult = queryParams.length > 0 
    ? await prisma.$queryRawUnsafe(offensesQuery, ...queryParams)
    : await prisma.$queryRawUnsafe(offensesQuery);
    
  const offenses = Array.isArray(offensesResult)
    ? offensesResult.map((item: any) => item.offense).filter(Boolean)
    : [];

  // Get incident types
  let incidentTypesQuery = `
    SELECT "incidentType", COUNT(*) as count
    FROM "ciras_data" 
    WHERE "incidentType" IS NOT NULL 
    AND "incidentType" != ''
  `;
  const incidentQueryParams: any[] = [];
  
  if (currentOffenseType && currentOffenseType !== 'All') {
    incidentTypesQuery += ` AND "offenseType" = $${incidentQueryParams.length + 1}`;
    incidentQueryParams.push(currentOffenseType);
  }
  if (currentOffense && currentOffense !== 'All') {
    incidentTypesQuery += ` AND "offense" = $${incidentQueryParams.length + 1}`;
    incidentQueryParams.push(currentOffense);
  }
  
  incidentTypesQuery += ` GROUP BY "incidentType" ORDER BY count DESC LIMIT 100`;

  const incidentTypesResult = incidentQueryParams.length > 0 
    ? await prisma.$queryRawUnsafe(incidentTypesQuery, ...incidentQueryParams)
    : await prisma.$queryRawUnsafe(incidentTypesQuery);
    
  const incidentTypes = Array.isArray(incidentTypesResult)
    ? incidentTypesResult.map((item: any) => item.incidentType).filter(Boolean)
    : [];

  return { offenseTypes, offenses, incidentTypes };
}

/**
 * Get all barangay names from crime data (not population table)
 * This ensures the dropdown shows only barangays that have crime data
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

/**
 * Debug function to compare barangay names between tables
 */
export async function debugBarangayMismatch(): Promise<{
  populationBarangays: string[];
  crimeBarangays: string[];
  mismatches: string[];
}> {
  // Get barangays from population table
  const populationBarangays = await prisma.population.findMany({
    select: { barangays: true },
    orderBy: { barangays: 'asc' }
  });

  // Get barangays from crime data
  const crimeBarangaysQuery = `
    SELECT DISTINCT "barangay"
    FROM "ciras_data"
    WHERE "barangay" IS NOT NULL 
    AND "barangay" != ''
    ORDER BY "barangay" ASC
  `;
  
  const crimeResult = await prisma.$queryRawUnsafe(crimeBarangaysQuery);
  
  const popBarangayNames = populationBarangays.map(b => b.barangays);
  const crimeBarangayNames = Array.isArray(crimeResult)
    ? crimeResult.map((item: any) => item.barangay).filter(Boolean)
    : [];

  // Find mismatches (barangays in population but not in crime data)
  const mismatches = popBarangayNames.filter(
    pb => !crimeBarangayNames.some(cb => cb.toLowerCase() === pb.toLowerCase())
  );

  return {
    populationBarangays: popBarangayNames,
    crimeBarangays: crimeBarangayNames,
    mismatches
  };
}