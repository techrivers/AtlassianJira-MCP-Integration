#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { registerLogTimeTool } from "./tools/logTime";
import { registerCreateTaskTool } from "./tools/createTask";
import { registerUpdateIssueTool } from "./tools/updateIssue";
import { registerActivityTimelineTools } from "./tools/activityTimeline";
import { registerSheetToJiraStoriesTool } from "./tools/sheetToJiraStories";
import { registerConfigurationTools } from "./tools/configurationTools";
import { registerMeetingNotesToJiraTool } from "./tools/meetingNotesToJira";
import { setupManager } from "./utils/setupUtilities";

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
    setupManager.startConfigurationUI().then(() => {
        process.exit(0);
    });
    // Exit early for setup mode
    process.exit(0);
}

// Global server instance
let server: McpServer;

// Configure dotenv with fallback paths
const possibleEnvPaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.env.HOME || "", ".jira-mcp.env"),
    path.resolve(__dirname, "../.env")
];

function loadEnvironmentConfiguration(): boolean {
    for (const envPath of possibleEnvPaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.error(`✅ Loading configuration from: ${envPath}`);
            return true;
        }
    }
    return false;
}

function createMCPServer(): McpServer {
    const mcpServer = new McpServer({
        name: "atlassianjira-mcp-integration",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });

    // Register all tools
    registerConfigurationTools(mcpServer);
    registerLogTimeTool(mcpServer);
    registerCreateTaskTool(mcpServer);
    registerUpdateIssueTool(mcpServer);
    // registerActivityTimelineTools(mcpServer); // DISABLED: Requires Activity Timeline plugin API access
    registerSheetToJiraStoriesTool(mcpServer);
    registerMeetingNotesToJiraTool(mcpServer);

    return mcpServer;
}

async function startMCPServer(): Promise<void> {
    try {
        console.error('🚀 Starting Jira MCP Server...');
        
        // Create server instance
        server = createMCPServer();
        
        // Start server with stdio transport
        const transport = new StdioServerTransport();
        await server.connect(transport);
        
        console.error('✅ Jira MCP Server running on stdio');
        console.error('🔗 Ready to handle Jira integration requests from Claude!');
        
    } catch (error) {
        console.error('❌ Fatal error starting MCP server:', error);
        process.exit(1);
    }
}

async function checkConfigurationAndStart(): Promise<void> {
    try {
        // Check if configuration exists
        if (setupManager.hasConfiguration()) {
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
        if (!setupManager.hasConfigUI()) {
            console.error('❌ Configuration UI not found.');
            console.error('💡 Please ensure the config-ui directory exists in your project.');
            setupManager.showFallbackInstructions();
            process.exit(1);
        }

        // Start the Configuration UI
        const setupStarted = await setupManager.startConfigurationUI();
        if (!setupStarted) {
            console.error('❌ Failed to start automated setup.');
            setupManager.showFallbackInstructions();
            process.exit(1);
        }

        // Wait for configuration to be completed
        // This will be handled by the setupManager's monitoring
        
    } catch (error) {
        console.error('❌ Error during configuration check:', error);
        setupManager.showFallbackInstructions();
        process.exit(1);
    }
}

// Handle configuration completion
process.on('configuration-ready' as any, async () => {
    console.error('🔄 Configuration completed, loading and starting MCP server...');
    
    // Load the new configuration
    const configLoaded = loadEnvironmentConfiguration();
    if (configLoaded) {
        // Start the MCP server
        await startMCPServer();
    } else {
        console.error('❌ Failed to load the saved configuration');
        process.exit(1);
    }
});

// Handle process cleanup
process.on('SIGINT', () => {
    console.error('\n🛑 Shutting down...');
    setupManager.cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.error('\n🛑 Shutting down...');
    setupManager.cleanup();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    setupManager.cleanup();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    setupManager.cleanup();
    process.exit(1);
});

// Main entry point
async function main(): Promise<void> {
    console.error('🚀 AtlassianJira MCP Integration Server');
    console.error('📋 Checking configuration and starting setup if needed...\n');
    
    await checkConfigurationAndStart();
}

// Start the application
main().catch((error) => {
    console.error('❌ Fatal error in main():', error);
    setupManager.cleanup();
    process.exit(1);
});