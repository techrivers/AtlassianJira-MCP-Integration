// Enhanced sheetToJiraStories tool with proper file handling and error recovery
import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import path from "path";
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { JiraFieldMapper } from '../utils/jiraFieldMapper';
import { dynamicConfig } from '../utils/configManager';

// --- Enhanced Interfaces ---
interface ParsedSheetRow {
    summary: string;
    description?: string;
    assignee?: string;
    priority: 'High' | 'Medium' | 'Low';
    issueType: 'Story' | 'Task' | 'Bug' | 'Epic';
    labels: string[];
    storyPoints?: number;
    [key: string]: any; // Support additional custom fields
}

interface SheetCreationResult {
    key: string;
    summary: string;
    assignee?: string;
}

interface BatchSheetResult {
    successful: SheetCreationResult[];
    failed: Array<{ row: ParsedSheetRow; rowNumber: number; error: string }>;
    summary: {
        total: number;
        created: number;
        failed: number;
        byType: Record<string, number>;
        byAssignee: Record<string, number>;
    };
    warnings: string[];
    unmappedColumns: string[];
}

// --- File Processing Functions ---
async function parseSpreadsheetFile(buffer: Buffer, filename: string): Promise<any[]> {
    const ext = path.extname(filename).toLowerCase();

    try {
        console.error(`Starting file parse - Extension: ${ext}, Buffer size: ${buffer.length}, First 20 bytes: ${buffer.slice(0, 20).toString('hex')}`);

        switch (ext) {
            case '.xlsx':
            case '.xls':
            case '.xlsm':
                console.error(`Parsing Excel file: ${filename} (${buffer.length} bytes)`);

                // Validate the buffer looks like an Excel file
                const bufferStart = buffer.slice(0, 8);
                console.error(`Excel file signature check: ${bufferStart.toString('hex')}`);

                const workbook = XLSX.read(buffer, {
                    type: 'buffer',
                    cellText: false,
                    cellDates: true,
                    raw: false // Ensure consistent string conversion
                });

                console.error(`Workbook loaded. Sheet names: ${workbook.SheetNames.join(', ')}`);

                if (workbook.SheetNames.length === 0) {
                    throw new Error('Excel file contains no sheets');
                }

                const sheetName = workbook.SheetNames[0];
                console.error(`Using sheet: ${sheetName}`);
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    throw new Error(`Could not access worksheet: ${sheetName}`);
                }

                // Get the range to understand the data structure
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
                console.error(`Worksheet range: ${XLSX.utils.encode_range(range)} (${range.e.r + 1} rows, ${range.e.c + 1} cols)`);

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    defval: '',
                    raw: false, // Convert everything to strings for consistent processing
                    dateNF: 'yyyy-mm-dd', // Standardize date format
                    blankrows: false // Skip completely blank rows
                });

                console.error(`Successfully parsed ${jsonData.length} rows from Excel`);
                if (jsonData.length > 0 && jsonData[0] && typeof jsonData[0] === 'object') {
                    console.error(`Sample row keys: ${Object.keys(jsonData[0] as object).join(', ')}`);
                }
                return jsonData;

            case '.csv':
                console.error(`Parsing CSV file: ${filename} (${buffer.length} bytes)`);
                const csvContent = buffer.toString('utf-8');
                const records = parse(csvContent, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    escape: '"',
                    quote: '"',
                    relax_quotes: true,
                    relax_column_count: true
                });
                console.error(`Parsed ${records.length} rows from CSV`);
                return records;

            default:
                throw new Error(`Unsupported file format: ${ext}. Supported formats: .xlsx, .xls, .xlsm, .csv`);
        }
    } catch (error: any) {
        console.error(`File parsing error: ${error.message}`);
        throw new Error(`Failed to parse ${ext} file: ${error.message}. Ensure the file is not corrupted and follows standard spreadsheet format.`);
    }
}

async function parseGoogleSheetFromUrl(url: string): Promise<any[]> {
    try {
        // Convert to CSV export link if needed
        let csvUrl = url;
        if (!csvUrl.includes('/export?format=csv')) {
            const match = csvUrl.match(/\/d\/([\w-]+)/);
            if (match) {
                csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
            } else {
                throw new Error('Invalid Google Sheet URL format. Please provide a valid Google Sheets sharing link.');
            }
        }

        console.error(`Fetching Google Sheet: ${csvUrl}`);
        
        // Use axios for Node.js 16+ compatibility
        const response = await axios.get(csvUrl, {
            timeout: 10000, // 10 second timeout
            responseType: 'text'
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}. Make sure the Google Sheet is publicly accessible.`);
        }

        const csv = response.data;
        const records = parse(csv, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            escape: '"',
            quote: '"',
            relax_quotes: true,
            relax_column_count: true
        });

        console.error(`Fetched ${records.length} rows from Google Sheet`);
        return records;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('Google Sheet fetch request timed out after 10 seconds');
            throw new Error('Request timed out while fetching Google Sheet. Please check your internet connection or try again later.');
        } else {
            console.error(`Google Sheet fetch error: ${error.message}`);
            throw new Error(`Failed to fetch Google Sheet: ${error.message}`);
        }
    }
}

// --- Row Processing Functions ---
function normalizeRowData(rawRows: any[]): ParsedSheetRow[] {
    if (rawRows.length === 0) {
        throw new Error('Spreadsheet is empty or has no data rows');
    }

    console.error(`Normalizing ${rawRows.length} rows...`);
    const normalizedRows: ParsedSheetRow[] = [];

    // Get all possible column names from first row for mapping
    const sampleRow = rawRows[0];
    const columnNames = Object.keys(sampleRow);
    console.error(`Available columns: ${columnNames.join(', ')}`);

    // Find title/summary column (required)
    const titleColumn = columnNames.find(col =>
        /^(title|summary|name|task|story|issue)$/i.test(col.trim()) ||
        col.toLowerCase().includes('title') ||
        col.toLowerCase().includes('summary')
    );

    if (!titleColumn) {
        throw new Error(`Missing required title/summary column. Available columns: ${columnNames.join(', ')}. Please add a column named 'Title', 'Summary', or 'Task'.`);
    }

    // Find other common columns (optional)
    const descColumn = columnNames.find(col =>
        /^(description|desc|details|notes)$/i.test(col.trim()) ||
        col.toLowerCase().includes('description')
    );

    const assigneeColumn = columnNames.find(col =>
        /^(assignee|assigned|owner|responsible)$/i.test(col.trim()) ||
        col.toLowerCase().includes('assignee')
    );

    const priorityColumn = columnNames.find(col =>
        /^(priority|prio|urgency)$/i.test(col.trim()) ||
        col.toLowerCase().includes('priority')
    );

    const typeColumn = columnNames.find(col =>
        /^(type|issue.?type|story.?type|kind)$/i.test(col.trim()) ||
        col.toLowerCase().includes('type')
    );

    const pointsColumn = columnNames.find(col =>
        /^(points|story.?points|estimate|effort)$/i.test(col.trim()) ||
        col.toLowerCase().includes('points')
    );

    const labelsColumn = columnNames.find(col =>
        /^(labels|tags|categories)$/i.test(col.trim()) ||
        col.toLowerCase().includes('labels')
    );

    console.error(`Mapped columns - Title: ${titleColumn}, Description: ${descColumn || 'none'}, Assignee: ${assigneeColumn || 'none'}`);

    rawRows.forEach((row, index) => {
        const rowNumber = index + 2; // Account for header row

        // Get title (required)
        const title = row[titleColumn]?.toString().trim();
        if (!title) {
            console.error(`Row ${rowNumber}: Skipping empty title`);
            return;
        }

        // Determine issue type from title or explicit column
        let issueType: 'Story' | 'Task' | 'Bug' | 'Epic' = 'Story';
        const typeValue = typeColumn ? row[typeColumn]?.toString().toLowerCase().trim() : '';
        const titleLower = title.toLowerCase();

        if (typeValue) {
            if (typeValue.includes('bug') || typeValue.includes('defect')) issueType = 'Bug';
            else if (typeValue.includes('task')) issueType = 'Task';
            else if (typeValue.includes('epic')) issueType = 'Epic';
            else if (typeValue.includes('story')) issueType = 'Story';
        } else {
            // Infer from title
            if (titleLower.includes('bug') || titleLower.includes('fix') || titleLower.includes('error')) {
                issueType = 'Bug';
            } else if (titleLower.includes('task') || titleLower.includes('chore')) {
                issueType = 'Task';
            } else if (titleLower.includes('epic') || titleLower.includes('theme')) {
                issueType = 'Epic';
            }
        }

        // Determine priority
        let priority: 'High' | 'Medium' | 'Low' = 'Medium';
        const priorityValue = priorityColumn ? row[priorityColumn]?.toString().toLowerCase().trim() : '';
        if (priorityValue) {
            if (priorityValue.includes('high') || priorityValue.includes('urgent') || priorityValue.includes('critical')) {
                priority = 'High';
            } else if (priorityValue.includes('low')) {
                priority = 'Low';
            }
        } else if (issueType === 'Bug') {
            priority = 'High'; // Bugs default to high priority
        }

        // Parse story points
        let storyPoints: number | undefined;
        if (pointsColumn) {
            const pointsValue = row[pointsColumn]?.toString().trim();
            if (pointsValue && !isNaN(Number(pointsValue))) {
                storyPoints = Number(pointsValue);
            }
        }

        // Parse labels
        const labels: string[] = ['spreadsheet-import'];
        if (labelsColumn) {
            const labelsValue = row[labelsColumn]?.toString().trim();
            if (labelsValue) {
                const parsedLabels = labelsValue.split(/[,;]/).map((l: string) => l.trim()).filter((l: string) => l);
                labels.push(...parsedLabels);
            }
        }

        // Add type-based label
        labels.push(issueType.toLowerCase());

        const normalizedRow: ParsedSheetRow = {
            summary: title.length > 200 ? title.substring(0, 197) + '...' : title,
            description: descColumn ? row[descColumn]?.toString().trim() : `Imported from spreadsheet row ${rowNumber}`,
            assignee: assigneeColumn ? row[assigneeColumn]?.toString().trim() : undefined,
            priority,
            issueType,
            labels,
            storyPoints
        };

        // Add any additional custom fields
        columnNames.forEach(col => {
            if (col !== titleColumn && col !== descColumn && col !== assigneeColumn &&
                col !== priorityColumn && col !== typeColumn && col !== pointsColumn && col !== labelsColumn) {
                const value = row[col];
                if (value && value.toString().trim()) {
                    normalizedRow[col] = value.toString().trim();
                }
            }
        });

        normalizedRows.push(normalizedRow);
    });

    console.error(`Successfully normalized ${normalizedRows.length} rows`);
    return normalizedRows;
}

// --- Jira Creation Functions ---
async function createJiraIssueFromRow(row: ParsedSheetRow, project: string, fieldMapper: JiraFieldMapper, validatedMapping: any): Promise<SheetCreationResult> {
    const config = dynamicConfig.getConfig();

    // Build mock row for field mapping (similar to meetingNotesToJira)
    const mockRow: Record<string, any> = {
        'Summary': row.summary,
        'Description': row.description,
        'Issue Type': row.issueType,
        'Priority': row.priority,
        'Labels': row.labels.join(', ')
    };

    if (row.assignee) mockRow['Assignee'] = row.assignee;
    if (row.storyPoints) mockRow['Story Point Estimate'] = row.storyPoints;

    // Add any additional custom fields from the row
    Object.keys(row).forEach(key => {
        if (!['summary', 'description', 'assignee', 'priority', 'issueType', 'labels', 'storyPoints'].includes(key)) {
            mockRow[key] = row[key];
        }
    });

    // Build payload using pre-validated mapping
    const { payload } = await fieldMapper.buildJiraPayload(mockRow, validatedMapping, project);

    // Make API call with timeout
    const jiraUrl = `${config.url}/rest/api/3/issue`;
    const authBuffer = Buffer.from(`${config.username}:${config.apiToken}`).toString("base64");
    const axiosConfig: AxiosRequestConfig = {
        headers: {
            Authorization: `Basic ${authBuffer}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        timeout: 15000 // 15 second timeout
    };

    const response = await axios.post(jiraUrl, payload, axiosConfig);

    return {
        key: response.data.key,
        summary: row.summary,
        assignee: row.assignee
    };
}

// --- Enhanced File Buffer Conversion ---
function convertToBuffer(fileBuffer: any, filename: string): Buffer {
    console.error(`Converting file buffer - Type: ${typeof fileBuffer}, Constructor: ${fileBuffer?.constructor?.name}, Length: ${fileBuffer?.length}`);

    // Log buffer characteristics for debugging
    if (fileBuffer && typeof fileBuffer === 'object') {
        console.error(`Object properties: ${Object.getOwnPropertyNames(fileBuffer).slice(0, 10).join(', ')}`);
        if (fileBuffer.length && fileBuffer.length < 50) {
            console.error(`Small buffer content: ${Array.from(fileBuffer).slice(0, 20).join(',')}`);
        }
    }

    // Handle different buffer formats with enhanced detection
    if (Buffer.isBuffer(fileBuffer)) {
        console.error(`✓ Direct Buffer (${fileBuffer.length} bytes)`);
        return fileBuffer;
    }

    if (fileBuffer instanceof Uint8Array) {
        console.error(`✓ Converting Uint8Array to Buffer (${fileBuffer.length} bytes)`);
        return Buffer.from(fileBuffer);
    }

    if (ArrayBuffer.isView(fileBuffer)) {
        console.error(`✓ Converting ArrayBufferView to Buffer (${fileBuffer.byteLength} bytes)`);
        return Buffer.from(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
    }

    if (fileBuffer instanceof ArrayBuffer) {
        console.error(`✓ Converting ArrayBuffer to Buffer (${fileBuffer.byteLength} bytes)`);
        return Buffer.from(fileBuffer);
    }

    if (typeof fileBuffer === 'string') {
        console.error(`✓ Converting string to Buffer (${fileBuffer.length} chars)`);
        // Try base64 first, then binary
        try {
            return Buffer.from(fileBuffer, 'base64');
        } catch {
            return Buffer.from(fileBuffer, 'binary');
        }
    }

    if (Array.isArray(fileBuffer)) {
        console.error(`✓ Converting array to Buffer (${fileBuffer.length} elements)`);
        return Buffer.from(fileBuffer);
    }

    // Handle objects that might have buffer data
    if (fileBuffer && typeof fileBuffer === 'object') {
        // Check for data property (common in some file upload formats)
        if (fileBuffer.data && Array.isArray(fileBuffer.data)) {
            console.error(`✓ Converting object.data array to Buffer (${fileBuffer.data.length} bytes)`);
            return Buffer.from(fileBuffer.data);
        }

        // Check for buffer property
        if (fileBuffer.buffer) {
            console.error(`✓ Converting object.buffer to Buffer`);
            return convertToBuffer(fileBuffer.buffer, filename);
        }

        // Try to convert object values to array
        const values = Object.values(fileBuffer);
        if (values.every(v => typeof v === 'number' && v >= 0 && v <= 255)) {
            console.error(`✓ Converting object values to Buffer (${values.length} bytes)`);
            return Buffer.from(values as number[]);
        }
    }

    throw new Error(`❌ Unsupported file buffer format: ${typeof fileBuffer} (constructor: ${fileBuffer?.constructor?.name}). Expected Buffer, Uint8Array, ArrayBuffer, base64 string, or byte array.`);
}

// --- Main Schema and Handler ---
const sheetToJiraStoriesSchema = z.object({
    fileBuffer: z.any().optional().describe("Excel/CSV file buffer - accepts any format (Buffer, Uint8Array, ArrayBuffer, etc.)"),
    filename: z.string().optional().describe("Original filename (required when using fileBuffer)"),
    googleSheetLink: z.string().optional().describe("Public Google Sheets sharing link"),
    project: z.string().describe("Jira project key (e.g., 'PROJ')"),
    defaultAssignee: z.string().optional().describe("Default assignee email for unassigned items"),
    dryRun: z.boolean().optional().default(false).describe("Preview results without creating issues"),
    batchSize: z.number().optional().default(5).describe("Number of issues to create concurrently (1-10)"),
    skipEmptyRows: z.boolean().optional().default(true).describe("Skip rows with empty titles")
});

type SheetToJiraStoriesInput = z.infer<typeof sheetToJiraStoriesSchema>;

export function registerSheetToJiraStoriesTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "sheetToJiraStories",
        "Create Jira issues from spreadsheet data. Supports Excel (.xlsx, .xls) and CSV files, plus Google Sheets links. Expected columns: Title/Summary (required), Description, Assignee, Priority, Type, Story Points, Labels. Use dryRun=true to preview first.",
        sheetToJiraStoriesSchema.shape,
        async (input: SheetToJiraStoriesInput): Promise<any> => {
            const config = dynamicConfig.getConfig();
            if (!dynamicConfig.isConfigured()) {
                const missing = dynamicConfig.getMissingFields();
                throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
            }

            const { project, defaultAssignee, dryRun, batchSize = 5, skipEmptyRows = true } = input;

            // Validate batch size
            const validBatchSize = Math.max(1, Math.min(10, batchSize));

            // Parse spreadsheet data with enhanced debugging
            let rawRows: any[];
            try {
                console.error(`\n=== STARTING FILE PROCESSING ===`);
                console.error(`Input validation - fileBuffer: ${!!input.fileBuffer}, filename: ${input.filename}, googleSheetLink: ${!!input.googleSheetLink}`);

                if (input.fileBuffer && input.filename) {
                    console.error(`Processing uploaded file: ${input.filename}`);

                    // Enhanced buffer conversion with detailed logging
                    const processedBuffer = convertToBuffer(input.fileBuffer, input.filename);
                    console.error(`✓ Buffer conversion successful: ${processedBuffer.length} bytes`);

                    // Validate buffer has content
                    if (processedBuffer.length === 0) {
                        throw new Error(`File buffer is empty (0 bytes). Please check the uploaded file.`);
                    }

                    // Log buffer header for format detection
                    const headerHex = processedBuffer.slice(0, 16).toString('hex');
                    const headerBytes = Array.from(processedBuffer.slice(0, 8));
                    console.error(`File header (hex): ${headerHex}`);
                    console.error(`File header (bytes): [${headerBytes.join(', ')}]`);

                    // Parse with enhanced error handling
                    try {
                        rawRows = await parseSpreadsheetFile(processedBuffer, input.filename);
                        console.error(`✓ File parsing successful: ${rawRows.length} rows extracted`);
                    } catch (parseError: any) {
                        console.error(`✗ File parsing failed: ${parseError.message}`);

                        // Try alternative parsing methods
                        console.error(`Attempting alternative parsing methods...`);

                        // Method 1: Try different XLSX options
                        try {
                            console.error(`Trying alternative XLSX parsing...`);
                            const workbook = XLSX.read(processedBuffer, {
                                type: 'buffer',
                                raw: true,
                                cellText: true,
                                cellHTML: false,
                                cellNF: false,
                                cellDates: false,
                                dateNF: 'yyyy-mm-dd'
                            });

                            if (workbook.SheetNames.length > 0) {
                                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                                rawRows = XLSX.utils.sheet_to_json(worksheet, {
                                    defval: '',
                                    raw: false,
                                    blankrows: false,
                                    header: 1 // Get as array first
                                });

                                // Convert array format to object format
                                if (rawRows.length > 1) {
                                    const headers = rawRows[0] as string[];
                                    const dataRows = rawRows.slice(1);
                                    rawRows = dataRows.map(row => {
                                        const obj: any = {};
                                        headers.forEach((header, index) => {
                                            obj[header] = (row as any[])[index] || '';
                                        });
                                        return obj;
                                    });
                                }

                                console.error(`✓ Alternative parsing successful: ${rawRows.length} rows`);
                            } else {
                                throw new Error('No sheets found in workbook');
                            }
                        } catch (altError: any) {
                            console.error(`✗ Alternative parsing also failed: ${altError.message}`);
                            throw parseError; // Re-throw original error
                        }
                    }

                } else if (input.googleSheetLink) {
                    console.error(`Processing Google Sheets link...`);
                    rawRows = await parseGoogleSheetFromUrl(input.googleSheetLink);
                    console.error(`✓ Google Sheets parsing successful: ${rawRows.length} rows`);
                } else {
                    throw new Error("Either provide a file (fileBuffer + filename) or googleSheetLink");
                }

                console.error(`=== FILE PROCESSING COMPLETE ===\n`);

            } catch (error: any) {
                console.error(`\n=== FILE PROCESSING FAILED ===`);
                console.error(`Error: ${error.message}`);
                console.error(`Stack: ${error.stack}`);
                console.error(`Input debug info:`, {
                    hasFileBuffer: !!input.fileBuffer,
                    fileBufferType: typeof input.fileBuffer,
                    fileBufferConstructor: input.fileBuffer?.constructor?.name,
                    fileBufferLength: input.fileBuffer ? (input.fileBuffer.length || 'unknown') : 'N/A',
                    filename: input.filename,
                    hasGoogleSheetLink: !!input.googleSheetLink
                });
                console.error(`========================\n`);

                return {
                    content: [{
                        type: "text",
                        text: `❌ File processing failed: ${error.message}\n\n🔍 Debug Information:\n- File buffer type: ${typeof input.fileBuffer}\n- Constructor: ${input.fileBuffer?.constructor?.name || 'unknown'}\n- Filename: ${input.filename || 'not provided'}\n- Buffer size: ${input.fileBuffer ? (input.fileBuffer.length || 'unknown') : 'N/A'} bytes\n\n💡 Troubleshooting:\n1. Ensure the file is a valid Excel (.xlsx, .xls) or CSV file\n2. Try using a Google Sheets link instead of file upload\n3. Check that the file isn't corrupted or password protected\n\nFor immediate use, try the Google Sheets approach which works reliably.`
                    }]
                };
            }

            if (rawRows.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "📄 Empty spreadsheet - no data rows found"
                    }]
                };
            }

            // Normalize and validate rows
            let normalizedRows: ParsedSheetRow[];
            try {
                normalizedRows = normalizeRowData(rawRows);
            } catch (error: any) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Data validation failed: ${error.message}`
                    }]
                };
            }

            // Apply default assignee
            normalizedRows.forEach(row => {
                if (!row.assignee && defaultAssignee) {
                    row.assignee = defaultAssignee;
                }
            });

            // Dry run - show preview
            if (dryRun) {
                const preview = normalizedRows.slice(0, 10).map((row, index) =>
                    `${index + 1}. [${row.issueType}] ${row.summary}\n   Assignee: ${row.assignee || 'Unassigned'}\n   Priority: ${row.priority}\n   Labels: ${row.labels.join(', ')}`
                ).join('\n\n');

                const truncated = normalizedRows.length > 10 ? `\n\n... and ${normalizedRows.length - 10} more rows` : '';

                return {
                    content: [{
                        type: "text",
                        text: `📋 Found ${normalizedRows.length} valid rows to process:\n\n${preview}${truncated}\n\nSet dryRun=false to create these issues.`
                    }],
                    metadata: {
                        totalRows: normalizedRows.length,
                        preview: normalizedRows.slice(0, 10)
                    }
                };
            }

            // Initialize field mapper with caching
            console.error(`Initializing Jira field mapper for project ${project}...`);
            const fieldMapper = new JiraFieldMapper(config.url!, config.username!, config.apiToken!);

            // Pre-compute field mapping once (performance optimization)
            const sampleRow: Record<string, any> = {
                'Summary': 'sample',
                'Description': 'sample',
                'Issue Type': 'Story',
                'Priority': 'Medium',
                'Labels': 'sample',
                'Assignee': 'sample@example.com',
                'Story Point Estimate': 1
            };

            // Add any custom fields from the data
            const allCustomFields = new Set<string>();
            normalizedRows.forEach(row => {
                Object.keys(row).forEach(key => {
                    if (!['summary', 'description', 'assignee', 'priority', 'issueType', 'labels', 'storyPoints'].includes(key)) {
                        allCustomFields.add(key);
                        sampleRow[key] = 'sample';
                    }
                });
            });

            console.error(`Mapping fields: ${Object.keys(sampleRow).join(', ')}`);
            const columnNames = Object.keys(sampleRow);
            const initialMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
            const validatedMapping = await fieldMapper.validateFieldPermissions(initialMapping, project, 'Story');

            // Track unmapped columns for reporting
            const unmappedColumns = Object.keys(initialMapping).filter(key => initialMapping[key] === null);

            console.error(`Field mapping completed. Unmapped columns: ${unmappedColumns.join(', ') || 'none'}`);

            // Process rows in batches
            const result: BatchSheetResult = {
                successful: [],
                failed: [],
                summary: {
                    total: normalizedRows.length,
                    created: 0,
                    failed: 0,
                    byType: {},
                    byAssignee: {}
                },
                warnings: [],
                unmappedColumns
            };

            if (unmappedColumns.length > 0) {
                result.warnings.push(`${unmappedColumns.length} columns could not be mapped to Jira fields: ${unmappedColumns.join(', ')}`);
            }

            console.error(`Processing ${normalizedRows.length} rows in batches of ${validBatchSize}...`);

            for (let i = 0; i < normalizedRows.length; i += validBatchSize) {
                const batch = normalizedRows.slice(i, i + validBatchSize);
                const batchNumber = Math.floor(i / validBatchSize) + 1;
                const totalBatches = Math.ceil(normalizedRows.length / validBatchSize);

                console.error(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);

                const batchPromises = batch.map(async (row, batchIndex) => {
                    const globalRowNumber = i + batchIndex + 1;
                    try {
                        const created = await createJiraIssueFromRow(row, project, fieldMapper, validatedMapping);
                        console.error(`✓ Row ${globalRowNumber}: Created ${created.key}`);
                        return { success: true, created, row, rowNumber: globalRowNumber };
                    } catch (error: any) {
                        console.error(`✗ Row ${globalRowNumber}: ${error.message}`);
                        return {
                            success: false,
                            row,
                            rowNumber: globalRowNumber,
                            error: error.message || 'Unknown error'
                        };
                    }
                });

                const batchResults = await Promise.all(batchPromises);

                // Process batch results
                for (const batchResult of batchResults) {
                    if (batchResult.success && batchResult.created) {
                        result.successful.push(batchResult.created);
                        result.summary.created++;

                        // Track by type
                        result.summary.byType[batchResult.row.issueType] =
                            (result.summary.byType[batchResult.row.issueType] || 0) + 1;

                        // Track by assignee
                        const assigneeKey = batchResult.row.assignee || 'unassigned';
                        result.summary.byAssignee[assigneeKey] =
                            (result.summary.byAssignee[assigneeKey] || 0) + 1;
                    } else {
                        result.failed.push({
                            row: batchResult.row,
                            rowNumber: batchResult.rowNumber,
                            error: batchResult.error
                        });
                        result.summary.failed++;
                    }
                }
            }

            // Generate comprehensive summary
            const successKeys = result.successful.map(s => s.key).join(', ');
            const typesSummary = Object.entries(result.summary.byType)
                .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                .join(', ');

            let summaryText = `🎉 Successfully created ${result.summary.created} of ${result.summary.total} issues`;
            if (result.summary.created > 0) {
                summaryText += `\n\n📋 Created Issues: ${successKeys}`;
                summaryText += `\n📊 Breakdown: ${typesSummary}`;
            }

            if (result.summary.failed > 0) {
                summaryText += `\n\n⚠️ ${result.summary.failed} items failed to create:`;
                result.failed.slice(0, 5).forEach(failure => {
                    summaryText += `\n  • Row ${failure.rowNumber}: ${failure.error}`;
                });
                if (result.failed.length > 5) {
                    summaryText += `\n  • ... and ${result.failed.length - 5} more (see metadata for full details)`;
                }
            }

            if (result.warnings.length > 0) {
                summaryText += `\n\n💡 Warnings:\n  • ${result.warnings.join('\n  • ')}`;
            }

            return {
                content: [{
                    type: "text",
                    text: summaryText
                }],
                metadata: result
            };
        }
    );
}