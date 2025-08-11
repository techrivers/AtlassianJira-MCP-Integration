#!/usr/bin/env node
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

export interface SetupConfig {
    configPath: string;
    configUIPath: string;
    frontendPort: number;
    backendPort: number;
}

export class AutoSetupManager {
    private config: SetupConfig;
    private uiProcess: ChildProcess | null = null;
    private setupInProgress = false;

    constructor() {
        this.config = {
            configPath: path.join(os.homedir(), '.jira-mcp.env'),
            configUIPath: path.resolve(__dirname, '../../config-ui'),
            frontendPort: 3000,
            backendPort: 5000
        };
    }

    /**
     * Check if configuration file exists
     */
    public hasConfiguration(): boolean {
        return fs.existsSync(this.config.configPath);
    }

    /**
     * Check if config-ui directory exists
     */
    public hasConfigUI(): boolean {
        return fs.existsSync(this.config.configUIPath) && 
               fs.existsSync(path.join(this.config.configUIPath, 'package.json'));
    }

    /**
     * Check if ports are available
     */
    private async isPortAvailable(port: number): Promise<boolean> {
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
    private openBrowser(url: string): void {
        const start = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
        
        try {
            spawn(start, [url], { detached: true, stdio: 'ignore' });
            console.error(`🌐 Opening browser: ${url}`);
        } catch (error) {
            console.error(`❌ Failed to open browser automatically. Please open: ${url}`);
        }
    }

    /**
     * Install dependencies in config-ui directory
     */
    private async installDependencies(): Promise<boolean> {
        console.error('📦 Installing Configuration UI dependencies...');
        
        return new Promise((resolve) => {
            const installProcess = spawn('npm', ['install'], {
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
                } else {
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
    public async startConfigurationUI(): Promise<boolean> {
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
            const nodeModulesExists = fs.existsSync(path.join(this.config.configUIPath, 'node_modules'));
            if (!nodeModulesExists) {
                const installed = await this.installDependencies();
                if (!installed) {
                    this.showFallbackInstructions();
                    return false;
                }
            }

            console.error('🌐 Starting Configuration UI servers...');

            // Start the configuration UI (both backend and frontend)
            this.uiProcess = spawn('npm', ['run', 'dev'], {
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

        } catch (error) {
            console.error('❌ Error during setup:', error);
            this.showFallbackInstructions();
            this.setupInProgress = false;
            return false;
        }
    }

    /**
     * Monitor configuration file creation
     */
    private monitorConfigurationFile(): void {
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
    private continueWithMCPServer(): void {
        console.error('🚀 Configuration complete! Starting Jira MCP Server...\n');
        
        // Reload the configuration and continue with normal MCP server startup
        // This will be handled by the main server file
        process.emit('configuration-ready' as any);
    }

    /**
     * Show fallback instructions if automatic setup fails
     */
    public showFallbackInstructions(): void {
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
    public isSetupInProgress(): boolean {
        return this.setupInProgress;
    }

    /**
     * Stop the configuration UI
     */
    public stopConfigurationUI(): void {
        if (this.uiProcess) {
            this.uiProcess.kill('SIGTERM');
            this.uiProcess = null;
        }
        this.setupInProgress = false;
    }

    /**
     * Cleanup on exit
     */
    public cleanup(): void {
        this.stopConfigurationUI();
    }
}

// Export singleton instance
export const setupManager = new AutoSetupManager();