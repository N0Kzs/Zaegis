'use server';

import prisma from '@/lib/db';

export type BoundaryGeoJSON = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      [key: string]: any;
    };
    geometry: any;
  }>;
};

/**
 * Fetch all boundaries as GeoJSON from the database
 * AUTOMATICALLY TRANSFORMS stored geometry (any SRID) to WGS84 (SRID 4326)
 */
export async function getBoundariesGeoJSON(): Promise<BoundaryGeoJSON | null> {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(feature_data ORDER BY brgy_name)
      ) as geojson
      FROM (
        SELECT 
          brgy_name,
          json_build_object(
            'type', 'Feature',
            'id', id,
            'properties', json_build_object(
              'id', id,
              'OBJECTID', object_id,
              'Id', id,
              'TEMP_MUN', temp_mun,
              'TEMP_PROV', temp_prov,
              'TEMP_BRGY', temp_brgy,
              'Brgy_Name', UPPER(brgy_name),
              'Shape_Leng', shape_length,
              'Shape_Area', shape_area,
              'population', population
            ),
            -- ✅ THIS IS THE CRITICAL PART: Converts Raw DB SRID -> WGS84
            'geometry', ST_AsGeoJSON(ST_Transform(geometry, 4326))::json
          ) as feature_data
        FROM boundaries
        WHERE geometry IS NOT NULL
        ORDER BY brgy_name
      ) as features
    `;

    if (!result || result.length === 0 || !result[0].geojson) {
      console.log('❌ No boundaries data returned');
      return null;
    }

    return result[0].geojson as BoundaryGeoJSON;
  } catch (error) {
    console.error('💥 Error fetching boundaries GeoJSON:', error);
    return null;
  }
}

/**
 * Fetch all zoning boundaries as GeoJSON from the database
 * AUTOMATICALLY TRANSFORMS stored geometry (any SRID) to WGS84 (SRID 4326)
 */
export async function getZoningGeoJSON(): Promise<BoundaryGeoJSON | null> {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
              'id', id,
              'ZONA_LU', zone_code,
              'zone_code', zone_code,
              'zone_name', zone_name,
              'land_use_category', land_use_category,
              'area_sqm', area_sqm
            ),
            -- ✅ THIS IS THE CRITICAL PART: Converts Raw DB SRID -> WGS84
            'geometry', ST_AsGeoJSON(ST_Transform(geometry, 4326))::json
          )
          ORDER BY zone_code
        )
      ) as geojson
      FROM zoning_boundaries
      WHERE geometry IS NOT NULL
    `;

    if (!result || result.length === 0 || !result[0]?.geojson) {
      console.log('No zoning data found in database');
      return null;
    }

    const geoJson = result[0].geojson;

    return geoJson;
  } catch (error) {
    console.error('Error fetching zoning GeoJSON:', error);
    return null;
  }
}

/**
 * Get boundary by barangay name
 * AUTOMATICALLY TRANSFORMS stored geometry (any SRID) to WGS84 (SRID 4326)
 */
export async function getBoundaryByBarangay(barangayName: string) {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        brgy_name,
        population,
        shape_area,
        shape_length,
        -- ✅ THIS IS THE CRITICAL PART: Converts Raw DB SRID -> WGS84
        ST_AsGeoJSON(ST_Transform(geometry, 4326))::json as geometry
      FROM boundaries
      WHERE brgy_name = ${barangayName}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Error fetching boundary by barangay:', error);
    return null;
  }
}

/**
 * Get boundary count
 */
export async function getBoundaryCount(): Promise<number> {
  try {
    const count = await prisma.boundary.count();
    return count;
  } catch (error) {
    console.error('Error fetching boundary count:', error);
    return 0;
  }
}

/**
 * Get zoning count
 */
export async function getZoningCount(): Promise<number> {
  try {
    const count = await prisma.zoningBoundary.count();
    return count;
  } catch (error) {
    console.error('Error fetching zoning count:', error);
    return 0;
  }
}

/**
 * Get all barangay names for filter dropdown
 */
export async function getAllBarangayNames(): Promise<string[]> {
  try {
    // Note: Assuming your Prisma schema maps 'brgy_name' DB column to 'brgyName' field
    const result = await prisma.boundary.findMany({
      where: {
        brgyName: {
          not: null
        }
      },
      select: {
        brgyName: true
      },
      orderBy: {
        brgyName: 'asc'
      }
    });

    return result
      .map(b => b.brgyName)
      .filter((name): name is string => name !== null);
  } catch (error) {
    console.error('Error fetching barangay names:', error);
    return [];
  }
}

/**
 * Get zoning statistics
 */
export async function getZoningStatistics() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT 
        land_use_category,
        COUNT(*) as count,
        SUM(area_sqm) as total_area_sqm
      FROM zoning_boundaries
      GROUP BY land_use_category
      ORDER BY land_use_category
    `;

    return result;
  } catch (error) {
    console.error('Error fetching zoning statistics:', error);
    return [];
  }
}

/**
 * Get boundary statistics
 */
export async function getBoundaryStatistics() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total_barangays,
        SUM(population) as total_population,
        AVG(population) as avg_population,
        SUM(shape_area) as total_area
      FROM boundaries
    `;

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching boundary statistics:', error);
    return null;
  }
}