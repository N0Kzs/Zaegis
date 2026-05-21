'use server';

import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/db';
import AdmZip from 'adm-zip';
import { logActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

interface ShapefileProperties {
  Id?: number;
  LandUSE?: string;
  N_Road?: string;
  AREA?: number;
  Zoning?: string;
  LABELS_ZON?: string;
  LAB_ZN_BLK?: string;
  LOT_NO?: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  featuresInserted?: number;
  errors?: string[];
}

interface UploadHistoryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract SRID from .prj file content
 */
function extractSRID(prjContent: string): number {
  const epsgMatch = prjContent.match(/AUTHORITY\["EPSG","(\d+)"\]/);
  if (epsgMatch) {
    return parseInt(epsgMatch[1]);
  }
  
  if (prjContent.includes('UTM_Zone_51N') || 
      prjContent.includes('UTM Zone 51N') ||
      (prjContent.includes('UTM') && prjContent.includes('51'))) {
    return 32651;
  }
  
  if (prjContent.includes('PRS_1992') || prjContent.includes('PRS92')) {
    if (prjContent.includes('Zone_5') || prjContent.includes('zone 5')) {
      return 25395;
    }
    return 4683;
  }
  
  if (prjContent.includes('WGS_1984') || prjContent.includes('WGS84')) {
    return 4326;
  }
  
  console.warn('Could not determine SRID from .prj file, defaulting to 32651 (UTM Zone 51N)');
  return 32651;
}

/**
 * Detect SRID from coordinate values
 */
function detectSRIDFromCoordinates(geometry: any): number {
  if (!geometry || !geometry.coordinates) {
    return 32651;
  }

  let firstPoint: number[] | null = null;
  
  try {
    if (geometry.type === 'Point') {
      firstPoint = geometry.coordinates;
    } else if (geometry.type === 'LineString') {
      firstPoint = geometry.coordinates[0];
    } else if (geometry.type === 'Polygon') {
      firstPoint = geometry.coordinates[0][0];
    } else if (geometry.type === 'MultiPolygon') {
      firstPoint = geometry.coordinates[0][0][0];
    }

    if (!firstPoint || firstPoint.length < 2) {
      return 32651;
    }

    const [x, y] = firstPoint;

    // UTM Zone 51N coordinates
    if (x > 100000 && x < 1000000 && y > 1000000 && y < 2000000) {
      console.log('Coordinates look like UTM Zone 51N:', { x, y });
      return 32651;
    }

    // WGS84 coordinates
    if (x > 116 && x < 127 && y > 4 && y < 21) {
      console.log('Coordinates look like WGS84:', { x, y });
      return 4326;
    }

    console.warn('Could not confidently determine SRID from coordinates:', { x, y });
    return 32651;
  } catch (error) {
    console.error('Error detecting SRID from coordinates:', error);
    return 32651;
  }
}

/**
 * Extract zone code from full zoning string
 * e.g., "R2-Z - Residential Zone 2" -> "R2-Z"
 */
function extractZoneCode(zoningStr: string): string {
  if (!zoningStr) return '';
  return zoningStr.split(' - ')[0].trim();
}

/**
 * Transform geometry to WGS84 for comparison
 */
async function transformGeometryToWGS84(geometry: any, sourceSRID: number): Promise<any> {
  if (sourceSRID === 4326) {
    return geometry;
  }
  
  try {
    const result = await prisma.$queryRaw<{ geometry: any }[]>`
      SELECT ST_AsGeoJSON(
        ST_Transform(
          ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), ${sourceSRID}::integer),
          4326
        )
      )::json as geometry
    `;
    
    return result[0]?.geometry || geometry;
  } catch (error) {
    console.error('Error transforming geometry:', error);
    return geometry;
  }
}

/**
 * Normalize geometry type (MultiPolygon with 1 polygon → Polygon)
 * PostGIS simplifies single-polygon MultiPolygons to Polygons when storing
 */
function normalizeGeometry(geom: any): any {
  // If MultiPolygon with only 1 polygon, treat as Polygon
  if (geom.type === 'MultiPolygon' && geom.coordinates.length === 1) {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates[0]
    };
  }
  return geom;
}

/**
 * Check if two geometries are significantly different
 */
function geometriesAreDifferent(geom1: any, geom2: any): boolean {
  try {
    // Normalize both geometries first (handles MultiPolygon vs Polygon issue)
    const norm1 = normalizeGeometry(geom1);
    const norm2 = normalizeGeometry(geom2);

    console.log(`         🔬 Comparing geometries (after normalization):`, {
      type1: norm1.type,
      type2: norm2.type,
      original1: geom1.type,
      original2: geom2.type,
    });

    if (norm1.type !== norm2.type) {
      console.log(`         ❌ Different geometry types: ${norm1.type} vs ${norm2.type}`);
      return true;
    }
    
    const normalize = (obj: any) => {
      return JSON.stringify(obj, (key, val) => {
        if (typeof val === 'number') {
          return Math.round(val * 10000000) / 10000000;
        }
        return val;
      });
    };
    
    const str1 = normalize(norm1);
    const str2 = normalize(norm2);
    
    if (str1 === str2) {
      console.log(`         ✓ Normalized strings match exactly`);
      return false;
    }
    
    console.log(`         ℹ️  Normalized strings differ, checking coordinates...`);
    
    // Handle Polygon (now both are guaranteed to be Polygon after normalization)
    if (norm1.type === 'Polygon' && norm2.type === 'Polygon') {
      const coords1 = norm1.coordinates[0] || [];
      const coords2 = norm2.coordinates[0] || [];
      const coords1Count = coords1.length;
      const coords2Count = coords2.length;
      
      console.log(`         📐 Polygon: ${coords1Count} vs ${coords2Count} points`);
      
      if (coords1Count !== coords2Count) {
        const percentChange = Math.abs(coords1Count - coords2Count) / Math.max(coords1Count, 1);
        console.log(`         📊 Point count diff: ${(percentChange * 100).toFixed(1)}%`);
        if (percentChange > 0.05) {
          console.log(`         ❌ >5% point count change - geometries different`);
          return true;
        }
      }
      
      const tolerance = 0.0000001;
      let matchedPoints = 0;
      const samplesToCheck = Math.min(coords1Count, coords2Count, 10);
      
      console.log(`         🔍 Checking ${samplesToCheck} sample points with tolerance ${tolerance}...`);
      
      for (let i = 0; i < samplesToCheck; i++) {
        const p1 = coords1[i];
        const p2 = coords2[i];
        
        if (p1 && p2) {
          const xDiff = Math.abs(p1[0] - p2[0]);
          const yDiff = Math.abs(p1[1] - p2[1]);
          
          if (xDiff < tolerance && yDiff < tolerance) {
            matchedPoints++;
          } else {
            console.log(`         ⚠️  Point ${i} mismatch: dx=${xDiff.toExponential(2)}, dy=${yDiff.toExponential(2)}`);
          }
        }
      }
      
      const matchPercentage = (matchedPoints / samplesToCheck) * 100;
      console.log(`         📊 Point match: ${matchedPoints}/${samplesToCheck} (${matchPercentage.toFixed(1)}%)`);
      
      if (matchPercentage >= 90) {
        console.log(`         ✓ ≥90% points match - geometries identical`);
        return false;
      } else {
        console.log(`         ❌ <90% points match - geometries different`);
        return true;
      }
    }
    
    // Handle true MultiPolygon (multiple polygons)
    if (norm1.type === 'MultiPolygon' && norm2.type === 'MultiPolygon') {
      const coords1 = norm1.coordinates[0]?.[0] || [];
      const coords2 = norm2.coordinates[0]?.[0] || [];
      const coords1Count = coords1.length;
      const coords2Count = coords2.length;
      
      console.log(`         📐 MultiPolygon: ${coords1Count} vs ${coords2Count} points (first ring)`);
      
      if (coords1Count !== coords2Count) {
        const percentChange = Math.abs(coords1Count - coords2Count) / Math.max(coords1Count, 1);
        console.log(`         📊 Point count diff: ${(percentChange * 100).toFixed(1)}%`);
        if (percentChange > 0.05) {
          console.log(`         ❌ >5% point count change - geometries different`);
          return true;
        }
      }
      
      const tolerance = 0.0000001;
      let matchedPoints = 0;
      const samplesToCheck = Math.min(coords1Count, coords2Count, 10);
      
      console.log(`         🔍 Checking ${samplesToCheck} sample points with tolerance ${tolerance}...`);
      
      for (let i = 0; i < samplesToCheck; i++) {
        const p1 = coords1[i];
        const p2 = coords2[i];
        
        if (p1 && p2) {
          const xDiff = Math.abs(p1[0] - p2[0]);
          const yDiff = Math.abs(p1[1] - p2[1]);
          
          if (xDiff < tolerance && yDiff < tolerance) {
            matchedPoints++;
          }
        }
      }
      
      const matchPercentage = (matchedPoints / samplesToCheck) * 100;
      console.log(`         📊 Point match: ${matchedPoints}/${samplesToCheck} (${matchPercentage.toFixed(1)}%)`);
      
      if (matchPercentage >= 90) {
        console.log(`         ✓ ≥90% points match - geometries identical`);
        return false;
      } else {
        console.log(`         ❌ <90% points match - geometries different`);
        return true;
      }
    }
    
    console.log(`         ❌ Unhandled geometry type or comparison failed`);
    return true;
  } catch (error) {
    console.error('         💥 Error comparing geometries:', error);
    return true;
  }
}

// ============================================
// UPLOAD ACTIONS
// ============================================

/**
 * Upload and process zoning shapefile
 */
export async function uploadZoningShapefileAction(
  formData: FormData
): Promise<UploadResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Authentication required. Please log in to upload files.',
      };
    }

    const file = formData.get('shapefile') as File;
    if (!file) {
      return {
        success: false,
        message: 'No file selected. Please choose a file to upload.',
      };
    }

    if (!file.name.endsWith('.zip')) {
      return {
        success: false,
        message: 'Invalid file format. Only ZIP files containing shapefiles are accepted.',
      };
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        success: false,
        message: `File size exceeds maximum limit. Your file is ${fileSizeMB} MB. Maximum allowed size is 50 MB.`,
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const shpEntries = zipEntries.filter((entry) => entry.entryName.toLowerCase().endsWith('.shp'));
    const dbfEntries = zipEntries.filter((entry) => entry.entryName.toLowerCase().endsWith('.dbf'));
    const prjEntries = zipEntries.filter((entry) => entry.entryName.toLowerCase().endsWith('.prj'));

    if (shpEntries.length === 0 || dbfEntries.length === 0) {
      return {
        success: false,
        message: 'Invalid shapefile structure. The ZIP file must contain both .shp and .dbf files.',
      };
    }

    console.log('Found shapefiles:', shpEntries.map(e => e.entryName));

    // Prioritize zoning shapefiles
    let shpEntry = shpEntries.find(e => 
      e.entryName.toLowerCase().includes('zoning') || 
      e.entryName.toLowerCase().includes('zone')
    );

    // If no zoning file found, use first shapefile
    if (!shpEntry) {
      shpEntry = shpEntries[0];
    }

    // Reject barangay boundary files
    if (shpEntry.entryName.toLowerCase().includes('brgy') || 
        shpEntry.entryName.toLowerCase().includes('barangay') ||
        shpEntry.entryName.toLowerCase().includes('boundary')) {
      return {
        success: false,
        message: 'Invalid file type. The selected file contains barangay boundary data. Please upload a zoning shapefile.',
      };
    }

    const shpBaseName = shpEntry.entryName.replace('.shp', '').replace('.SHP', '');
    let dbfEntry = dbfEntries.find(e => e.entryName.includes(shpBaseName));
    
    if (!dbfEntry) {
      dbfEntry = dbfEntries[0];
    }

    let prjEntry = prjEntries.find(e => e.entryName.includes(shpBaseName));
    if (!prjEntry) {
      prjEntry = prjEntries[0];
    }

    console.log('Using shapefile:', shpEntry.entryName);
    console.log('Using dbf:', dbfEntry?.entryName);
    console.log('Using prj:', prjEntry?.entryName || 'none');

    // Detect SRID from .prj file or coordinates
    let sourceSRID = 32651; // Default to UTM Zone 51N
    if (prjEntry) {
      const prjContent = prjEntry.getData().toString('utf8');
      sourceSRID = extractSRID(prjContent);
      console.log(`SRID from .prj file: ${sourceSRID}`);
    }

    const shpBuffer = shpEntry.getData();
    const dbfBuffer = dbfEntry.getData();

    const { open } = await import('shapefile');
    const source = await open(shpBuffer, dbfBuffer);
    const features: any[] = [];
    const errors: string[] = [];

    console.log('Starting to read shapefile features...');

    let result = await source.read();
    while (!result.done) {
      try {
        const feature = result.value;

        if (!feature.geometry || !feature.geometry.type) {
          errors.push(`Feature ${features.length + 1}: Invalid geometry`);
          result = await source.read();
          continue;
        }

        features.push(feature);
      } catch (error) {
        console.error(`Error reading feature ${features.length + 1}:`, error);
        errors.push(`Feature ${features.length + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      result = await source.read();
    }

    console.log(`Finished reading shapefile. Total features: ${features.length}`);

    if (features.length === 0) {
      return {
        success: false,
        message: 'Invalid file. No valid geographic features were found in the shapefile.',
        errors,
      };
    }

    // Validate that features have zoning data
    const featuresWithZoning = features.filter(f => 
      f.properties?.Zoning || 
      f.properties?.LandUSE ||
      f.properties?.LABELS_ZON
    );

    if (featuresWithZoning.length === 0) {
      return {
        success: false,
        message: 'Invalid file. The shapefile does not contain zoning data. No zoning or land use information was found in the file attributes.',
      };
    }

    if (featuresWithZoning.length < features.length * 0.5) {
      return {
        success: false,
        message: `Invalid file. Only ${featuresWithZoning.length} of ${features.length} features contain zoning information. Please ensure the file contains valid zoning data.`,
      };
    }

    // Verify coordinate system
    if (sourceSRID === 4326 && features.length > 0) {
      const detectedSRID = detectSRIDFromCoordinates(features[0].geometry);
      if (detectedSRID !== 4326) {
        console.log(`Overriding SRID based on coordinate analysis: ${detectedSRID}`);
        sourceSRID = detectedSRID;
      }
    }

    console.log(`Using SRID ${sourceSRID} for transformation to 4326`);

    // 🆕 PRE-CHECK: Detect duplicate upload by comparing coordinates BY POSITION
    console.log('\n🔍 Checking for duplicate zoning data...');

    const existingCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM zoning_boundaries
    `;

    const existingZoneCount = Number(existingCount[0].count);
    console.log(`📊 Existing zones in database: ${existingZoneCount}`);
    console.log(`📊 New zones in upload: ${features.length}`);

    // Only check for duplicates if counts match exactly
    if (existingZoneCount > 0 && existingZoneCount === features.length) {
      console.log(`   ✅ Same zone count detected (${existingZoneCount}), checking coordinates...`);
      
      // Fetch ALL existing zones with their geometries IN ORDER
      const existingZones = await prisma.$queryRaw<{ 
        id: number;
        zone_code: string; 
        geometry: any;
      }[]>`
        SELECT 
          id,
          zone_code,
          ST_AsGeoJSON(geometry)::json as geometry
        FROM zoning_boundaries
        ORDER BY id
      `;

      console.log(`   📦 Fetched ${existingZones.length} existing zones from database`);

      let hasAnyChanges = false;
      let checkedCount = 0;
      const maxChecks = Math.min(20, features.length);
      
      console.log(`   🎯 Will check ${maxChecks} zones for changes (comparing by position)...`);

      // Compare by POSITION (index), not by zone code!
      for (let i = 0; i < maxChecks; i++) {
        // Get a distributed sample
        const featureIndex = Math.floor((i * features.length) / maxChecks);
        const feature = features[featureIndex];
        const props = feature.properties as ShapefileProperties;
        const zoneCode = extractZoneCode(props.Zoning || props.LABELS_ZON || '');

        // CRITICAL FIX: Compare with the SAME POSITION in existing data
        const existingAtSamePosition = existingZones[featureIndex];

        console.log(`\n   🔎 Check ${i + 1}/${maxChecks}: Position ${featureIndex}`);
        console.log(`      Upload zone: "${zoneCode}"`);
        console.log(`      Existing zone at same position: "${existingAtSamePosition?.zone_code || 'N/A'}"`);

        if (!existingAtSamePosition) {
          hasAnyChanges = true;
          console.log(`   ✨ NEW ZONE: No zone exists at position ${featureIndex}`);
          break;
        }

        // Check if zone codes at same position are different (rezoning)
        if (existingAtSamePosition.zone_code !== zoneCode) {
          hasAnyChanges = true;
          console.log(`   🏗️ REZONING DETECTED: Position ${featureIndex} changed from "${existingAtSamePosition.zone_code}" to "${zoneCode}"`);
          break;
        }

        // Same zone code at same position - check if coordinates changed
        console.log(`      🔄 Transforming geometry to WGS84 for comparison...`);
        const transformedGeometry = await transformGeometryToWGS84(feature.geometry, sourceSRID);
        const coordinatesChanged = geometriesAreDifferent(existingAtSamePosition.geometry, transformedGeometry);

        console.log(`      🔬 Coordinates comparison: ${coordinatesChanged ? 'DIFFERENT' : 'IDENTICAL'}`);

        if (coordinatesChanged) {
          hasAnyChanges = true;
          console.log(`   📏 BOUNDARY CHANGE: "${zoneCode}" at position ${featureIndex} has expanded/contracted`);
          break;
        }

        console.log(`      ✓ Zone unchanged`);
        checkedCount++;
      }

      console.log(`\n   📊 Final results: Checked ${checkedCount}/${maxChecks} zones`);

      if (!hasAnyChanges) {
        console.log(`   ⚠️  DUPLICATE DETECTED - All checked zones are identical`);
        return {
          success: false,
          message: `Upload rejected. All ${features.length} zoning boundaries already exist in the database with identical coordinates. If zones have expanded, contracted, or new zones were added, please verify the shapefile data.`,
        };
      }

      console.log(`   ✅ Changes detected, proceeding with upload...\n`);
    } else if (existingZoneCount === 0) {
      console.log('   ✅ No existing zones found, proceeding with initial upload...\n');
    } else {
      console.log(`   ✅ Zone count changed (existing: ${existingZoneCount}, new: ${features.length}) - proceeding...\n`);
    }

    console.log(`Processing ${features.length} zoning features...`);

    let insertedCount = 0;

    // ✅ NOW delete existing data AFTER duplicate check passes
    await prisma.$executeRaw`DELETE FROM zoning_boundaries`;
    console.log('✅ Cleared existing zoning data');

    // Process and insert features
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const props = feature.properties as ShapefileProperties;

      try {
        // Validate required fields
        if (!props.Zoning && !props.LABELS_ZON) {
          errors.push(`Feature ${i + 1}: Missing required Zoning field`);
          continue;
        }

        const zoningLabel = props.Zoning || props.LABELS_ZON || '';
        const zoneCode = extractZoneCode(zoningLabel);

        console.log(`\n📍 Processing zone: ${zoneCode}`);

        // Insert into database with coordinate transformation
        await prisma.$executeRaw`
          INSERT INTO zoning_boundaries (
            zone_code,
            zone_name,
            land_use_category,
            geometry,
            area_sqm,
            created_by
          ) VALUES (
            ${zoneCode},
            ${zoningLabel},
            ${props.LandUSE || ''},
            ST_Transform(
              ST_SetSRID(
                ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),
                ${sourceSRID}::integer
              ),
              4326
            ),
            ST_Area(
              ST_Transform(
                ST_SetSRID(
                  ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}),
                  ${sourceSRID}::integer
                ),
                4326
              )::geography
            ),
            ${user.id}
          )
        `;

        insertedCount++;
        console.log(`   ✅ Inserted: ${zoneCode}`);
      } catch (error) {
        const errorMsg = `Feature ${i + 1} (${props.Zoning || 'Unknown'}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        errors.push(errorMsg);
        console.error(`   ❌ Error:`, error);
      }
    }

    console.log(`\n📊 Processing Summary:`);
    console.log(`   ✅ Inserted: ${insertedCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    // Save upload history
    if (insertedCount > 0) {
      try {
        await prisma.zoningShapefileUpload.create({
          data: {
            filename: file.name,
            featuresInserted: insertedCount,
            uploadedBy: user.id,
          },
        });
        console.log('✅ Upload history saved');
      } catch (historyError) {
        console.error('❌ Error saving upload history:', historyError);
      }

      // Log activity
      await logActivity({
        action: 'CREATE',
        entity: 'zoning_shapefile',
        description: `${file.name} (SRID: ${sourceSRID} → 4326) - ${insertedCount} zones inserted`,
      });
    }

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/dashboard/crime_mapping');
    revalidatePath('/dashboard/zoning');

    const message = `Successfully processed ${insertedCount} of ${features.length} zoning ${insertedCount === 1 ? 'feature' : 'features'}. Coordinate system: SRID ${sourceSRID} transformed to WGS84.`;

    return {
      success: true,
      message,
      featuresInserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Zoning shapefile upload error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred during file processing. Please try again or contact system administrator.',
    };
  }
}

// ============================================
// HISTORY & STATISTICS ACTIONS
// ============================================

/**
 * Get zoning upload history
 */
export async function getZoningUploadHistory(): Promise<UploadHistoryResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required. Please log in to view upload history.',
      };
    }

    const history = await prisma.zoningShapefileUpload.findMany({
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        uploader: {
          select: {
            id: true,
            user_email: true,
          },
        },
      },
    });

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error('Error fetching zoning upload history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upload history',
    };
  }
}
/**
 * Get zoning statistics
 */
export async function getZoningStats() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const stats = await prisma.$queryRaw<
      Array<{
        zone_code: string;
        zone_name: string;
        land_use_category: string;
        count: bigint;
        total_area_sqm: number;
      }>
    >`
      SELECT 
        zone_code,
        MAX(zone_name) as zone_name,
        land_use_category,
        COUNT(*) as count,
        COALESCE(SUM(area_sqm), 0) as total_area_sqm
      FROM zoning_boundaries
      GROUP BY zone_code, land_use_category
      ORDER BY zone_code
    `;

    return {
      success: true,
      data: stats.map((s) => ({
        ...s,
        count: Number(s.count),
      })),
    };
  } catch (error) {
    console.error('Error fetching zoning stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}