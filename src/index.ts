import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import path from "path";

// Configure dotenv
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
console.error(`Loading .env from: ${envPath}`);

// --- Interfaces for Jira API responses ---
interface JiraWorklogResponse {
    id: string;
    [key: string]: any;
}

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
        throw new Error(`Failed to log work: ${errorMessage}`);
    }
}

// --- Helper function for making GET requests to Jira API ---
async function makeJiraGetRequest<T>(url: string, config: AxiosRequestConfig): Promise<T> {
    try {
        const response = await axios.get(url, config);
        return response.data as T;
    } catch (error: any) {
        const errorMessage =
            error.response?.data?.errorMessages?.join(", ") ||
            error.message ||
            "An unknown error occurred.";
        console.error("Error making Jira GET request:", errorMessage);
        throw new Error(`Failed to fetch data: ${errorMessage}`);
    }
}

const server = new McpServer({
    name: "jira-activitytimeline-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

server.tool(
    "logTime",
    "Logs a work entry to a specific Jira issue.",
    {
        issueKey: z.string().describe("The Jira issue key to log work against (e.g., 'PROJ-123')."),
        timeSpent: z.string().describe("The amount of time spent, in Jira's format (e.g., '2h' or '30m')."),
        comment: z.string().optional().describe("A description of the work, including billable status (e.g., 'Fixed the login flow. Billable: Yes')."),
        started: z.string().optional().describe("Optional start date/time in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sss+ZZZZ`). Defaults to now."),
    },
    async ({ issueKey, timeSpent, comment, started }) => {
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
        const config: AxiosRequestConfig = {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        };

        const jiraResponse = await makeJiraRequest<JiraWorklogResponse>(jiraUrl, requestBody, config);
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
        }
);

server.tool(
    "createTask",
    "Creates a new Jira issue/task.",
    {
        project: z.string().describe("The project key (e.g., 'CA')."),
        summary: z.string().describe("The task summary/title."),
        description: z.string().optional().describe("The task description."),
        issueType: z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Task'."),
        priority: z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
        assignee: z.string().optional().describe("The assignee email or username.")
    },
    async ({ project, summary, description, issueType = "Task", priority = "Medium", assignee }) => {
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
        const config: AxiosRequestConfig = {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        };

        const jiraResponse = await makeJiraRequest<JiraIssueResponse>(jiraUrl, requestBody, config);
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
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
