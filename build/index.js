#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Node.js version compatibility check
const requiredNodeVersion = '20.0.0';
const currentVersion = process.version.substring(1); // Remove 'v' prefix
function compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        if (v1Part > v2Part)
            return 1;
        if (v1Part < v2Part)
            return -1;
    }
    return 0;
}
if (compareVersions(currentVersion, requiredNodeVersion) < 0) {
    console.error(`
❌ Node.js Version Incompatibility Error

Current Node.js version: v${currentVersion}
Required Node.js version: >=${requiredNodeVersion}

The AtlassianJira MCP Integration server requires Node.js v${requiredNodeVersion} or higher.

🔧 How to fix this:

1. Update Node.js:
   • Visit: https://nodejs.org/
   • Download and install Node.js v20+ (LTS recommended)

2. If using a version manager (nvm):
   • Run: nvm install 20 && nvm use 20

3. Clear npx cache and retry:
   • Run: npx clear-npx-cache
   • Then: npx -y github:techrivers/AtlassianJira-MCP-Integration

4. For Claude Desktop, ensure it uses the updated Node.js version:
   • Restart Claude Desktop completely after updating Node.js
   • Or specify the full Node.js path in your configuration

For more help, see: https://github.com/techrivers/AtlassianJira-MCP-Integration
`);
    // In MCP mode, don't exit - continue with graceful fallback
    if (process.env.MCP_MODE !== 'true') {
        process.exit(1);
    }
    else {
        console.error('⚠️ Running in MCP mode with incompatible Node.js version - some features may not work correctly');
    }
}
console.error(`✅ Node.js compatibility check passed (v${currentVersion})`);
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
const credentialLoader_1 = require("./utils/credentialLoader");
const helpSystem_1 = require("./cli/helpSystem");
// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--version')) {
    const packagePath = path_1.default.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs_1.default.readFileSync(packagePath, 'utf8'));
    console.log(pkg.version);
    process.exit(0);
}
if (args.includes('--configure')) {
    // Launch secure CLI configuration tool
    console.error('🔐 Starting Secure Jira Configuration Tool...\n');
    import('./cli/secureConfigure.js').then(async ({ runSecureCLIConfiguration }) => {
        const success = await runSecureCLIConfiguration();
        console.error(success ? '\n✅ Configuration completed successfully!' : '\n❌ Configuration failed or was cancelled.');
        process.exit(success ? 0 : 1);
    }).catch((error) => {
        console.error('❌ Failed to start secure configuration:', error);
        process.exit(1);
    });
    // Don't continue with normal execution - exit early
    process.exit(0);
}
if (args.includes('--help')) {
    // Check for specific help topics
    if (args.includes('--security')) {
        (0, helpSystem_1.showSecurityDetailsHelp)();
        process.exit(0);
    }
    if (args.includes('--troubleshoot')) {
        (0, helpSystem_1.showTroubleshootingHelp)();
        process.exit(0);
    }
    if (args.includes('--mcp')) {
        (0, helpSystem_1.showMCPConfigurationExample)();
        process.exit(0);
    }
    // Default help
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AtlassianJira MCP Integration Server                     │
│                        Enterprise-Grade Jira Integration                    │
└─────────────────────────────────────────────────────────────────────────────┘

USAGE: atlassianjira-mcp-integration [options]

📋 MAIN COMMANDS:
  --configure   🔐 Launch secure credential configuration (RECOMMENDED)
  --version     📊 Show version number
  --help        📚 Show this help message

🔐 SECURE CONFIGURATION (Recommended):
  atlassianjira-mcp-integration --configure
  
  Enterprise-grade security features:
  ✅ Hidden API token input (never displayed)
  ✅ Real-time connection validation
  ✅ AES-256 encrypted credential storage
  ✅ Zero exposure to AI systems
  ✅ Cross-platform compatibility

📚 ADDITIONAL HELP:
  --help --security      🛡️  Detailed security architecture
  --help --troubleshoot  🔧 Common issues and solutions
  --help --mcp           📋 Claude Desktop configuration

🚀 QUICK START GUIDE:
  1. Run: atlassianjira-mcp-integration --configure
  2. Follow the secure setup wizard
  3. Add simple MCP config to Claude Desktop (no credentials)
  4. Restart Claude Desktop
  5. Start using Jira with Claude!

📍 REQUIRED INFORMATION:
  • Jira URL: https://your-company.atlassian.net
  • Username: your-email@company.com
  • API Token: https://id.atlassian.com/manage-profile/security/api-tokens

🔗 RESOURCES:
  • Documentation: https://github.com/techrivers/AtlassianJira-MCP-Integration
  • Issues: https://github.com/techrivers/AtlassianJira-MCP-Integration/issues
  • Security Guide: See --help --security

⚠️  LEGACY OPTIONS (Not Recommended):
  --setup       🔧 Force run legacy configuration UI (less secure)
`);
    process.exit(0);
}
if (args.includes('--setup')) {
    // In MCP mode, skip UI setup
    if (process.env.MCP_MODE === 'true' || process.env.SKIP_UI_SETUP === 'true') {
        console.error('⚠️ Setup UI disabled in MCP mode - please configure via environment variables');
    }
    else {
        console.error('🔧 Force launching Configuration UI...');
        setupUtilities_1.setupManager.startConfigurationUI().then(() => {
            process.exit(0);
        });
        // Exit early for setup mode
        process.exit(0);
    }
}
// Global server instance
let server;
// Configure dotenv with fallback paths
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(process.env.HOME || "", ".jira-mcp.env"),
    path_1.default.resolve(__dirname, "../.env")
];
async function loadEnvironmentConfiguration() {
    // First try to load secure credentials
    try {
        await (0, credentialLoader_1.setupJiraEnvironment)();
        if (process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN) {
            console.error('✅ Using secure credential configuration');
            return true;
        }
    }
    catch (error) {
        console.error('⚠️  Failed to load secure credentials, trying fallback methods');
    }
    // Fallback: check if all required environment variables are already set
    if (process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN) {
        console.error('✅ Using environment variables for configuration');
        return true;
    }
    // Then check configuration files
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
        // In MCP mode, prioritize environment variables and skip UI setup
        if (process.env.MCP_MODE === 'true' || process.env.SKIP_UI_SETUP === 'true') {
            console.error('🚀 MCP mode detected - checking environment configuration...');
            const configLoaded = await loadEnvironmentConfiguration();
            if (configLoaded) {
                console.error('✅ Environment configuration loaded successfully');
                await startMCPServer();
                return;
            }
            else {
                console.error('✅ Zero-configuration mode detected');
                console.error('🎯 No Jira configuration required to start');
                console.error('💬 Configure your Jira connection through conversation with Claude:');
                console.error('   • "I need to set up my Jira connection"');
                console.error('   • "Help me configure Jira integration"');
                console.error('   • "What Jira settings do I need?"');
                console.error('');
                console.error('🚀 Starting MCP server with dynamic configuration tools...');
                await startMCPServer();
                return;
            }
        }
        // Check if configuration exists
        if (setupUtilities_1.setupManager.hasConfiguration()) {
            console.error('✅ Configuration found, loading...');
            // Load existing configuration
            const configLoaded = await loadEnvironmentConfiguration();
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
            // In MCP environments, don't exit - start server anyway
            if (process.env.MCP_MODE === 'true') {
                console.error('🚀 Starting MCP server with zero-configuration mode');
                console.error('💬 Use Claude conversation to configure Jira connection');
                await startMCPServer();
                return;
            }
            else {
                process.exit(1);
            }
        }
        // Start the Configuration UI
        const setupStarted = await setupUtilities_1.setupManager.startConfigurationUI();
        if (!setupStarted) {
            console.error('❌ Failed to start automated setup.');
            setupUtilities_1.setupManager.showFallbackInstructions();
            // In MCP environments, don't exit - start server anyway
            if (process.env.MCP_MODE === 'true') {
                console.error('🚀 Starting MCP server with zero-configuration mode');
                console.error('💬 Use Claude conversation to configure Jira connection');
                await startMCPServer();
                return;
            }
            else {
                process.exit(1);
            }
        }
        // Wait for configuration to be completed
        // This will be handled by the setupManager's monitoring
    }
    catch (error) {
        console.error('❌ Error during configuration check:', error);
        setupUtilities_1.setupManager.showFallbackInstructions();
        // In MCP environments, don't exit - start server anyway
        if (process.env.MCP_MODE === 'true') {
            console.error('🚀 Starting MCP server with zero-configuration mode');
            console.error('💬 Use Claude conversation to configure Jira connection');
            await startMCPServer();
            return;
        }
        else {
            process.exit(1);
        }
    }
}
// Handle configuration completion
process.on('configuration-ready', async () => {
    console.error('🔄 Configuration completed, loading and starting MCP server...');
    // Load the new configuration
    const configLoaded = await loadEnvironmentConfiguration();
    if (configLoaded) {
        // Start the MCP server
        await startMCPServer();
    }
    else {
        console.error('❌ Failed to load the saved configuration');
        // In MCP mode, don't exit - start server anyway
        if (process.env.MCP_MODE === 'true') {
            console.error('🚀 Starting MCP server with zero-configuration mode');
            console.error('💬 Use Claude conversation to configure Jira connection');
            await startMCPServer();
        }
        else {
            process.exit(1);
        }
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
    // In MCP mode, try to continue running
    if (process.env.MCP_MODE !== 'true') {
        process.exit(1);
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
    setupUtilities_1.setupManager.cleanup();
    // In MCP mode, try to continue running
    if (process.env.MCP_MODE !== 'true') {
        process.exit(1);
    }
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
    // In MCP mode, try to start basic server
    if (process.env.MCP_MODE === 'true') {
        console.error('🚀 Starting MCP server with zero-configuration mode');
        console.error('💬 Use Claude conversation to configure Jira connection');
        startMCPServer().catch((mcpError) => {
            console.error('❌ Failed to start MCP server:', mcpError);
            process.exit(1);
        });
    }
    else {
        process.exit(1);
    }
});
