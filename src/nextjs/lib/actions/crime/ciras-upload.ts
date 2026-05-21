"use server";

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";

const prisma = new PrismaClient();

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
  status: string;
  message: string;
  details: {
    file_id_linked: number | null;
    weights_linked_count: number;
    in_file_duplicates_skipped: number;
    db_duplicates_found: number;
    new_records_identified_for_insertion: number;
    rows_successfully_processed_for_insertion: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const NULL_LIKE = new Set([
  "", "nan", "NaN", "None", "NONE", "Null", "NULL", "NA", "N/A",
  "<NA>", "#N/A", "#NULL!", "#VALUE!",
]);

function coerceString(val: unknown, fallback: string): string {
  if (val == null) return fallback;
  const s = String(val).trim();
  if (NULL_LIKE.has(s)) return fallback;
  return s;
}

function coerceDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  // xlsx stores dates as JS serial numbers
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

/** Parse a time value coming from Excel into a HH:MM:SS string for Postgres TIME */
function coerceTime(val: unknown): Date | null {
  if (val == null) return null;
  // Excel stores times as decimal fractions of a day (e.g. 0.5 = 12:00)
  if (typeof val === "number") {
    const totalSeconds = Math.round(val * 86400);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    // Use a fixed date; Prisma TIME maps to a Date object
    return new Date(1970, 0, 1, h, m, s);
  }
  const str = String(val).trim();
  if (!str || NULL_LIKE.has(str)) return null;
  // Try HH:MM or HH:MM:SS
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    return new Date(
      1970, 0, 1,
      parseInt(match[1]),
      parseInt(match[2]),
      match[3] ? parseInt(match[3]) : 0
    );
  }
  return null;
}

function coerceDecimal(val: unknown): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return String(n);
}

// Required columns (case-insensitive match)
const REQUIRED_COLS = [
  "blotterno", "dateencoded", "municipal", "barangay", "typeofplace",
  "datereported", "timereported", "datecommitted", "timecommitted",
  "incidenttype", "offense", "offensetype", "lat", "lng",
];

// ============================================================================
// MAIN UPLOAD SERVER ACTION
// ============================================================================

export async function uploadCirasFile(
  formData: FormData
): Promise<UploadResult> {
  // ── 0. Authenticate from cookie ─────────────────────────────────────────
  let userId: number;
  try {
    const user = await getCurrentUser();
    userId = user.id;
  } catch {
    return errorResult("Not authenticated. Please log in and try again.");
  }

  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return errorResult("No file provided or file is empty.");
  }

  const fileName = file.name;
  if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
    return errorResult("Invalid file format. Please upload .xlsx or .xls files only.");
  }

  // ── 1. Convert file to Buffer ────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileHash = calculateFileHash(buffer);

  // ── 2. Parse Excel ───────────────────────────────────────────────────────
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    return errorResult("Could not parse Excel file. Ensure it is a valid .xlsx or .xls file.");
  }

  if (!workbook.SheetNames.length) {
    return errorResult("Excel file has no sheets.");
  }

  // Combine all sheets into one flat array of row objects
  const allRows: Record<string, unknown>[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    });
    allRows.push(...rows);
  }

  if (!allRows.length) {
    return errorResult("All sheets are empty. Nothing to import.");
  }

  // Normalise column names to lowercase-alphanumeric-only for matching
  // Handles: spaces, underscores, hyphens, slashes, and other separators
  const normaliseKey = (k: string) =>
    k.trim().toLowerCase().replace(/[\s_\-/\\().]+/g, "");

  const normalised = allRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(row)) {
      out[normaliseKey(k)] = row[k];
    }
    return out;
  });

  // Check required columns exist (at least in first row)
  const sampleKeys = Object.keys(normalised[0] ?? {});
  const missing = REQUIRED_COLS.filter((c) => !sampleKeys.includes(c));
  if (missing.length) {
    const foundCols = sampleKeys.slice(0, 8).join(", ");
    return errorResult(
      `Missing required columns: ${missing.join(", ")}. ` +
      `Columns found in your file: ${foundCols}${sampleKeys.length > 8 ? "..." : ""}. ` +
      `Please ensure your Excel file uses the correct template.`
    );
  }

  // ── 3. Transform rows ────────────────────────────────────────────────────
  interface CirasRow {
    blotterno: string;
    dateEncoded: Date;
    municipal: string;
    barangay: string;
    typeofPlace: string;
    dateReported: Date | null;
    timeReported: Date | null;
    dateCommitted: Date | null;
    timeCommitted: Date | null;
    incidentType: string;
    offense: string;
    offenseType: string;
    lat: string | null;
    lng: string | null;
    fileId: number | null;
    weightId: number | null;
  }

  const transformed: CirasRow[] = normalised.map((row) => ({
    blotterno: coerceString(row["blotterno"], "")
      .split(".")[0]
      .trim(),
    dateEncoded: coerceDate(row["dateencoded"]) ?? new Date(),
    municipal: coerceString(row["municipal"], "Unknown"),
    barangay: coerceString(row["barangay"], "Unknown"),
    typeofPlace: coerceString(row["typeofplace"], "Unknown"),
    dateReported: coerceDate(row["datereported"]),
    timeReported: coerceTime(row["timereported"]),
    dateCommitted: coerceDate(row["datecommitted"]),
    timeCommitted: coerceTime(row["timecommitted"]),
    incidentType: coerceString(row["incidenttype"], "Unknown Incident Type"),
    offense: coerceString(row["offense"], "Unknown Offense"),
    offenseType: coerceString(row["offensetype"], "Unknown Offense Type"),
    lat: coerceDecimal(row["lat"]),
    lng: coerceDecimal(row["lng"]),
    fileId: null,
    weightId: null,
  }));

  // Filter out blank blotternos
  const valid = transformed.filter((r) => r.blotterno !== "");

  // ── 4. In-file deduplication ─────────────────────────────────────────────
  const seenInFile = new Map<string, CirasRow>();
  for (const row of valid) {
    if (!seenInFile.has(row.blotterno)) seenInFile.set(row.blotterno, row);
  }
  const inFileDupesSkipped = valid.length - seenInFile.size;
  const uniqueRows = Array.from(seenInFile.values());

  if (!uniqueRows.length) {
    return {
      status: "success_no_unique_data_in_file",
      message: `File processed. After removing ${inFileDupesSkipped} duplicates, no unique records remained.`,
      details: {
        file_id_linked: null,
        weights_linked_count: 0,
        in_file_duplicates_skipped: inFileDupesSkipped,
        db_duplicates_found: 0,
        new_records_identified_for_insertion: 0,
        rows_successfully_processed_for_insertion: 0,
      },
    };
  }

  // ── 5. Check existing blotternos in DB ───────────────────────────────────
  const existingBlotternos = await prisma.ciras_data.findMany({
    select: { blotterno: true },
  });
  const existingSet = new Set(existingBlotternos.map((r) => r.blotterno.trim()));

  const newRows = uniqueRows.filter((r) => !existingSet.has(r.blotterno));
  const dbDupesFound = uniqueRows.length - newRows.length;

  if (!newRows.length) {
    return {
      status: "success_all_records_exist_in_db",
      message: `All ${uniqueRows.length} unique record(s) already exist in the database.`,
      details: {
        file_id_linked: null,
        weights_linked_count: 0,
        in_file_duplicates_skipped: inFileDupesSkipped,
        db_duplicates_found: dbDupesFound,
        new_records_identified_for_insertion: 0,
        rows_successfully_processed_for_insertion: 0,
      },
    };
  }

  // ── 6. Resolve offense → weightId ────────────────────────────────────────
  const uniqueOffenses = [...new Set(newRows.map((r) => r.offense).filter(Boolean))];
  const weightMap = new Map<string, number>();
  if (uniqueOffenses.length) {
    const weights = await prisma.crime_weights.findMany({
      where: { offense: { in: uniqueOffenses } },
      select: { cw_id: true, offense: true },
    });
    for (const w of weights) weightMap.set(w.offense, w.cw_id);
  }

  // ── 7. Create or find file_uploads record ────────────────────────────────
  let fileId: number;
  const existingUpload = await prisma.file_uploads.findFirst({
    where: { fileHash },
    select: { id: true },
  });
  if (existingUpload) {
    fileId = existingUpload.id;
  } else {
    const created = await prisma.file_uploads.create({
      data: { filename: fileName, fileHash, uploadedAt: new Date(), uploaderId: userId },
    });
    fileId = created.id;
  }

  // ── 8. Prepare final rows ────────────────────────────────────────────────
  const rowsToInsert = newRows.map((r) => ({
    ...r,
    fileId,
    weightId: weightMap.get(r.offense) ?? null,
    lat: r.lat !== null ? parseFloat(r.lat) : null,
    lng: r.lng !== null ? parseFloat(r.lng) : null,
  }));

  // ── 9. Bulk upsert with ON CONFLICT DO NOTHING ───────────────────────────
  let inserted = 0;
  try {
    // Prisma createMany with skipDuplicates
    const result = await prisma.ciras_data.createMany({
      data: rowsToInsert as any,
      skipDuplicates: true,
    });
    inserted = result.count;
  } catch (err) {
    console.error("[uploadCirasFile] DB insert error:", err);
    return errorResult(`Database insert failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  const weightsLinked = rowsToInsert.filter((r) => r.weightId != null).length;

  return {
    status: inserted > 0 ? "success" : "success_all_new_identified_existed_on_conflict",
    message: inserted > 0
      ? `${inserted} new record(s) imported and linked to file ID ${fileId}. ${weightsLinked} record(s) linked with crime weights.`
      : `No new records were inserted (all may have conflicted). ${dbDupesFound} DB duplicates, ${inFileDupesSkipped} in-file duplicates.`,
    details: {
      file_id_linked: fileId,
      weights_linked_count: weightsLinked,
      in_file_duplicates_skipped: inFileDupesSkipped,
      db_duplicates_found: dbDupesFound,
      new_records_identified_for_insertion: newRows.length,
      rows_successfully_processed_for_insertion: inserted,
    },
  };
}

function errorResult(message: string): UploadResult {
  return {
    status: "error",
    message,
    details: {
      file_id_linked: null,
      weights_linked_count: 0,
      in_file_duplicates_skipped: 0,
      db_duplicates_found: 0,
      new_records_identified_for_insertion: 0,
      rows_successfully_processed_for_insertion: 0,
    },
  };
}

//Fetching Upload History
export async function getUploadHistory() {
  try {
    const uploads = await prisma.file_uploads.findMany({
      include: {
        uploader: { select: { id: true, user_email: true } },
      },
      orderBy: { uploadedAt: "desc" },
    });
    return uploads.map((upload) => ({
      id: upload.id,
      filename: upload.filename,
      fileHash: upload.fileHash,
      uploadedAt: upload.uploadedAt.toISOString(),
      uploader: { id: upload.uploader.id, user_email: upload.uploader.user_email },
    }));
  } catch (error) {
    console.error("Error fetching upload history:", error);
    throw new Error("Failed to fetch upload history");
  }
}

//Fetching File Contents
export async function getFileContents(fileId: number) {
  try {
    const cirasData = await prisma.ciras_data.findMany({
      where: { fileId },
      orderBy: { dateEncoded: "desc" },
    });
    return cirasData.map((record) => ({
      blotterno: record.blotterno,
      dateEncoded: record.dateEncoded.toISOString(),
      municipal: record.municipal,
      barangay: record.barangay,
      typeofPlace: record.typeofPlace,
      dateReported: record.dateReported?.toISOString() || null,
      timeReported: record.timeReported?.toString() || null,
      dateCommitted: record.dateCommitted?.toISOString() || null,
      timeCommitted: record.timeCommitted?.toString() || null,
      incidentType: record.incidentType,
      offense: record.offense,
      offenseType: record.offenseType,
      lat: record.lat?.toString() || null,
      lng: record.lng?.toString() || null,
      fileId: record.fileId,
      weightId: record.weightId,
    }));
  } catch (error) {
    console.error("Error fetching file contents:", error);
    throw new Error("Failed to fetch file contents");
  }
}