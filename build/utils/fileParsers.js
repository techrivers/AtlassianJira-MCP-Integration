"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelFile = parseExcelFile;
exports.parseGoogleSheetCsv = parseGoogleSheetCsv;
const XLSX = __importStar(require("xlsx"));
const sync_1 = require("csv-parse/sync");
// Helper: Normalize header names to canonical field names
function normalizeHeader(header) {
    const h = header.trim().toLowerCase();
    if (h === 'title' || h === 'story title')
        return 'title';
    if (h === 'description')
        return 'description';
    if (h === 'acceptance criteria' || h === 'criteria')
        return 'acceptanceCriteria';
    if (h === 'story points' || h === 'points')
        return 'storyPoints';
    return h;
}
// Helper: Trim all values in a row
function trimRowValues(raw) {
    const trimmed = {};
    for (const key in raw) {
        if (typeof raw[key] === 'string') {
            trimmed[key] = raw[key].trim();
        }
        else {
            trimmed[key] = raw[key];
        }
    }
    return trimmed;
}
// Helper: Map a raw row to UserStoryRow
function mapRow(raw, headerMap) {
    const trimmedRaw = trimRowValues(raw);
    const row = {};
    for (const [orig, canon] of Object.entries(headerMap)) {
        if (canon === 'storyPoints') {
            const val = trimmedRaw[orig];
            row[canon] = val !== undefined && val !== null && val !== '' ? Number(val) : undefined;
        }
        else {
            row[canon] = trimmedRaw[orig];
        }
    }
    return row;
}
// Parses an Excel file buffer and returns an array of user story rows
async function parseExcelFile(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (json.length === 0)
        return [];
    // Build header map
    const headers = Object.keys(json[0]).map(h => h.trim());
    const headerMap = {};
    for (const h of headers) {
        headerMap[h] = normalizeHeader(h);
    }
    // Map rows
    return json.map(row => mapRow(row, headerMap));
}
// Parses a CSV string (from Google Sheets) and returns an array of user story rows
async function parseGoogleSheetCsv(csv) {
    const records = (0, sync_1.parse)(csv, { columns: true, skip_empty_lines: true });
    if (records.length === 0)
        return [];
    // Build header map
    const headers = Object.keys(records[0]).map(h => h.trim());
    const headerMap = {};
    for (const h of headers) {
        headerMap[h] = normalizeHeader(h);
    }
    // Map rows
    return records.map((row) => mapRow(row, headerMap));
}
