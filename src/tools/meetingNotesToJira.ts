import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import path from "path";
import { JiraFieldMapper } from '../utils/jiraFieldMapper';
import { dynamicConfig } from "../utils/configManager";

// --- Interfaces ---
interface ParsedAction {
    summary: string;
    description: string;
    assignee?: string;
    priority: 'High' | 'Medium' | 'Low';
    issueType: 'Story' | 'Task' | 'Bug' | 'Improvement';
    labels: string[];
    storyPoints?: number;
}

interface CreationResult {
    key: string;
    summary: string;
    assignee?: string;
}

interface BatchResult {
    successful: CreationResult[];
    failed: Array<{ action: ParsedAction; error: string }>;
    summary: {
        total: number;
        created: number;
        failed: number;
        byType: Record<string, number>;
        byAssignee: Record<string, number>;
    };
    warnings: string[];
}

// --- Text Parsing Patterns ---
const patterns = {
    // Action item patterns
    directAction: /(?:action|todo|task):\s*([^\n]+)/gi,
    assignment: /(\w+(?:\s+\w+)*)\s+(?:to|will)\s+([^\n.]+)/gi,
    userStory: /(?:as\s+a\s+(\w+),?\s+)?(?:i\s+want|user\s+should|we\s+need)\s+([^\n.]+)/gi,
    bugReport: /(?:bug|issue|problem|error):\s*([^\n]+)/gi,

    // Priority indicators
    highPriority: /(?:urgent|critical|asap|blocking|high\s+priority)/i,
    mediumPriority: /(?:important|should|needed|medium\s+priority)/i,
    lowPriority: /(?:nice\s+to\s+have|when\s+time\s+permits|future|low\s+priority)/i,

    // Meeting structure
    timestamp: /^\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?/gm,
    speaker: /^(\w+(?:\s+\w+)*)\s*:\s*(.+)/gm,
    bullets: /^[\*\-\+]\s+(.+)/gm,
    numbered: /^\d+[\.\)]\s+(.+)/gm,

    // Email extraction
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    mention: /@(\w+(?:\.\w+)*)/g
};

// --- Meeting Type Configurations ---
const meetingConfigs = {
    standup: {
        defaultIssueType: 'Task' as const,
        priorityBoost: false,
        commonLabels: ['standup', 'daily']
    },
    planning: {
        defaultIssueType: 'Story' as const,
        priorityBoost: false,
        commonLabels: ['planning', 'sprint']
    },
    retrospective: {
        defaultIssueType: 'Improvement' as const,
        priorityBoost: true,
        commonLabels: ['retrospective', 'improvement']
    },
    general: {
        defaultIssueType: 'Story' as const,
        priorityBoost: false,
        commonLabels: ['meeting']
    }
};

// --- Text Processing Functions ---
function preprocessText(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '    ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/gm, '')
        .trim();
}

function extractAssignee(text: string): string | undefined {
    // Try email first
    const emailMatch = text.match(patterns.email);
    if (emailMatch) return emailMatch[0];

    // Try @mention
    const mentionMatch = text.match(patterns.mention);
    if (mentionMatch) return mentionMatch[1];

    // Try assignment pattern
    const assignMatch = text.match(patterns.assignment);
    if (assignMatch) return assignMatch[1];

    return undefined;
}

function determinePriority(text: string): 'High' | 'Medium' | 'Low' {
    if (patterns.highPriority.test(text)) return 'High';
    if (patterns.lowPriority.test(text)) return 'Low';
    return 'Medium';
}

function determineIssueType(text: string, meetingType: keyof typeof meetingConfigs): ParsedAction['issueType'] {
    if (patterns.bugReport.test(text)) return 'Bug';
    if (patterns.userStory.test(text)) return 'Story';
    return meetingConfigs[meetingType].defaultIssueType;
}

function estimateStoryPoints(text: string): number | undefined {
    const complexity = text.toLowerCase();
    if (/(?:simple|fix|update|change|quick)/i.test(complexity)) return 1;
    if (/(?:implement|create|add|build)/i.test(complexity)) return 3;
    if (/(?:redesign|integrate|migrate|complex)/i.test(complexity)) return 8;
    return undefined;
}

function parseActions(text: string, meetingType: keyof typeof meetingConfigs, defaultProject: string, defaultAssignee?: string): ParsedAction[] {
    const actions: ParsedAction[] = [];
    const lines = text.split('\n');
    
    // Context tracking - only parse action items from specific sections
    let inActionSection = false;
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if we're entering an action-oriented section
        const sectionHeaders = /^(next steps|action items|todo|tasks|follow.?up|deliverables|assignments)$/i;
        if (sectionHeaders.test(trimmed)) {
            inActionSection = true;
            currentSection = trimmed.toLowerCase();
            continue;
        }
        
        // Check if we're leaving an action section (new major header)
        if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('*') && !trimmed.startsWith('+') && 
            !trimmed.match(/^\d+\./) && trimmed.length > 0 && !trimmed.includes(':') && 
            /^[A-Z]/.test(trimmed) && trimmed.length < 50) {
            inActionSection = false;
            currentSection = '';
        }
        
        // Only parse actions if we're in an action section OR it's explicitly marked
        const shouldParse = inActionSection || 
                           /^(?:action|todo|task|deliverable):/i.test(trimmed) ||
                           /^(?:bug|issue|problem|error):/i.test(trimmed);
        
        if (!shouldParse) continue;
        
        // Look for explicit action patterns
        if (/^(?:action|todo|task|deliverable):\s*/i.test(trimmed)) {
            const actionText = trimmed.replace(/^(?:action|todo|task|deliverable):\s*/i, '').trim();
            if (actionText.length > 10) {
                actions.push(createAction(actionText, meetingType, defaultAssignee));
            }
            continue;
        }
        
        // Look for bug reports
        if (/^(?:bug|issue|problem|error):\s*/i.test(trimmed)) {
            const bugText = trimmed.replace(/^(?:bug|issue|problem|error):\s*/i, '').trim();
            if (bugText.length > 10) {
                const action = createAction(bugText, meetingType, defaultAssignee);
                action.issueType = 'Bug';
                action.priority = 'High';
                actions.push(action);
            }
            continue;
        }
        
        // Look for bullet points (only in action sections)
        if (inActionSection && /^[\*\-\+]\s+/.test(trimmed)) {
            const actionText = trimmed.replace(/^[\*\-\+]\s+/, '').trim();
            
            // More restrictive action detection - must start with action verbs
            const startsWithAction = /^(review|finalize|schedule|update|explore|create|implement|fix|test|build|add|complete|develop|research|document|deploy|configure|setup|validate|verify|coordinate|plan|prepare|integrate|investigate|analyze|design|install|monitor|track|optimize|refactor|assign|approve)\b/i;
            
            // Or has assignment pattern
            const hasAssignment = /^\w+(?:\s+\w+)*\s+(?:to|will|should|needs to)\s+/i;
            
            if (actionText.length > 15 && (startsWithAction.test(actionText) || hasAssignment.test(actionText))) {
                // Extract assignee from patterns like "John to do X" or "Team to review Y"
                let assignee = defaultAssignee;
                const assigneeMatch = actionText.match(/^(\w+(?:\s+\w+)*)\s+(?:to|will|should|needs to)\s+/i);
                if (assigneeMatch) {
                    assignee = assigneeMatch[1];
                }
                
                actions.push(createAction(actionText, meetingType, assignee));
            }
            continue;
        }
        
        // Look for numbered lists (only in action sections)
        if (inActionSection && /^\d+[\.\)]\s+/.test(trimmed)) {
            const actionText = trimmed.replace(/^\d+[\.\)]\s+/, '').trim();
            const startsWithAction = /^(review|finalize|schedule|update|explore|create|implement|fix|test|build|add|complete|develop|research|document|deploy|configure|setup|validate|verify|coordinate|plan|prepare|integrate|investigate|analyze|design|install|monitor|track|optimize|refactor|assign|approve)\b/i;
            const hasAssignment = /^\w+(?:\s+\w+)*\s+(?:to|will|should|needs to)\s+/i;
            
            if (actionText.length > 15 && (startsWithAction.test(actionText) || hasAssignment.test(actionText))) {
                let assignee = defaultAssignee;
                const assigneeMatch = actionText.match(/^(\w+(?:\s+\w+)*)\s+(?:to|will|should|needs to)\s+/i);
                if (assigneeMatch) {
                    assignee = assigneeMatch[1];
                }
                
                actions.push(createAction(actionText, meetingType, assignee));
            }
            continue;
        }
        
        // Look for plain text lines in action sections (no bullets/numbers)
        if (inActionSection && trimmed.length > 15 && 
            !trimmed.includes(':') && // Exclude sub-headers
            !/^(summary|key takeaways|topics discussed|background|context|overview)/i.test(trimmed)) {
            
            const startsWithAction = /^(review|finalize|schedule|update|explore|create|implement|fix|test|build|add|complete|develop|research|document|deploy|configure|setup|validate|verify|coordinate|plan|prepare|integrate|investigate|analyze|design|install|monitor|track|optimize|refactor|assign|approve)\b/i;
            const hasAssignment = /^\w+(?:\s+\w+)*\s+(?:to|will|should|needs to)\s+/i;
            
            if (startsWithAction.test(trimmed) || hasAssignment.test(trimmed)) {
                let assignee = defaultAssignee;
                const assigneeMatch = trimmed.match(/^(\w+(?:\s+\w+)*)\s+(?:to|will|should|needs to)\s+/i);
                if (assigneeMatch) {
                    assignee = assigneeMatch[1];
                }
                
                actions.push(createAction(trimmed, meetingType, assignee));
            }
            continue;
        }
        
        // Look for user stories (anywhere)
        if (/^as\s+a\s+\w+.*i\s+want|user\s+should\s+be\s+able|we\s+need\s+to\s+enable/i.test(trimmed)) {
            const action = createAction(trimmed, meetingType, defaultAssignee);
            action.issueType = 'Story';
            actions.push(action);
        }
    }

    return actions;
}

function createAction(text: string, meetingType: keyof typeof meetingConfigs, defaultAssignee?: string): ParsedAction {
    const config = meetingConfigs[meetingType];

    return {
        summary: text.length > 100 ? text.substring(0, 97) + '...' : text,
        description: `Extracted from ${meetingType} meeting notes:\n\n${text}`,
        assignee: extractAssignee(text) || defaultAssignee,
        priority: config.priorityBoost ? 'High' : determinePriority(text),
        issueType: determineIssueType(text, meetingType),
        labels: [...config.commonLabels, 'meeting-notes'],
        storyPoints: estimateStoryPoints(text)
    };
}

// --- File Processing Functions ---
async function parseTextFile(buffer: Buffer, filename: string): Promise<string> {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
        case '.txt':
        case '.md':
            return buffer.toString('utf-8');
        case '.rtf':
            // Basic RTF parsing - remove RTF formatting
            const rtfContent = buffer.toString('utf-8');
            return rtfContent.replace(/\\[a-z]+\d*\s*/g, '').replace(/[{}]/g, '');
        default:
            throw new Error(`Unsupported file format: ${ext}. Supported formats: .txt, .md, .rtf`);
    }
}

// --- Jira Creation Functions ---
async function createJiraIssue(action: ParsedAction, project: string, fieldMapper: JiraFieldMapper, validatedMapping: any): Promise<CreationResult> {
    const config = dynamicConfig.getConfig();

    // Create mock row for field mapping
    const mockRow: Record<string, any> = {
        'Summary': action.summary,
        'Description': action.description,
        'Issue Type': action.issueType,
        'Priority': action.priority,
        'Labels': action.labels.join(', ')
    };

    if (action.assignee) mockRow['Assignee'] = action.assignee;
    if (action.storyPoints) mockRow['Story Point Estimate'] = action.storyPoints;

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
        timeout: 10000 // 10 second timeout
    };

    const response = await axios.post(jiraUrl, payload, axiosConfig);

    return {
        key: response.data.key,
        summary: action.summary,
        assignee: action.assignee
    };
}

// --- Main Schema and Handler ---
const meetingNotesToJiraSchema = z.object({
    meetingNotes: z.string().optional().describe("Raw meeting notes text"),
    fileBuffer: z.instanceof(Buffer).optional().describe("Text file buffer (.txt, .md, .rtf)"),
    filename: z.string().optional().describe("Original filename (required when using fileBuffer)"),
    meetingType: z.enum(["standup", "planning", "retrospective", "general"]).describe("Type of meeting for context-aware parsing"),
    defaultProject: z.string().describe("Project key for created issues (e.g., 'PROJ')"),
    defaultAssignee: z.string().optional().describe("Default assignee email for unassigned items"),
    autoCreateEpic: z.boolean().optional().default(false).describe("Create epic if multiple related stories found"),
    dryRun: z.boolean().optional().default(false).describe("Parse and show results without creating issues")
});

type MeetingNotesToJiraInput = z.infer<typeof meetingNotesToJiraSchema>;

export function registerMeetingNotesToJiraTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "meetingNotesToJira",
        "Parse meeting notes and create Jira issues from action items. Supports both direct text input and file upload (.txt, .md, .rtf).",
        meetingNotesToJiraSchema.shape,
        async (input: MeetingNotesToJiraInput): Promise<any> => {
            const config = dynamicConfig.getConfig();
            if (!dynamicConfig.isConfigured()) {
                const missing = dynamicConfig.getMissingFields();
                throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
            }

            const { meetingType, defaultProject, defaultAssignee, autoCreateEpic, dryRun } = input;

            // Get meeting notes text
            let meetingText: string;
            if (input.fileBuffer && input.filename) {
                meetingText = await parseTextFile(input.fileBuffer, input.filename);
            } else if (input.meetingNotes) {
                meetingText = input.meetingNotes;
            } else {
                throw new Error("Either meetingNotes text or fileBuffer with filename must be provided");
            }

            // Preprocess and parse
            console.error(`Processing meeting notes (${meetingText.length} chars)...`);
            const cleanText = preprocessText(meetingText);
            const actions = parseActions(cleanText, meetingType, defaultProject, defaultAssignee);
            console.error(`Parsed ${actions.length} potential actions from meeting notes`);

            if (actions.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "No actionable items found in the meeting notes. Try using more explicit action keywords like 'TODO:', 'Action:', or assignment patterns like 'John will...'."
                    }]
                };
            }

            // Dry run - just show what would be created (skip expensive API calls)
            if (dryRun) {
                const preview = actions.map((action, index) =>
                    `${index + 1}. [${action.issueType}] ${action.summary}\n   Assignee: ${action.assignee || 'Unassigned'}\n   Priority: ${action.priority}\n   Labels: ${action.labels.join(', ')}`
                ).join('\n\n');

                return {
                    content: [{
                        type: "text",
                        text: `Found ${actions.length} actionable items:\n\n${preview}\n\nRe-run without dryRun=true to create these issues.`
                    }],
                    metadata: {
                        parsedActions: actions
                    }
                };
            }

            // Create issues with optimized field mapping
            console.error(`Initializing Jira field mapper...`);
            const fieldMapper = new JiraFieldMapper(config.url!, config.username!, config.apiToken!);
            
            // Pre-compute field mapping once for all actions (major performance improvement)
            console.error(`Pre-computing field mappings for project ${defaultProject}...`);
            const sampleRow: Record<string, any> = {
                'Summary': 'sample',
                'Description': 'sample',
                'Issue Type': 'Story',
                'Priority': 'Medium',
                'Labels': 'sample',
                'Assignee': 'sample@example.com',
                'Story Point Estimate': 1
            };
            
            const columnNames = Object.keys(sampleRow);
            const initialMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
            const validatedMapping = await fieldMapper.validateFieldPermissions(initialMapping, defaultProject, 'Story');
            console.error(`Field mapping completed. Ready to create ${actions.length} issues...`);
            
            const result: BatchResult = {
                successful: [],
                failed: [],
                summary: {
                    total: actions.length,
                    created: 0,
                    failed: 0,
                    byType: {},
                    byAssignee: {}
                },
                warnings: []
            };

            // Process actions with controlled concurrency (max 3 at a time to avoid rate limits)
            const batchSize = 3;
            for (let i = 0; i < actions.length; i += batchSize) {
                const batch = actions.slice(i, i + batchSize);
                console.error(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(actions.length/batchSize)} (${batch.length} items)...`);
                
                const batchPromises = batch.map(async (action) => {
                    try {
                        const created = await createJiraIssue(action, defaultProject, fieldMapper, validatedMapping);
                        console.error(`✓ Created ${created.key}: ${action.summary.substring(0, 50)}...`);
                        return { success: true, created, action };
                    } catch (error: any) {
                        console.error(`✗ Failed to create: ${action.summary.substring(0, 50)}... - ${error.message}`);
                        return { 
                            success: false, 
                            action, 
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
                        result.summary.byType[batchResult.action.issueType] = 
                            (result.summary.byType[batchResult.action.issueType] || 0) + 1;
                        
                        // Track by assignee
                        const assigneeKey = batchResult.action.assignee || 'unassigned';
                        result.summary.byAssignee[assigneeKey] = 
                            (result.summary.byAssignee[assigneeKey] || 0) + 1;
                    } else {
                        result.failed.push({
                            action: batchResult.action,
                            error: batchResult.error
                        });
                        result.summary.failed++;
                    }
                }
            }

            // Generate summary text
            const successKeys = result.successful.map(s => s.key).join(', ');
            const typesSummary = Object.entries(result.summary.byType)
                .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
                .join(', ');

            let summaryText = `Successfully created ${result.summary.created} issues: ${successKeys}`;
            if (result.summary.created > 0) {
                summaryText += `\n\nBreakdown: ${typesSummary}`;
            }

            if (result.summary.failed > 0) {
                summaryText += `\n\n⚠️ ${result.summary.failed} items failed to create. Check the metadata for details.`;
            }

            return {
                content: [{
                    type: "text",
                    text: summaryText
                }],
                metadata: {
                    result,
                    parsedActions: actions
                }
            };
        }
    );
}