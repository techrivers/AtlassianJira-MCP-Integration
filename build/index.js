"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Configure dotenv
const envPath = path_1.default.resolve(__dirname, "../.env");
dotenv_1.default.config({ path: envPath });
console.error(`Loading .env from: ${envPath}`);
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
        throw new Error(`Failed to log work: ${errorMessage}`);
    }
}
// --- Helper function for making GET requests to Jira API ---
async function makeJiraGetRequest(url, config) {
    try {
        const response = await axios_1.default.get(url, config);
        return response.data;
    }
    catch (error) {
        const errorMessage = error.response?.data?.errorMessages?.join(", ") ||
            error.message ||
            "An unknown error occurred.";
        console.error("Error making Jira GET request:", errorMessage);
        throw new Error(`Failed to fetch data: ${errorMessage}`);
    }
}
const server = new mcp_js_1.McpServer({
    name: "jira-activitytimeline-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
server.tool("logTime", "Logs a work entry to a specific Jira issue.", {
    issueKey: zod_1.z.string().describe("The Jira issue key to log work against (e.g., 'PROJ-123')."),
    timeSpent: zod_1.z.string().describe("The amount of time spent, in Jira's format (e.g., '2h' or '30m')."),
    comment: zod_1.z.string().optional().describe("A description of the work, including billable status (e.g., 'Fixed the login flow. Billable: Yes')."),
    started: zod_1.z.string().optional().describe("Optional start date/time in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sss+ZZZZ`). Defaults to now."),
}, async ({ issueKey, timeSpent, comment, started }) => {
    const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
    console.error(`Environment check - JIRA_BASE_URL: ${JIRA_BASE_URL ? 'SET' : 'NOT SET'}`);
    console.error(`Environment check - JIRA_USER_EMAIL: ${JIRA_USER_EMAIL ? 'SET' : 'NOT SET'}`);
    console.error(`Environment check - JIRA_API_TOKEN: ${JIRA_API_TOKEN ? 'SET' : 'NOT SET'}`);
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        throw new Error("Jira environment variables are not configured. Check your .env file.");
    }
    const jiraUrl = `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/worklog`;
    const requestBody = {
        timeSpent,
        ...(comment && {
            comment: {
                type: "doc",
                version: 1,
                content: [
                    { type: "paragraph", content: [{ type: "text", text: comment }] },
                ],
            },
        }),
        ...(started && { started }),
    };
    const authBuffer = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
    const config = {
        headers: {
            Authorization: `Basic ${authBuffer}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    };
    const jiraResponse = await makeJiraRequest(jiraUrl, requestBody, config);
    return {
        content: [
            {
                type: "text",
                text: `Successfully logged ${timeSpent} to issue ${issueKey}. Worklog ID: ${jiraResponse.id}`,
            },
        ],
        metadata: {
            jiraResponse,
        },
    };
});
server.tool("createTask", "Creates a new Jira issue/task.", {
    project: zod_1.z.string().describe("The project key (e.g., 'CA')."),
    summary: zod_1.z.string().describe("The task summary/title."),
    description: zod_1.z.string().optional().describe("The task description."),
    issueType: zod_1.z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Task'."),
    priority: zod_1.z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
    assignee: zod_1.z.string().optional().describe("The assignee email or username.")
}, async ({ project, summary, description, issueType = "Task", priority = "Medium", assignee }) => {
    const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        throw new Error("Jira environment variables are not configured. Check your .env file.");
    }
    const jiraUrl = `${JIRA_BASE_URL}/rest/api/3/issue`;
    const requestBody = {
        fields: {
            project: {
                key: project
            },
            summary: summary,
            ...(description && {
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        { type: "paragraph", content: [{ type: "text", text: description }] }
                    ]
                }
            }),
            issuetype: {
                name: issueType
            },
            priority: {
                name: priority
            },
            ...(assignee && {
                assignee: {
                    emailAddress: assignee
                }
            })
        }
    };
    const authBuffer = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
    const config = {
        headers: {
            Authorization: `Basic ${authBuffer}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    };
    const jiraResponse = await makeJiraRequest(jiraUrl, requestBody, config);
    return {
        content: [
            {
                type: "text",
                text: `Successfully created issue ${jiraResponse.key}: ${summary}`,
            },
        ],
        metadata: {
            jiraResponse,
        },
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
