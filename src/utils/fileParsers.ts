import { UserStoryRow } from './types';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';

// Helper: Normalize header names to canonical field names
function normalizeHeader(header: string): string {
    const h = header.trim().toLowerCase();
    if (h === 'title' || h === 'story title') return 'title';
    if (h === 'description') return 'description';
    if (h === 'acceptance criteria' || h === 'criteria') return 'acceptanceCriteria';
    if (h === 'story points' || h === 'points') return 'storyPoints';
    return h;
}

// Helper: Trim all values in a row
function trimRowValues(raw: any): any {
    const trimmed: any = {};
    for (const key in raw) {
        if (typeof raw[key] === 'string') {
            trimmed[key] = raw[key].trim();
        } else {
            trimmed[key] = raw[key];
        }
    }
    return trimmed;
}

// Helper: Map a raw row to UserStoryRow
function mapRow(raw: any, headerMap: Record<string, string>): UserStoryRow {
    const trimmedRaw = trimRowValues(raw);
    const row: any = {};
    for (const [orig, canon] of Object.entries(headerMap)) {
        if (canon === 'storyPoints') {
            const val = trimmedRaw[orig];
            row[canon] = val !== undefined && val !== null && val !== '' ? Number(val) : undefined;
        } else {
            row[canon] = trimmedRaw[orig];
        }
    }
    return row as UserStoryRow;
}

// Parses an Excel file buffer and returns an array of user story rows
export async function parseExcelFile(buffer: Buffer): Promise<UserStoryRow[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (json.length === 0) return [];
    // Build header map
    const headers = Object.keys(json[0]).map(h => h.trim());
    const headerMap: Record<string, string> = {};
    for (const h of headers) {
        headerMap[h] = normalizeHeader(h);
    }
    // Map rows
    return json.map(row => mapRow(row, headerMap));
}

// Parses a CSV string (from Google Sheets) and returns an array of user story rows
export async function parseGoogleSheetCsv(csv: string): Promise<UserStoryRow[]> {
    const records = parse(csv, { columns: true, skip_empty_lines: true });
    if (records.length === 0) return [];
    // Build header map
    const headers = Object.keys(records[0]).map(h => h.trim());
    const headerMap: Record<string, string> = {};
    for (const h of headers) {
        headerMap[h] = normalizeHeader(h);
    }
    // Map rows
    return records.map((row: any) => mapRow(row, headerMap));
} 