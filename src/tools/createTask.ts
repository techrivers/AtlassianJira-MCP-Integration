import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import { JiraFieldMapper } from '../utils/jiraFieldMapper';
import { dynamicConfig } from "../utils/configManager";

// --- Interfaces for Jira API responses ---
interface JiraIssueResponse {
    id: string;
    key: string;
    self: string;
    [key: string]: any;
}

// --- Helper function for making Jira API requests ---
async function makeJiraRequest<T>(url: string, data: any, config: AxiosRequestConfig): Promise<T> {
    try {
        const response = await axios.post(url, data, config);
        return response.data as T;
    } catch (error: any) {
        const errorMessage =
            error.response?.data?.errorMessages?.join(", ") ||
            error.message ||
            "An unknown error occurred.";
        console.error("Error making Jira request:", errorMessage);
        console.error("Full error response:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(`Failed to create task: ${errorMessage}`);
    }
}

const createTaskSchema = z.object({
    project: z.string().describe("The project key (e.g., 'CA')."),
    summary: z.string().describe("The task summary/title."),
    description: z.string().optional().describe("The task description."),
    issueType: z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Story'."),
    priority: z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
    assignee: z.string().optional().describe("The assignee email or username."),
    // Custom fields
    storyPointEstimate: z.number().optional().describe("Story point estimate for the issue."),
    acceptanceCriteria: z.string().optional().describe("Acceptance criteria for the story."),
    frontendHours: z.number().optional().describe("Estimated frontend development hours."),
    backendHours: z.number().optional().describe("Estimated backend development hours."),
    qaHours: z.number().optional().describe("Estimated QA hours."),
    qaCycle: z.number().optional().describe("QA cycle number."),
    labels: z.string().optional().describe("Comma-separated labels for the issue."),
    sprint: z.string().optional().describe("Sprint name or ID."),
    fixVersions: z.string().optional().describe("Comma-separated fix version names."),
    flagged: z.string().optional().describe("Flagged status or reason."),
    customFields: z.record(z.any()).optional().describe("Additional custom fields as key-value pairs.")
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;

export function registerCreateTaskTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "createTask",
        "Creates a new Jira issue/task.",
        createTaskSchema.shape,
        async (input: CreateTaskInput) => {
            const config = dynamicConfig.getConfig();
            if (!dynamicConfig.isConfigured()) {
                const missing = dynamicConfig.getMissingFields();
                throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
            }

            const {
                project,
                summary,
                description,
                issueType = "Story",
                priority = "Medium",
                assignee,
                customFields,
                ...otherFields
            } = input;

            // Initialize field mapper for dynamic field discovery
            const fieldMapper = new JiraFieldMapper(config.url!, config.username!, config.apiToken!);

            // Create a mock row data combining all input fields
            const mockRow: Record<string, any> = {
                'Summary': summary,
                'Issue Type': issueType,
                ...otherFields,
                ...customFields
            };

            // Only add optional fields if they have values
            if (description) mockRow['Description'] = description;
            if (priority) mockRow['Priority'] = priority;
            if (assignee) mockRow['Assignee'] = assignee;

            // Get column names and map to Jira fields
            const columnNames = Object.keys(mockRow).filter(key => mockRow[key] !== undefined);
            const initialMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
            const validatedMapping = await fieldMapper.validateFieldPermissions(initialMapping, project, issueType);

            if (process.env.DEBUG) console.error('createTask field mapping:', validatedMapping);

            // Build payload using dynamic field mapping
            const { payload, skippedFields } = await fieldMapper.buildJiraPayload(mockRow, validatedMapping, project);

            if (skippedFields.length > 0) {
                console.error(`createTask skipped fields: ${skippedFields.join(', ')}`);
            }

            const jiraUrl = `${config.url}/rest/api/3/issue`;
            const authBuffer = Buffer.from(`${config.username}:${config.apiToken}`).toString("base64");
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                timeout: 15000,
            };

            if (process.env.DEBUG) console.error('createTask payload:', JSON.stringify(payload, null, 2));
            const jiraResponse = await makeJiraRequest<JiraIssueResponse>(jiraUrl, payload, axiosConfig);

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
        }
    );
}
