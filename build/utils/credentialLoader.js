"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialLoader = void 0;
exports.loadSecureCredentials = loadSecureCredentials;
exports.hasStoredCredentials = hasStoredCredentials;
exports.validateStoredCredentials = validateStoredCredentials;
exports.getJiraAuthHeader = getJiraAuthHeader;
exports.setupJiraEnvironment = setupJiraEnvironment;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const crypto_1 = __importDefault(require("crypto"));
class CredentialLoader {
    static instance;
    cachedCredentials = null;
    constructor() { }
    static getInstance() {
        if (!CredentialLoader.instance) {
            CredentialLoader.instance = new CredentialLoader();
        }
        return CredentialLoader.instance;
    }
    generateKey(password) {
        return crypto_1.default.pbkdf2Sync(password, 'jira-mcp-salt', 100000, 32, 'sha256');
    }
    decrypt(encryptedText, key) {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async tryOSCredentialLoad() {
        // This would integrate with node-keytar or similar for real OS credential loading
        // For now, return null to use encrypted local storage
        return null;
    }
    loadEncryptedCredentials() {
        try {
            const configPath = path_1.default.join(os_1.default.homedir(), '.jira-mcp-secure.json');
            if (!fs_1.default.existsSync(configPath)) {
                return null;
            }
            const configContent = fs_1.default.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);
            if (!config.encrypted) {
                // Plain text config (legacy)
                return {
                    url: config.url,
                    username: config.username,
                    apiToken: config.apiToken,
                    projectKey: config.projectKey || undefined,
                    defaultAssignee: config.defaultAssignee || undefined,
                    defaultPriority: config.defaultPriority || 'Medium'
                };
            }
            // Decrypt the API token
            const systemKey = os_1.default.hostname() + os_1.default.userInfo().username;
            const key = this.generateKey(systemKey);
            const decryptedToken = this.decrypt(config.apiToken, key);
            return {
                url: config.url,
                username: config.username,
                apiToken: decryptedToken,
                projectKey: config.projectKey || undefined,
                defaultAssignee: config.defaultAssignee || undefined,
                defaultPriority: config.defaultPriority || 'Medium'
            };
        }
        catch (error) {
            console.error('⚠️  Failed to load encrypted credentials:', error.message);
            return null;
        }
    }
    loadLegacyCredentials() {
        try {
            // Try to load from environment variables first
            if (process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN) {
                return {
                    url: process.env.JIRA_URL,
                    username: process.env.JIRA_USERNAME,
                    apiToken: process.env.JIRA_API_TOKEN,
                    projectKey: process.env.JIRA_PROJECT_KEY,
                    defaultAssignee: process.env.JIRA_DEFAULT_ASSIGNEE,
                    defaultPriority: process.env.JIRA_DEFAULT_PRIORITY || 'Medium'
                };
            }
            // Try to load from legacy .env file
            const envPath = path_1.default.join(os_1.default.homedir(), '.jira-mcp.env');
            if (fs_1.default.existsSync(envPath)) {
                const envContent = fs_1.default.readFileSync(envPath, 'utf8');
                const envVars = {};
                envContent.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const [key, ...valueParts] = trimmed.split('=');
                        if (key && valueParts.length > 0) {
                            envVars[key] = valueParts.join('=');
                        }
                    }
                });
                if (envVars.JIRA_URL && envVars.JIRA_USERNAME && envVars.JIRA_API_TOKEN) {
                    return {
                        url: envVars.JIRA_URL,
                        username: envVars.JIRA_USERNAME,
                        apiToken: envVars.JIRA_API_TOKEN,
                        projectKey: envVars.JIRA_PROJECT_KEY,
                        defaultAssignee: envVars.JIRA_DEFAULT_ASSIGNEE,
                        defaultPriority: envVars.JIRA_DEFAULT_PRIORITY || 'Medium'
                    };
                }
            }
            return null;
        }
        catch (error) {
            console.error('⚠️  Failed to load legacy credentials:', error.message);
            return null;
        }
    }
    async loadCredentials() {
        // Return cached credentials if available
        if (this.cachedCredentials) {
            return this.cachedCredentials;
        }
        try {
            // Try OS credential manager first
            let credentials = await this.tryOSCredentialLoad();
            if (credentials) {
                console.error('✅ Loaded credentials from OS credential manager');
                this.cachedCredentials = credentials;
                return credentials;
            }
            // Try encrypted local storage
            credentials = this.loadEncryptedCredentials();
            if (credentials) {
                console.error('✅ Loaded encrypted credentials from secure storage');
                this.cachedCredentials = credentials;
                return credentials;
            }
            // Fall back to legacy credentials
            credentials = this.loadLegacyCredentials();
            if (credentials) {
                console.error('✅ Loaded credentials from legacy configuration');
                console.error('💡 Consider upgrading to secure storage: atlassianjira-mcp-integration --configure');
                this.cachedCredentials = credentials;
                return credentials;
            }
            return null;
        }
        catch (error) {
            console.error('❌ Failed to load any credentials:', error.message);
            return null;
        }
    }
    clearCache() {
        this.cachedCredentials = null;
    }
    hasCredentials() {
        // Check if any credential source exists
        const secureConfigPath = path_1.default.join(os_1.default.homedir(), '.jira-mcp-secure.json');
        const legacyEnvPath = path_1.default.join(os_1.default.homedir(), '.jira-mcp.env');
        return (fs_1.default.existsSync(secureConfigPath) ||
            fs_1.default.existsSync(legacyEnvPath) ||
            !!(process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN));
    }
    async validateCredentials() {
        const credentials = await this.loadCredentials();
        if (!credentials) {
            return {
                isValid: false,
                error: 'No credentials found. Run: atlassianjira-mcp-integration --configure'
            };
        }
        if (!credentials.url || !credentials.username || !credentials.apiToken) {
            return {
                isValid: false,
                error: 'Incomplete credentials. Run: atlassianjira-mcp-integration --configure'
            };
        }
        try {
            // Basic URL validation
            new URL(credentials.url);
        }
        catch {
            return {
                isValid: false,
                error: 'Invalid Jira URL in credentials'
            };
        }
        return { isValid: true };
    }
    getAuthHeader(credentials) {
        const creds = credentials || this.cachedCredentials;
        if (!creds) {
            throw new Error('No credentials available for authentication');
        }
        return Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64');
    }
    async setupEnvironmentVariables() {
        const credentials = await this.loadCredentials();
        if (credentials) {
            // Set environment variables for compatibility with existing code
            process.env.JIRA_URL = credentials.url;
            process.env.JIRA_USERNAME = credentials.username;
            process.env.JIRA_API_TOKEN = credentials.apiToken;
            process.env.JIRA_PROJECT_KEY = credentials.projectKey || '';
            process.env.JIRA_DEFAULT_ASSIGNEE = credentials.defaultAssignee || '';
            process.env.JIRA_DEFAULT_PRIORITY = credentials.defaultPriority || 'Medium';
        }
    }
}
exports.credentialLoader = CredentialLoader.getInstance();
// Helper functions for backward compatibility
async function loadSecureCredentials() {
    return exports.credentialLoader.loadCredentials();
}
function hasStoredCredentials() {
    return exports.credentialLoader.hasCredentials();
}
async function validateStoredCredentials() {
    return exports.credentialLoader.validateCredentials();
}
function getJiraAuthHeader(credentials) {
    return exports.credentialLoader.getAuthHeader(credentials);
}
async function setupJiraEnvironment() {
    return exports.credentialLoader.setupEnvironmentVariables();
}
