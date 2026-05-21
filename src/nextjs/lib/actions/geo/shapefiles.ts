'use server';

import { revalidatePath } from 'next/cache';
import AdmZip from 'adm-zip';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth';

// Define the expected properties based on your boundary data
interface BoundaryProperties {
  OBJECTID?: number;
  Id?: number;
  TEMP_MUN?: string;
  TEMP_PROV?: string;
  TEMP_BRGY?: string;
  Brgy_Name?: string;
  Shape_Leng?: number;
  Shape_Area?: number;
  population?: number;
  [key: string]: any;
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: BoundaryProperties;
  geometry: any;
}

interface UploadResult {
  success: boolean;
  message: string;
  errors?: string[];
}

// Extract SRID from .prj file content
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
  
  console.warn('Could not determine SRID from .prj file, defaulting to 4326 (WGS84)');
  return 4326;
}

// Detect SRID from coordinate values
function detectSRIDFromCoordinates(geometry: any): number {
  if (!geometry || !geometry.coordinates) {
    return 4326;
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
      return 4326;
    }

    const [x, y] = firstPoint;

    if (x > 100000 && x < 1000000 && y > 1000000 && y < 2000000) {
      console.log('Coordinates look like UTM Zone 51N:', { x, y });
      return 32651;
    }

    if (x > 116 && x < 127 && y > 4 && y < 21) {
      console.log('Coordinates look like WGS84:', { x, y });
      return 4326;
    }

    console.warn('Could not confidently determine SRID from coordinates:', { x, y });
    return 4326;
  } catch (error) {
    console.error('Error detecting SRID from coordinates:', error);
    return 4326;
  }
}

// Transform geometry to WGS84 for comparison
async function transformGeometryToWGS84(geometry: any, sourceSRID: number): Promise<any> {
  if (sourceSRID === 4326) {
    return geometry; // Already in WGS84
  }
  
  try {
    // Use PostGIS to transform the geometry
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

// Check if two geometries are significantly different
function geometriesAreDifferent(geom1: any, geom2: any): boolean {
  try {
    if (geom1.type !== geom2.type) return true;
    
    const normalize = (obj: any) => {
      return JSON.stringify(obj, (key, val) => {
        if (typeof val === 'number') {
          return Math.round(val * 10000000) / 10000000;
        }
        return val;
      });
    };
    
    const str1 = normalize(geom1);
    const str2 = normalize(geom2);
    
    if (str1 === str2) {
      return false;
    }
    
    if (geom1.type === 'Polygon' && geom2.type === 'Polygon') {
      const coords1 = geom1.coordinates[0] || [];
      const coords2 = geom2.coordinates[0] || [];
      const coords1Count = coords1.length;
      const coords2Count = coords2.length;
      
      if (coords1Count === coords2Count) {
        const tolerance = 0.0000001;
        let matchedPoints = 0;
        const samplesToCheck = Math.min(coords1Count, 10);
        
        for (let i = 0; i < samplesToCheck; i++) {
          const p1 = coords1[i];
          const p2 = coords2[i];
          
          if (p1 && p2 && 
              Math.abs(p1[0] - p2[0]) < tolerance && 
              Math.abs(p1[1] - p2[1]) < tolerance) {
            matchedPoints++;
          }
        }
        
        const matchPercentage = (matchedPoints / samplesToCheck) * 100;
        
        if (matchPercentage >= 90) {
          return false;
        }
      }
      
      const percentChange = Math.abs(coords1Count - coords2Count) / Math.max(coords1Count, 1);
      if (percentChange > 0.05) {
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error comparing geometries:', error);
    return true;
  }
}

export async function uploadShapefileAction(
  formData: FormData
): Promise<UploadResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'Authentication required. Please log in to upload files.' };
    }

    const file = formData.get('shapefile') as File;

    if (!file) {
      return { success: false, message: 'No file selected. Please choose a file to upload.' };
    }

    if (!file.name.endsWith('.zip')) {
      return { success: false, message: 'Invalid file format. Only ZIP files containing shapefiles are accepted.' };
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      return { 
        success: false, 
        message: `File size exceeds maximum limit. Your file is ${fileSizeMB} MB. Maximum allowed size is 50 MB.` 
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const shpEntries = zipEntries.filter((entry) => entry.name.toLowerCase().endsWith('.shp'));
    const dbfEntries = zipEntries.filter((entry) => entry.name.toLowerCase().endsWith('.dbf'));
    const prjEntries = zipEntries.filter((entry) => entry.name.toLowerCase().endsWith('.prj'));

    if (shpEntries.length === 0 || dbfEntries.length === 0) {
      return {
        success: false,
        message: 'Invalid shapefile structure. The ZIP file must contain both .shp and .dbf files.',
      };
    }

    console.log('Found shapefiles:', shpEntries.map(e => e.name));

    // Prioritize barangay-level shapefiles
    let shpEntry = shpEntries.find(e => 
      e.name.toLowerCase().includes('brgy') || 
      e.name.toLowerCase().includes('barangay')
    );

    // If no brgy file found, then look for boundary or use first
    if (!shpEntry) {
      shpEntry = shpEntries.find(e =>
        e.name.toLowerCase().includes('boundary')
      ) || shpEntries[0];
    }

    // Reject zoning files
    if (shpEntry.name.toLowerCase().includes('zoning') || 
        shpEntry.name.toLowerCase().includes('zone')) {
      return {
        success: false,
        message: 'Invalid file type. The selected file contains zoning data. Please upload a barangay boundary shapefile.',
      };
    }

    const shpBaseName = shpEntry.name.replace('.shp', '').replace('.SHP', '');
    let dbfEntry = dbfEntries.find(e => e.name.includes(shpBaseName));
    
    if (!dbfEntry) {
      dbfEntry = dbfEntries[0];
    }

    let prjEntry = prjEntries.find(e => e.name.includes(shpBaseName));
    if (!prjEntry) {
      prjEntry = prjEntries[0];
    }

    console.log('Using shapefile:', shpEntry.name);
    console.log('Using dbf:', dbfEntry?.name);
    console.log('Using prj:', prjEntry?.name || 'none');

    let sourceSRID = 4326;
    if (prjEntry) {
      const prjContent = prjEntry.getData().toString('utf8');
      sourceSRID = extractSRID(prjContent);
      console.log(`SRID from .prj file: ${sourceSRID}`);
    }

    const shpBuffer = shpEntry.getData();
    const dbfBuffer = dbfEntry.getData();

    const { open } = await import('shapefile');
    const source = await open(shpBuffer, dbfBuffer);
    const features: GeoJSONFeature[] = [];
    const errors: string[] = [];

    console.log('Starting to read shapefile features...');

    let result = await source.read();
    while (!result.done) {
      try {
        const feature = result.value as GeoJSONFeature;

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

    // Validate that features have barangay names
    const featuresWithNames = features.filter(f => 
      f.properties.Brgy_Name || 
      f.properties.Name || 
      f.properties.name ||
      f.properties.BRGY_NAME
    );

    if (featuresWithNames.length === 0) {
      return {
        success: false,
        message: 'Invalid file. The shapefile does not contain barangay boundary data. No barangay names were found in the file attributes.',
      };
    }

    if (featuresWithNames.length < features.length * 0.5) {
      return {
        success: false,
        message: `Invalid file. Only ${featuresWithNames.length} of ${features.length} features contain barangay names. Please ensure the file contains valid barangay boundary data.`,
      };
    }

    if (sourceSRID === 4326 && features.length > 0) {
      const detectedSRID = detectSRIDFromCoordinates(features[0].geometry);
      if (detectedSRID !== 4326) {
        console.log(`Overriding SRID based on coordinate analysis: ${detectedSRID}`);
        sourceSRID = detectedSRID;
      }
    }

    console.log(`Using SRID ${sourceSRID} for transformation to 4326`);

    // 🆕 PRE-CHECK: Detect if this is a completely duplicate upload (all boundaries unchanged)
    console.log('\n🔍 Checking for boundary changes...');
    const barangayNames = featuresWithNames.map(f => 
      f.properties.Brgy_Name || 
      f.properties.Name || 
      f.properties.name ||
      f.properties.BRGY_NAME
    ).filter(Boolean);

    if (barangayNames.length > 0) {
      // Fetch all existing barangays in one query
      const existingBarangays = await prisma.$queryRaw<{ brgy_name: string; geometry: any }[]>`
        SELECT 
          brgy_name,
          ST_AsGeoJSON(geometry)::json as geometry
        FROM boundaries 
        WHERE brgy_name = ANY(${barangayNames}::text[])
      `;

      console.log(`   Found ${existingBarangays.length}/${barangayNames.length} existing barangays`);

      // If all barangays already exist, check if ANY have changed boundaries
      if (existingBarangays.length === barangayNames.length) {
        let hasAnyChanges = false;
        
        for (const feature of featuresWithNames) {
          const brgyName = feature.properties.Brgy_Name || 
                          feature.properties.Name || 
                          feature.properties.name ||
                          feature.properties.BRGY_NAME;
          
          const existing = existingBarangays.find(e => e.brgy_name === brgyName);
          
          if (!existing) {
            // New barangay
            hasAnyChanges = true;
            console.log(`   ✨ ${brgyName}: new barangay`);
            break;
          }
          
          // 🔧 FIX: Transform the new geometry to WGS84 before comparing
          const transformedGeometry = await transformGeometryToWGS84(feature.geometry, sourceSRID);
          
          // Check if boundary coordinates have changed (expansion/contraction)
          const boundaryChanged = geometriesAreDifferent(existing.geometry, transformedGeometry);
          if (boundaryChanged) {
            hasAnyChanges = true;
            console.log(`   📏 ${brgyName}: boundary changed`);
            break;
          }
        }

        if (!hasAnyChanges) {
          console.log('   ⚠️  No boundary changes detected - all barangays have identical coordinates');
          return {
            success: false,
            message: `Upload rejected. All ${barangayNames.length} barangay boundaries in this file already exist in the database with identical coordinates. Please upload a file with updated boundary information if barangays have expanded or changed.`,
          };
        }
        
        console.log('   ✅ Boundary changes detected, proceeding with upload...\n');
      } else {
        console.log(`   ✅ ${barangayNames.length - existingBarangays.length} new barangays detected, proceeding...\n`);
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    console.log(`Processing ${features.length} features...`);

    for (const feature of features) {
      const brgyName = feature.properties.Brgy_Name || 
                      feature.properties.Name || 
                      feature.properties.name ||
                      feature.properties.BRGY_NAME ||
                      null;
      
      if (!brgyName) {
        console.log('⚠️  Skipping feature without barangay name');
        skippedCount++;
        continue;
      }

      try {
        const firstCoord = feature.geometry.type === 'Polygon' 
          ? feature.geometry.coordinates[0][0]
          : feature.geometry.type === 'MultiPolygon'
          ? feature.geometry.coordinates[0][0][0]
          : null;
        
        console.log(`\n📍 Processing: ${brgyName}`);
        console.log(`   Original coords (SRID ${sourceSRID}):`, firstCoord);
        
        const existing = await prisma.$queryRaw<{ id: number; geometry: any }[]>`
          SELECT 
            id,
            ST_AsGeoJSON(geometry)::json as geometry
          FROM boundaries 
          WHERE brgy_name = ${brgyName} 
          LIMIT 1
        `;

        if (existing.length > 0) {
          const existingCoord = existing[0].geometry.type === 'Polygon'
            ? existing[0].geometry.coordinates[0][0]
            : existing[0].geometry.type === 'MultiPolygon'
            ? existing[0].geometry.coordinates[0][0][0]
            : null;
          
          console.log(`   Existing coords (WGS84):`, existingCoord);
          
          // Transform new geometry to WGS84 for comparison
          const transformedGeometry = await transformGeometryToWGS84(feature.geometry, sourceSRID);
          const isDifferent = geometriesAreDifferent(existing[0].geometry, transformedGeometry);
          
          if (isDifferent) {
            console.log(`   ✏️  Boundary changed (expansion/contraction), updating...`);
            
            await prisma.$executeRaw`
              UPDATE boundaries
              SET 
                object_id = ${feature.properties.OBJECTID || null},
                feature_id = ${feature.properties.Id || feature.properties.id || null},
                temp_mun = ${feature.properties.TEMP_MUN || null},
                temp_prov = ${feature.properties.TEMP_PROV || null},
                temp_brgy = ${feature.properties.TEMP_BRGY || null},
                shape_length = ${feature.properties.Shape_Leng || null},
                shape_area = ${feature.properties.Shape_Area || feature.properties.Area || null},
                population = ${feature.properties.population || feature.properties.Population || 0},
                geometry = ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), ${sourceSRID}::integer), 4326),
                properties = ${JSON.stringify(feature.properties)}::jsonb,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ${existing[0].id}
            `;
            
            const updated = await prisma.$queryRaw<{ geometry: any }[]>`
              SELECT ST_AsGeoJSON(geometry)::json as geometry
              FROM boundaries 
              WHERE id = ${existing[0].id}
            `;
            
            const updatedCoord = updated[0]?.geometry.type === 'Polygon'
              ? updated[0].geometry.coordinates[0][0]
              : updated[0]?.geometry.type === 'MultiPolygon'
              ? updated[0].geometry.coordinates[0][0][0]
              : null;
            
            console.log(`   ✅ Updated coords (WGS84):`, updatedCoord);
            
            updatedCount++;
          } else {
            skippedCount++;
            console.log(`   ⏭️  Skipped (boundary unchanged)`);
            continue;
          }
        } else {
          console.log(`   ➕ Inserting new barangay...`);
          
          await prisma.$executeRaw`
            INSERT INTO boundaries (
              object_id,
              feature_id,
              temp_mun,
              temp_prov,
              temp_brgy,
              brgy_name,
              shape_length,
              shape_area,
              population,
              geometry,
              properties,
              created_at,
              updated_at
            ) VALUES (
              ${feature.properties.OBJECTID || null},
              ${feature.properties.Id || feature.properties.id || null},
              ${feature.properties.TEMP_MUN || null},
              ${feature.properties.TEMP_PROV || null},
              ${feature.properties.TEMP_BRGY || null},
              ${brgyName},
              ${feature.properties.Shape_Leng || null},
              ${feature.properties.Shape_Area || feature.properties.Area || null},
              ${feature.properties.population || feature.properties.Population || 0},
              ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), ${sourceSRID}::integer), 4326),
              ${JSON.stringify(feature.properties)}::jsonb,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `;
          
          const inserted = await prisma.$queryRaw<{ geometry: any }[]>`
            SELECT ST_AsGeoJSON(geometry)::json as geometry
            FROM boundaries 
            WHERE brgy_name = ${brgyName}
            ORDER BY created_at DESC
            LIMIT 1
          `;
          
          const insertedCoord = inserted[0]?.geometry.type === 'Polygon'
            ? inserted[0].geometry.coordinates[0][0]
            : inserted[0]?.geometry.type === 'MultiPolygon'
            ? inserted[0].geometry.coordinates[0][0][0]
            : null;
          
          console.log(`   ✅ Inserted coords (WGS84):`, insertedCoord);
          
          insertedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${brgyName}:`, error);
        errors.push(
          `Failed to process ${brgyName || 'unknown'}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    console.log(`\n📊 Processing Summary:`);
    console.log(`   ✅ Inserted: ${insertedCount}`);
    console.log(`   🔄 Updated: ${updatedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    const totalAffected = insertedCount + updatedCount;

    if (totalAffected > 0) {
      try {
        await prisma.boundaryShapefileUpload.create({
          data: {
            filename: file.name,
            uploadedBy: user.id,
          },
        });
        console.log('✅ Upload history saved');
      } catch (historyError) {
        console.error('❌ Error saving upload history:', historyError);
      }

      const action = updatedCount > 0 ? 'UPDATE' : 'CREATE';
      
      await logActivity({
        action,
        entity: 'shapefile',
        description: `${file.name} (SRID: ${sourceSRID} → 4326) - ${insertedCount} inserted, ${updatedCount} updated`,
      });
    } else {
      console.log('⏭️  No changes made - upload history not saved');
    }

    revalidatePath('/');
    revalidatePath('/dashboard/crime_mapping');
    revalidatePath('/dashboard/shapefile');

    let message = '';
    
    if (totalAffected === 0) {
      message = `No changes required. All ${featuresWithNames.length} barangay boundaries are already current in the system.`;
    } else {
      const parts = [];
      if (insertedCount > 0) parts.push(`${insertedCount} ${insertedCount === 1 ? 'barangay' : 'barangays'} added`);
      if (updatedCount > 0) parts.push(`${updatedCount} ${updatedCount === 1 ? 'boundary' : 'boundaries'} updated`);
      if (skippedCount > 0) parts.push(`${skippedCount} unchanged`);
      
      message = `Successfully processed ${featuresWithNames.length} barangay ${featuresWithNames.length === 1 ? 'boundary' : 'boundaries'}: ${parts.join(', ')}.`;
    }
    
    message += ` Coordinate system: SRID ${sourceSRID} transformed to WGS84.`;

    return {
      success: true,
      message,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Shapefile upload error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred during file processing. Please try again or contact system administrator.',
    };
  }
}