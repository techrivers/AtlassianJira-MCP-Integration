"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicConfig = exports.DynamicJiraConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const dotenv_1 = __importDefault(require("dotenv"));
class DynamicJiraConfig {
    configPath;
    config;
    constructor() {
        this.configPath = path_1.default.join(os_1.default.homedir(), '.jira-mcp.env');
        this.config = this.loadConfig();
    }
    /**
     * Load configuration from file and environment variables
     */
    loadConfig() {
        const config = {};
        // Try to load from file first
        if (fs_1.default.existsSync(this.configPath)) {
            const envConfig = dotenv_1.default.parse(fs_1.default.readFileSync(this.configPath, 'utf8'));
            config.url = envConfig.JIRA_URL;
            config.username = envConfig.JIRA_USERNAME;
            config.apiToken = envConfig.JIRA_API_TOKEN;
            config.projectKey = envConfig.JIRA_PROJECT_KEY;
            config.defaultAssignee = envConfig.JIRA_DEFAULT_ASSIGNEE;
            config.defaultPriority = envConfig.JIRA_DEFAULT_PRIORITY;
        }
        // Override with environment variables if they exist
        if (process.env.JIRA_URL)
            config.url = process.env.JIRA_URL;
        if (process.env.JIRA_USERNAME)
            config.username = process.env.JIRA_USERNAME;
        if (process.env.JIRA_API_TOKEN)
            config.apiToken = process.env.JIRA_API_TOKEN;
        if (process.env.JIRA_PROJECT_KEY)
            config.projectKey = process.env.JIRA_PROJECT_KEY;
        if (process.env.JIRA_DEFAULT_ASSIGNEE)
            config.defaultAssignee = process.env.JIRA_DEFAULT_ASSIGNEE;
        if (process.env.JIRA_DEFAULT_PRIORITY)
            config.defaultPriority = process.env.JIRA_DEFAULT_PRIORITY;
        return config;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration and save to file
     */
    updateConfig(updates) {
        // Update in-memory config
        this.config = { ...this.config, ...updates };
        // Save to file
        this.saveConfig();
    }
    /**
     * Save configuration to file
     */
    saveConfig() {
        const envContent = [
            this.config.url ? `JIRA_URL=${this.config.url}` : '',
            this.config.username ? `JIRA_USERNAME=${this.config.username}` : '',
            this.config.apiToken ? `JIRA_API_TOKEN=${this.config.apiToken}` : '',
            this.config.projectKey ? `JIRA_PROJECT_KEY=${this.config.projectKey}` : '',
            this.config.defaultAssignee ? `JIRA_DEFAULT_ASSIGNEE=${this.config.defaultAssignee}` : '',
            this.config.defaultPriority ? `JIRA_DEFAULT_PRIORITY=${this.config.defaultPriority}` : '',
        ].filter(line => line.length > 0).join('\n');
        fs_1.default.writeFileSync(this.configPath, envContent, 'utf8');
    }
    /**
     * Check if configuration is complete
     */
    isConfigured() {
        return !!(this.config.url && this.config.username && this.config.apiToken);
    }
    /**
     * Get missing configuration fields
     */
    getMissingFields() {
        const missing = [];
        if (!this.config.url)
            missing.push('JIRA_URL');
        if (!this.config.username)
            missing.push('JIRA_USERNAME');
        if (!this.config.apiToken)
            missing.push('JIRA_API_TOKEN');
        return missing;
    }
    /**
     * Get configuration status
     */
    getStatus() {
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
    resetConfig() {
        this.config = {};
        if (fs_1.default.existsSync(this.configPath)) {
            fs_1.default.unlinkSync(this.configPath);
        }
    }
    /**
     * Test configuration by making a simple API call
     */
    async testConnection() {
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
        }
        catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`
            };
        }
    }
}
exports.DynamicJiraConfig = DynamicJiraConfig;
// Global instance
exports.dynamicConfig = new DynamicJiraConfig();
