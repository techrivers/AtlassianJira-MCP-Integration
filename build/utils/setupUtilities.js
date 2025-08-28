#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupManager = exports.AutoSetupManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const util_1 = require("util");
const credentialLoader_1 = require("./credentialLoader");
const sleep = (0, util_1.promisify)(setTimeout);
class AutoSetupManager {
    config;
    uiProcess = null;
    setupInProgress = false;
    constructor() {
        this.config = {
            configPath: path_1.default.join(os_1.default.homedir(), '.jira-mcp.env'),
            configUIPath: path_1.default.resolve(__dirname, '../../config-ui'),
            frontendPort: 3000,
            backendPort: 5000
        };
    }
    /**
     * Check if configuration file exists or environment variables are set
     */
    hasConfiguration() {
        // Check environment variables first (MCP mode)
        if (process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN) {
            return true;
        }
        // Check for secure credential storage
        if ((0, credentialLoader_1.hasStoredCredentials)()) {
            return true;
        }
        // Then check legacy configuration file
        return fs_1.default.existsSync(this.config.configPath);
    }
    /**
     * Check if config-ui directory exists
     */
    hasConfigUI() {
        return fs_1.default.existsSync(this.config.configUIPath) &&
            fs_1.default.existsSync(path_1.default.join(this.config.configUIPath, 'package.json'));
    }
    /**
     * Check if ports are available
     */
    async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = require('net').createServer();
            server.listen(port, () => {
                server.once('close', () => resolve(true));
                server.close();
            });
            server.on('error', () => resolve(false));
        });
    }
    /**
     * Open URL in default browser (cross-platform)
     */
    openBrowser(url) {
        const start = process.platform === 'darwin' ? 'open' :
            process.platform === 'win32' ? 'start' : 'xdg-open';
        try {
            (0, child_process_1.spawn)(start, [url], { detached: true, stdio: 'ignore' });
            console.error(`🌐 Opening browser: ${url}`);
        }
        catch (error) {
            console.error(`❌ Failed to open browser automatically. Please open: ${url}`);
        }
    }
    /**
     * Install dependencies in config-ui directory
     */
    async installDependencies() {
        console.error('📦 Installing Configuration UI dependencies...');
        return new Promise((resolve) => {
            const installProcess = (0, child_process_1.spawn)('npm', ['install'], {
                cwd: this.config.configUIPath,
                stdio: 'pipe'
            });
            let output = '';
            installProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });
            installProcess.stderr?.on('data', (data) => {
                output += data.toString();
            });
            installProcess.on('close', (code) => {
                if (code === 0) {
                    console.error('✅ Dependencies installed successfully');
                    resolve(true);
                }
                else {
                    console.error('❌ Failed to install dependencies');
                    console.error(output);
                    resolve(false);
                }
            });
        });
    }
    /**
     * Start the Configuration UI
     */
    async startConfigurationUI() {
        // Skip UI setup in MCP mode
        if (process.env.MCP_MODE === 'true' || process.env.SKIP_UI_SETUP === 'true') {
            console.error('⚠️ Configuration UI is disabled in MCP mode');
            console.error('💡 Please configure using environment variables:');
            console.error('   JIRA_URL=https://your-company.atlassian.net');
            console.error('   JIRA_USERNAME=your-email@company.com');
            console.error('   JIRA_API_TOKEN=your-api-token');
            return false;
        }
        if (this.setupInProgress) {
            console.error('⚠️  Setup already in progress...');
            return false;
        }
        this.setupInProgress = true;
        try {
            console.error('\n🚀 Starting automated Jira MCP setup...\n');
            // Check if config-ui directory exists
            if (!this.hasConfigUI()) {
                console.error('❌ Configuration UI not found at:', this.config.configUIPath);
                console.error('💡 Please ensure the config-ui directory exists with the UI files.');
                return false;
            }
            // Check if ports are available
            const frontendAvailable = await this.isPortAvailable(this.config.frontendPort);
            const backendAvailable = await this.isPortAvailable(this.config.backendPort);
            if (!frontendAvailable) {
                console.error(`❌ Port ${this.config.frontendPort} is already in use.`);
                console.error('💡 Please close any applications using this port and try again.');
                return false;
            }
            if (!backendAvailable) {
                console.error(`❌ Port ${this.config.backendPort} is already in use.`);
                console.error('💡 Please close any applications using this port and try again.');
                return false;
            }
            // Install dependencies if node_modules doesn't exist
            const nodeModulesExists = fs_1.default.existsSync(path_1.default.join(this.config.configUIPath, 'node_modules'));
            if (!nodeModulesExists) {
                const installed = await this.installDependencies();
                if (!installed) {
                    this.showFallbackInstructions();
                    return false;
                }
            }
            console.error('🌐 Starting Configuration UI servers...');
            // Start the configuration UI (both backend and frontend)
            this.uiProcess = (0, child_process_1.spawn)('npm', ['run', 'dev'], {
                cwd: this.config.configUIPath,
                stdio: 'pipe',
                detached: false
            });
            // Handle UI process output
            this.uiProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                console.error(`[Config UI] ${output.trim()}`);
                // Look for indicators that servers are ready
                if (output.includes('webpack compiled') ||
                    output.includes('Local:') ||
                    output.includes('localhost:3000')) {
                    // Give a moment for both servers to be ready
                    setTimeout(() => {
                        this.openBrowser(`http://localhost:${this.config.frontendPort}`);
                    }, 2000);
                }
            });
            this.uiProcess.stderr?.on('data', (data) => {
                const error = data.toString();
                console.error(`[Config UI Error] ${error.trim()}`);
            });
            this.uiProcess.on('close', (code) => {
                console.error(`Configuration UI process exited with code ${code}`);
                this.setupInProgress = false;
            });
            this.uiProcess.on('error', (error) => {
                console.error('❌ Failed to start Configuration UI:', error.message);
                this.showFallbackInstructions();
                this.setupInProgress = false;
            });
            // Wait a moment for servers to start
            await sleep(3000);
            console.error('\n📋 Configuration UI Setup Instructions:');
            console.error('1. The Configuration UI should open in your browser automatically');
            console.error(`2. If not, please open: http://localhost:${this.config.frontendPort}`);
            console.error('3. Enter your Jira credentials (URL, Username, API Token)');
            console.error('4. Test the connection to verify your credentials');
            console.error('5. Save the configuration');
            console.error('6. Return to this terminal - the MCP server will continue automatically\n');
            // Start monitoring for configuration file
            this.monitorConfigurationFile();
            return true;
        }
        catch (error) {
            console.error('❌ Error during setup:', error);
            this.showFallbackInstructions();
            this.setupInProgress = false;
            return false;
        }
    }
    /**
     * Monitor configuration file creation
     */
    monitorConfigurationFile() {
        console.error('⏳ Waiting for configuration to be saved...');
        const checkConfig = () => {
            if (this.hasConfiguration()) {
                console.error('✅ Configuration saved successfully!');
                console.error('🔄 Stopping Configuration UI and continuing with MCP server...\n');
                // Stop the UI process
                if (this.uiProcess) {
                    this.uiProcess.kill('SIGTERM');
                    this.uiProcess = null;
                }
                this.setupInProgress = false;
                // Continue with MCP server startup
                this.continueWithMCPServer();
                return;
            }
            // Check again in 2 seconds
            setTimeout(checkConfig, 2000);
        };
        checkConfig();
    }
    /**
     * Continue with MCP server after configuration is complete
     */
    continueWithMCPServer() {
        console.error('🚀 Configuration complete! Starting Jira MCP Server...\n');
        // Reload the configuration and continue with normal MCP server startup
        // This will be handled by the main server file
        process.emit('configuration-ready');
    }
    /**
     * Show fallback instructions if automatic setup fails
     */
    showFallbackInstructions() {
        // In MCP mode, show environment variable instructions
        if (process.env.MCP_MODE === 'true' || process.env.SKIP_UI_SETUP === 'true') {
            console.error('\n💡 MCP Mode Configuration Instructions:\n');
            console.error('Set the following environment variables in your MCP configuration:');
            console.error('');
            console.error('{');
            console.error('  "mcpServers": {');
            console.error('    "Jira Integration MCP": {');
            console.error('      "command": "npx",');
            console.error('      "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"],');
            console.error('      "env": {');
            console.error('        "JIRA_URL": "https://your-company.atlassian.net",');
            console.error('        "JIRA_USERNAME": "your-email@company.com",');
            console.error('        "JIRA_API_TOKEN": "your-api-token",');
            console.error('        "MCP_MODE": "true"');
            console.error('      }');
            console.error('    }');
            console.error('  }');
            console.error('}');
            console.error('\n📋 Optional environment variables:');
            console.error('   JIRA_PROJECT_KEY=PROJ (default project)');
            console.error('   JIRA_DEFAULT_ASSIGNEE=user@company.com');
            console.error('   JIRA_DEFAULT_PRIORITY=Medium');
            console.error('');
            return;
        }
        console.error('\n❌ Automated setup failed. Please follow these manual steps:\n');
        console.error('1. Open a new terminal window');
        console.error('2. Navigate to the config-ui directory:');
        console.error(`   cd "${this.config.configUIPath}"`);
        console.error('3. Install dependencies (if needed):');
        console.error('   npm install');
        console.error('4. Start the Configuration UI:');
        console.error('   npm run dev');
        console.error('5. Open your browser and go to:');
        console.error(`   http://localhost:${this.config.frontendPort}`);
        console.error('6. Configure your Jira credentials and save');
        console.error('7. Restart this MCP server\n');
    }
    /**
     * Check if setup is currently in progress
     */
    isSetupInProgress() {
        return this.setupInProgress;
    }
    /**
     * Stop the configuration UI
     */
    stopConfigurationUI() {
        if (this.uiProcess) {
            this.uiProcess.kill('SIGTERM');
            this.uiProcess = null;
        }
        this.setupInProgress = false;
    }
    /**
     * Cleanup on exit
     */
    cleanup() {
        this.stopConfigurationUI();
    }
}
exports.AutoSetupManager = AutoSetupManager;
// Export singleton instance
exports.setupManager = new AutoSetupManager();
