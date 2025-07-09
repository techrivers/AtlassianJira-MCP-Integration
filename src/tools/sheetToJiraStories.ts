// Main handler for the sheetToJiraStories tool
// Accepts either a file buffer or a Google Sheets link, parses, validates, creates Jira stories, and returns a summary

import { SheetToJiraSummary } from '../utils/types';
import { parseExcelFile, parseGoogleSheetCsv } from '../utils/fileParsers';
import { validateUserStoryRows } from '../utils/rowValidator';
import { createJiraStory } from '../utils/jiraIssueCreator';
import { JiraFieldMapper } from '../utils/jiraFieldMapper';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export async function sheetToJiraStoriesHandler(input: { fileBuffer?: Buffer; googleSheetLink?: string }): Promise<SheetToJiraSummary> {
    let rows: any[] = [];
    if (input.fileBuffer) {
        // Parse Excel file without field normalization for dynamic mapping
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(input.fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (input.googleSheetLink) {
        // Convert to CSV export link if needed
        let csvUrl = input.googleSheetLink;
        if (!csvUrl.includes('/export?format=csv')) {
            const match = csvUrl.match(/\/d\/([\w-]+)/);
            if (match) {
                csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
            } else {
                throw new Error('Invalid Google Sheet link');
            }
        }
        const fetch = await import('node-fetch');
        const response = await fetch.default(csvUrl);
        if (!response.ok) throw new Error('Failed to fetch Google Sheet CSV');
        const csv = await response.text();
        // Parse CSV without field normalization for dynamic mapping
        const { parse } = await import('csv-parse/sync');
        rows = parse(csv, { columns: true, skip_empty_lines: true });
    } else {
        throw new Error('No input file or Google Sheet link provided');
    }

    if (rows.length === 0) {
        return { created: 0, failed: 0, errors: [] };
    }

    // Initialize field mapper for dynamic field discovery
    const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
    const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Jira environment variables are not configured. Check your .env file.');
    }

    const fieldMapper = new JiraFieldMapper(JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN);
    
    // Get actual column names from the spreadsheet
    const columnNames = Object.keys(rows[0]);
    console.log('Discovered spreadsheet columns:', columnNames);
    
    // Map columns to Jira fields and validate permissions
    const initialMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
    console.log('Initial field mapping:', initialMapping);
    
    const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'PROJ';
    const validatedMapping = await fieldMapper.validateFieldPermissions(initialMapping, JIRA_PROJECT_KEY);
    console.log('Validated field mapping:', validatedMapping);
    
    // Report unmapped/unavailable columns
    const unmappedColumns = fieldMapper.getUnmappedColumns(validatedMapping);
    if (unmappedColumns.length > 0) {
        console.warn('Unavailable columns (will be skipped):', unmappedColumns);
    }

    // Create a simplified validator that checks for basic required fields
    const validRows: { row: any, originalIndex: number }[] = [];
    const errors: any[] = [];

    rows.forEach((row, idx) => {
        const rowNum = idx + 2; // +2: 1 for header, 1 for 1-based index
        
        // Look for title/summary field (case insensitive)
        const titleField = Object.keys(row).find(key => 
            key.toLowerCase().includes('title') || 
            key.toLowerCase().includes('summary')
        );
        
        // Look for description field (case insensitive)
        const descField = Object.keys(row).find(key => 
            key.toLowerCase().includes('description') ||
            key.toLowerCase().includes('desc')
        );
        
        if (!titleField || !row[titleField] || row[titleField].trim() === '') {
            errors.push({ row: rowNum, reason: 'Missing Title/Summary' });
            return;
        }
        if (!descField || !row[descField] || row[descField].trim() === '') {
            errors.push({ row: rowNum, reason: 'Missing Description' });
            return;
        }
        
        validRows.push({ row, originalIndex: rowNum });
    });

    let created = 0;
    let failed = errors.length;
    const allErrors = [...errors];

    // Process valid rows and create Jira stories
    for (const { row, originalIndex } of validRows) {
        const result = await createJiraStory(row);
        if (result.success) {
            created++;
        } else {
            failed++;
            allErrors.push({ row: originalIndex, reason: result.error || 'Unknown error' });
        }
    }

    const result = {
        created,
        failed,
        errors: allErrors,
    };
    return result;
}

// Zod schema for input validation
const sheetToJiraStoriesSchema = z.object({
    fileBuffer: z.string().optional().describe("Excel file buffer (base64, optional)"),
    googleSheetLink: z.string().optional().describe("Public Google Sheets link (optional)")
});

type SheetToJiraStoriesInput = z.infer<typeof sheetToJiraStoriesSchema>;

export function registerSheetToJiraStoriesTool(server: McpServer) {
    server.tool(
        "sheetToJiraStories",
        "Creates Jira stories from a spreadsheet (Excel or Google Sheets link).",
        sheetToJiraStoriesSchema.shape,
        async (input: SheetToJiraStoriesInput) => {
            // At least one input must be provided
            if (!input.fileBuffer && !input.googleSheetLink) {
                throw new Error("Either fileBuffer or googleSheetLink must be provided");
            }
            // Convert fileBuffer from base64 string to Buffer if present
            let fileBuffer: Buffer | undefined = undefined;
            if (input.fileBuffer) {
                fileBuffer = Buffer.from(input.fileBuffer, 'base64');
            }
            const result = await sheetToJiraStoriesHandler({
                fileBuffer,
                googleSheetLink: input.googleSheetLink
            });
            // Wrap result for MCP/Claude compatibility
            const stringifiedErrors = result.errors.map(e => JSON.stringify(e));
            return {
                content: [
                    {
                        type: "text",
                        text: `Created: ${result.created}, Failed: ${result.failed}\nErrors: ${stringifiedErrors.join("; ")}`
                    }
                ],
                metadata: result
            };
        }
    );
} 