import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

export interface JiraConfig {
    url?: string;
    username?: string;
    apiToken?: string;
    projectKey?: string;
    defaultAssignee?: string;
    defaultPriority?: string;
}

export class DynamicJiraConfig {
    private configPath: string;
    private config: JiraConfig;

    constructor() {
        this.configPath = path.join(os.homedir(), '.jira-mcp.env');
        this.config = this.loadConfig();
    }

    /**
     * Load configuration from file and environment variables
     */
    private loadConfig(): JiraConfig {
        const config: JiraConfig = {};

        // Try to load from file first
        if (fs.existsSync(this.configPath)) {
            const envConfig = dotenv.parse(fs.readFileSync(this.configPath, 'utf8'));
            config.url = envConfig.JIRA_URL;
            config.username = envConfig.JIRA_USERNAME;
            config.apiToken = envConfig.JIRA_API_TOKEN;
            config.projectKey = envConfig.JIRA_PROJECT_KEY;
            config.defaultAssignee = envConfig.JIRA_DEFAULT_ASSIGNEE;
            config.defaultPriority = envConfig.JIRA_DEFAULT_PRIORITY;
        }

        // Override with environment variables if they exist
        if (process.env.JIRA_URL) config.url = process.env.JIRA_URL;
        if (process.env.JIRA_USERNAME) config.username = process.env.JIRA_USERNAME;
        if (process.env.JIRA_API_TOKEN) config.apiToken = process.env.JIRA_API_TOKEN;
        if (process.env.JIRA_PROJECT_KEY) config.projectKey = process.env.JIRA_PROJECT_KEY;
        if (process.env.JIRA_DEFAULT_ASSIGNEE) config.defaultAssignee = process.env.JIRA_DEFAULT_ASSIGNEE;
        if (process.env.JIRA_DEFAULT_PRIORITY) config.defaultPriority = process.env.JIRA_DEFAULT_PRIORITY;

        return config;
    }

    /**
     * Get current configuration
     */
    public getConfig(): JiraConfig {
        return { ...this.config };
    }

    /**
     * Update configuration and save to file
     */
    public updateConfig(updates: Partial<JiraConfig>): void {
        // Update in-memory config
        this.config = { ...this.config, ...updates };

        // Save to file
        this.saveConfig();
    }

    /**
     * Save configuration to file
     */
    private saveConfig(): void {
        const envContent = [
            this.config.url ? `JIRA_URL=${this.config.url}` : '',
            this.config.username ? `JIRA_USERNAME=${this.config.username}` : '',
            this.config.apiToken ? `JIRA_API_TOKEN=${this.config.apiToken}` : '',
            this.config.projectKey ? `JIRA_PROJECT_KEY=${this.config.projectKey}` : '',
            this.config.defaultAssignee ? `JIRA_DEFAULT_ASSIGNEE=${this.config.defaultAssignee}` : '',
            this.config.defaultPriority ? `JIRA_DEFAULT_PRIORITY=${this.config.defaultPriority}` : '',
        ].filter(line => line.length > 0).join('\n');

        fs.writeFileSync(this.configPath, envContent, 'utf8');
    }

    /**
     * Check if configuration is complete
     */
    public isConfigured(): boolean {
        return !!(this.config.url && this.config.username && this.config.apiToken);
    }

    /**
     * Get missing configuration fields
     */
    public getMissingFields(): string[] {
        const missing = [];
        if (!this.config.url) missing.push('JIRA_URL');
        if (!this.config.username) missing.push('JIRA_USERNAME');
        if (!this.config.apiToken) missing.push('JIRA_API_TOKEN');
        return missing;
    }

    /**
     * Get configuration status
     */
    public getStatus(): {
        configured: boolean;
        configPath: string;
        missingFields: string[];
        currentConfig: JiraConfig;
    } {
        return {
            configured: this.isConfigured(),
            configPath: this.configPath,
            missingFields: this.getMissingFields(),
            currentConfig: this.getConfig()
        };
    }

    /**
     * Reset configuration
     */
    public resetConfig(): void {
        this.config = {};
        if (fs.existsSync(this.configPath)) {
            fs.unlinkSync(this.configPath);
        }
    }

    /**
     * Test configuration by making a simple API call
     */
    public async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: `Missing configuration: ${this.getMissingFields().join(', ')}`
            };
        }

        try {
            const axios = require('axios');
            const authBuffer = Buffer.from(`${this.config.username}:${this.config.apiToken}`).toString('base64');
            
            const response = await axios.get(`${this.config.url}/rest/api/2/myself`, {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    Accept: 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                message: `Successfully connected to Jira as ${response.data.displayName}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }
}

// Global instance
export const dynamicConfig = new DynamicJiraConfig();