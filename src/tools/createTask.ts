import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";

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
        throw new Error(`Failed to create task: ${errorMessage}`);
    }
}

const createTaskSchema = z.object({
    project: z.string().describe("The project key (e.g., 'CA')."),
    summary: z.string().describe("The task summary/title."),
    description: z.string().optional().describe("The task description."),
    issueType: z.string().optional().describe("The issue type (e.g., 'Task', 'Bug', 'Story'). Defaults to 'Task'."),
    priority: z.string().optional().describe("The priority (e.g., 'High', 'Medium', 'Low'). Defaults to 'Medium'."),
    assignee: z.string().optional().describe("The assignee email or username.")
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;

export function registerCreateTaskTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "createTask",
        "Creates a new Jira issue/task.",
        createTaskSchema.shape,
        async ({
            project,
            summary,
            description,
            issueType = "Task",
            priority = "Medium",
            assignee
        }: CreateTaskInput) => {
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
}
