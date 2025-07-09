#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { registerLogTimeTool } from "./tools/logTime";
import { registerCreateTaskTool } from "./tools/createTask";
import { registerActivityTimelineTools } from "./tools/activityTimeline";
import { registerSheetToJiraStoriesTool } from "./tools/sheetToJiraStories";

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--version')) {
    const packagePath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
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
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.env.HOME || "", ".jira-mcp.env"),
    path.resolve(__dirname, "../.env")
];

for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.error(`Loading .env from: ${envPath}`);
        break;
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

// Register tools from tools directory
registerLogTimeTool(server);
registerCreateTaskTool(server);
registerActivityTimelineTools(server);
registerSheetToJiraStoriesTool(server);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
