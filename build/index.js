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
const updateIssue_1 = require("./tools/updateIssue");
const sheetToJiraStories_1 = require("./tools/sheetToJiraStories");
const configurationTools_1 = require("./tools/configurationTools");
const meetingNotesToJira_1 = require("./tools/meetingNotesToJira");
const setupUtilities_1 = require("./utils/setupUtilities");
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
AtlassianJira MCP Integration Server

Usage: atlassianjira-mcp-integration [options]

Options:
  --version     Show version number
  --help        Show this help message
  --setup       Force run the configuration setup UI

Configuration:
  The server will automatically detect if configuration is needed and
  launch the setup UI in your browser for first-time setup.

  Configuration is saved to: ~/.jira-mcp.env

  Required fields:
    JIRA_URL=https://your-company.atlassian.net
    JIRA_USERNAME=your-email@company.com
    JIRA_API_TOKEN=your-api-token
    
  Optional fields:
    JIRA_PROJECT_KEY=PROJ
    JIRA_DEFAULT_ASSIGNEE=team-lead@company.com
    JIRA_DEFAULT_PRIORITY=Medium

First-time Setup:
  1. The Configuration UI will open automatically in your browser
  2. Enter your Jira credentials
  3. Test the connection to verify credentials
  4. Save the configuration
  5. The MCP server will start automatically

Manual Setup:
  If automatic setup fails, run: npm run dev in the config-ui directory
  Then open: http://localhost:3000
`);
    process.exit(0);
}
if (args.includes('--setup')) {
    console.error('🔧 Force launching Configuration UI...');
    setupUtilities_1.setupManager.startConfigurationUI().then(() => {
        process.exit(0);
    });
    // Exit early for setup mode
    process.exit(0);
}
// Global server instance
let server;
// Configure dotenv with fallback paths
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(process.env.HOME || "", ".jira-mcp.env"),
    path_1.default.resolve(__dirname, "../.env")
];
function loadEnvironmentConfiguration() {
    for (const envPath of possibleEnvPaths) {
        if (fs_1.default.existsSync(envPath)) {
            dotenv_1.default.config({ path: envPath });
            console.error(`✅ Loading configuration from: ${envPath}`);
            return true;
        }
    }
    return false;
}
function createMCPServer() {
    const mcpServer = new mcp_js_1.McpServer({
        name: "atlassianjira-mcp-integration",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    // Register all tools
    (0, configurationTools_1.registerConfigurationTools)(mcpServer);
    (0, logTime_1.registerLogTimeTool)(mcpServer);
    (0, createTask_1.registerCreateTaskTool)(mcpServer);
    (0, updateIssue_1.registerUpdateIssueTool)(mcpServer);
    // registerActivityTimelineTools(mcpServer); // DISABLED: Requires Activity Timeline plugin API access
    (0, sheetToJiraStories_1.registerSheetToJiraStoriesTool)(mcpServer);
    (0, meetingNotesToJira_1.registerMeetingNotesToJiraTool)(mcpServer);
    return mcpServer;
}
async function startMCPServer() {
    try {
        console.error('🚀 Starting Jira MCP Server...');
        // Create server instance
        server = createMCPServer();
        // Start server with stdio transport
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        console.error('✅ Jira MCP Server running on stdio');
        console.error('🔗 Ready to handle Jira integration requests from Claude!');
    }
    catch (error) {
        console.error('❌ Fatal error starting MCP server:', error);
        process.exit(1);
    }
}
async function checkConfigurationAndStart() {
    try {
        // Check if configuration exists
        if (setupUtilities_1.setupManager.hasConfiguration()) {
            console.error('✅ Configuration found, loading...');
            // Load existing configuration
            const configLoaded = loadEnvironmentConfiguration();
            if (!configLoaded) {
                console.error('⚠️  Configuration file exists but could not be loaded');
            }
            // Start MCP server normally
            await startMCPServer();
            return;
        }
        // No configuration found - first-time setup needed
        console.error('\n🎯 First-time setup detected!');
        console.error('📋 No Jira configuration found. Starting automated setup...\n');
        // Check if we can run the setup UI
        if (!setupUtilities_1.setupManager.hasConfigUI()) {
            console.error('❌ Configuration UI not found.');
            console.error('💡 Please ensure the config-ui directory exists in your project.');
            setupUtilities_1.setupManager.showFallbackInstructions();
            process.exit(1);
        }
        // Start the Configuration UI
        const setupStarted = await setupUtilities_1.setupManager.startConfigurationUI();
        if (!setupStarted) {
            console.error('❌ Failed to start automated setup.');
            setupUtilities_1.setupManager.showFallbackInstructions();
            process.exit(1);
        }
        // Wait for configuration to be completed
        // This will be handled by the setupManager's monitoring
    }
    catch (error) {
        console.error('❌ Error during configuration check:', error);
        setupUtilities_1.setupManager.showFallbackInstructions();
        process.exit(1);
    }
}
// Handle configuration completion
process.on('configuration-ready', async () => {
    console.error('🔄 Configuration completed, loading and starting MCP server...');
    // Load the new configuration
    const configLoaded = loadEnvironmentConfiguration();
    if (configLoaded) {
        // Start the MCP server
        await startMCPServer();
    }
    else {
        console.error('❌ Failed to load the saved configuration');
        process.exit(1);
    }
});
// Handle process cleanup
process.on('SIGINT', () => {
    console.error('\n🛑 Shutting down...');
    setupUtilities_1.setupManager.cleanup();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('\n🛑 Shutting down...');
    setupUtilities_1.setupManager.cleanup();
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    setupUtilities_1.setupManager.cleanup();
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    setupUtilities_1.setupManager.cleanup();
    process.exit(1);
});
// Main entry point
async function main() {
    console.error('🚀 AtlassianJira MCP Integration Server');
    console.error('📋 Checking configuration and starting setup if needed...\n');
    await checkConfigurationAndStart();
}
// Start the application
main().catch((error) => {
    console.error('❌ Fatal error in main():', error);
    setupUtilities_1.setupManager.cleanup();
    process.exit(1);
});
