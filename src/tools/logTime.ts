import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";

// --- Interfaces for Jira API responses ---
interface JiraWorklogResponse {
    id: string;
    [key: string]: unknown;
}

// --- Helper function for making Jira API requests ---
async function makeJiraRequest<T>(url: string, data: unknown, config: AxiosRequestConfig): Promise<T> {
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

const logTimeSchema = z.object({
    issueKey: z.string().describe("The Jira issue key to log work against (e.g., 'PROJ-123')."),
    timeSpent: z.string().describe("The amount of time spent, in Jira's format (e.g., '2h' or '30m')."),
    comment: z.string().optional().describe("A description of the work, including billable status (e.g., 'Fixed the login flow. Billable: Yes')."),
    started: z.string().optional().describe("Optional start date/time in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sss+ZZZZ`). Defaults to now."),
});

type LogTimeInput = z.infer<typeof logTimeSchema>;

export function registerLogTimeTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "logTime",
        "Logs a work entry to a specific Jira issue.",
        logTimeSchema.shape,
        async ({ issueKey, timeSpent, comment, started }: LogTimeInput) => {
            const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;
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
}
