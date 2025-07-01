"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logTime_1 = require("./tools/logTime");
const createTask_1 = require("./tools/createTask");
// Configure dotenv
const envPath = path_1.default.resolve(__dirname, "../.env");
dotenv_1.default.config({ path: envPath });
console.error(`Loading .env from: ${envPath}`);
const server = new mcp_js_1.McpServer({
    name: "jira-activitytimeline-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Register tools from tools directory
(0, logTime_1.registerLogTimeTool)(server);
(0, createTask_1.registerCreateTaskTool)(server);
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
