"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogTimeTool = registerLogTimeTool;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const configManager_1 = require("../utils/configManager");
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
const logTimeSchema = zod_1.z.object({
    issueKey: zod_1.z.string().describe("The Jira issue key to log work against (e.g., 'PROJ-123')."),
    timeSpent: zod_1.z.string().describe("The amount of time spent, in Jira's format (e.g., '2h' or '30m')."),
    comment: zod_1.z.string().optional().describe("A description of the work, including billable status (e.g., 'Fixed the login flow. Billable: Yes')."),
    started: zod_1.z.string().optional().describe("Optional start date/time in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sss+ZZZZ`). Defaults to now."),
});
function registerLogTimeTool(server) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool("logTime", "Logs a work entry to a specific Jira issue.", logTimeSchema.shape, async ({ issueKey, timeSpent, comment, started }) => {
        const config = configManager_1.dynamicConfig.getConfig();
        if (!configManager_1.dynamicConfig.isConfigured()) {
            const missing = configManager_1.dynamicConfig.getMissingFields();
            throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
        }
        const jiraUrl = `${config.url}/rest/api/3/issue/${issueKey}/worklog`;
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
        const authBuffer = Buffer.from(`${config.username}:${config.apiToken}`).toString("base64");
        const axiosConfig = {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            timeout: 10000,
        };
        const jiraResponse = await makeJiraRequest(jiraUrl, requestBody, axiosConfig);
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
}
