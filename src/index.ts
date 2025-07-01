import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import path from "path";
import { registerLogTimeTool } from "./tools/logTime";
import { registerCreateTaskTool } from "./tools/createTask";

// Configure dotenv
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });
console.error(`Loading .env from: ${envPath}`);


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

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
