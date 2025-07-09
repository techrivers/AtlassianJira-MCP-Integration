"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCreateTaskTool = registerCreateTaskTool;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const jiraFieldMapper_1 = require("../utils/jiraFieldMapper");
// --- Helper function for making Jira API requests ---
async function makeJiraRequest(url, data, config) {
    try {
        const response = await axios_1.default.post(url, data, config);
        return response.data;
    }
    catch (error) {
        const errorMessage = error.response?.data?.errorMessages?.join(", ") ||
            error.message ||
            "An unknown error occurred.";
        console.error("Error making Jira request:", errorMessage);
        throw new Error(`Failed to create task: ${errorMessage}`);
    }
}
const createTaskSchema = zod_1.z.object({
    project: zod_1.z.string().describe("The project key (e.g., 'CA')."),
    summary: zod_1.z.string().describe("The task summary/title."),
    description: zod_1.z.string().optional().describe("The task description."),
    issueType: zod_1.z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Story'."),
    priority: zod_1.z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
    assignee: zod_1.z.string().optional().describe("The assignee email or username."),
    // Custom fields
    storyPointEstimate: zod_1.z.number().optional().describe("Story point estimate for the issue."),
    acceptanceCriteria: zod_1.z.string().optional().describe("Acceptance criteria for the story."),
    frontendHours: zod_1.z.number().optional().describe("Estimated frontend development hours."),
    backendHours: zod_1.z.number().optional().describe("Estimated backend development hours."),
    qaHours: zod_1.z.number().optional().describe("Estimated QA hours."),
    qaCycle: zod_1.z.number().optional().describe("QA cycle number."),
    labels: zod_1.z.string().optional().describe("Comma-separated labels for the issue."),
    sprint: zod_1.z.string().optional().describe("Sprint name or ID."),
    fixVersions: zod_1.z.string().optional().describe("Comma-separated fix version names."),
    flagged: zod_1.z.string().optional().describe("Flagged status or reason."),
    customFields: zod_1.z.record(zod_1.z.any()).optional().describe("Additional custom fields as key-value pairs.")
});
function registerCreateTaskTool(server) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool("createTask", "Creates a new Jira issue/task.", createTaskSchema.shape, async (input) => {
        const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
        if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
            throw new Error("Jira environment variables are not configured. Check your .env file.");
        }
        const { project, summary, description, issueType = "Story", priority = "Medium", assignee, customFields, ...otherFields } = input;
        // Initialize field mapper for dynamic field discovery
        const fieldMapper = new jiraFieldMapper_1.JiraFieldMapper(JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN);
        // Create a mock row data combining all input fields
        const mockRow = {
            'Summary': summary,
            'Description': description,
            'Priority': priority,
            'Assignee': assignee,
            'Issue Type': issueType,
            ...otherFields,
            ...customFields
        };
        // Get column names and map to Jira fields
        const columnNames = Object.keys(mockRow).filter(key => mockRow[key] !== undefined);
        const initialMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
        const validatedMapping = await fieldMapper.validateFieldPermissions(initialMapping, project);
        console.log('createTask field mapping:', validatedMapping);
        // Build payload using dynamic field mapping
        const { payload, skippedFields } = await fieldMapper.buildJiraPayload(mockRow, validatedMapping, project);
        if (skippedFields.length > 0) {
            console.log(`createTask skipped fields: ${skippedFields.join(', ')}`);
        }
        const jiraUrl = `${JIRA_BASE_URL}/rest/api/3/issue`;
        const authBuffer = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
        const config = {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        };
        const jiraResponse = await makeJiraRequest(jiraUrl, payload, config);
        const appliedFields = Object.keys(validatedMapping).filter(key => validatedMapping[key] !== null);
        const skippedFieldsCount = skippedFields.length;
        return {
            content: [
                {
                    type: "text",
                    text: `Successfully created issue ${jiraResponse.key}: ${summary}. Applied ${appliedFields.length} fields, skipped ${skippedFieldsCount} unavailable fields.`,
                },
            ],
            metadata: {
                jiraResponse,
                appliedFields,
                skippedFields,
                fieldMapping: validatedMapping
            },
        };
    });
}
