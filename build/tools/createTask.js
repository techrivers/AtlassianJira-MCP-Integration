"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCreateTaskTool = registerCreateTaskTool;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
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
    issueType: zod_1.z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Task'."),
    priority: zod_1.z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
    assignee: zod_1.z.string().optional().describe("The assignee email or username.")
});
function registerCreateTaskTool(server) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool("createTask", "Creates a new Jira issue/task.", createTaskSchema.shape, async ({ project, summary, description, issueType = "Task", priority = "Medium", assignee }) => {
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
}
