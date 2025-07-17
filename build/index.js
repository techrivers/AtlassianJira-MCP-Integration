#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logTime_1 = require("./tools/logTime");
const createTask_1 = require("./tools/createTask");
const sheetToJiraStories_1 = require("./tools/sheetToJiraStories");
const configurationTools_1 = require("./tools/configurationTools");
// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--version')) {
    const packagePath = path_1.default.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs_1.default.readFileSync(packagePath, 'utf8'));
    console.log(pkg.version);
    process.exit(0);
}
if (args.includes('--help')) {
    console.log(`
Jira Activity Timeline MCP Server

Usage: jira-activitytimeline-server [options]

Options:
  --version     Show version number
  --help        Show this help message

Configuration:
  Set environment variables in .env file or ~/.jira-mcp.env

  Required:
    JIRA_URL=https://your-company.atlassian.net
    JIRA_USERNAME=your-email@company.com
    JIRA_API_TOKEN=your-api-token
    JIRA_PROJECT_KEY=PROJ

  Optional:
    JIRA_DEFAULT_ASSIGNEE=team-lead@company.com
    JIRA_DEFAULT_PRIORITY=Medium
`);
    process.exit(0);
}
// Configure dotenv with fallback paths
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(process.env.HOME || "", ".jira-mcp.env"),
    path_1.default.resolve(__dirname, "../.env")
];
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        console.error(`Loading .env from: ${envPath}`);
        break;
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
// Register tools from tools directory
(0, configurationTools_1.registerConfigurationTools)(server);
(0, logTime_1.registerLogTimeTool)(server);
(0, createTask_1.registerCreateTaskTool)(server);
// registerActivityTimelineTools(server); // DISABLED: Requires Activity Timeline plugin API access
(0, sheetToJiraStories_1.registerSheetToJiraStoriesTool)(server);
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
