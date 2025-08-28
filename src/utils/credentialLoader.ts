import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

interface SecureCredentials {
    url: string;
    username: string;
    apiToken: string;
    projectKey?: string;
    defaultAssignee?: string;
    defaultPriority?: string;
}

interface EncryptedConfig {
    url: string;
    username: string;
    apiToken: string;
    projectKey: string;
    defaultAssignee: string;
    defaultPriority: string;
    encrypted: boolean;
    timestamp: string;
}

class CredentialLoader {
    private static instance: CredentialLoader;
    private cachedCredentials: SecureCredentials | null = null;

    private constructor() {}

    public static getInstance(): CredentialLoader {
        if (!CredentialLoader.instance) {
            CredentialLoader.instance = new CredentialLoader();
        }
        return CredentialLoader.instance;
    }

    private generateKey(password: string): Buffer {
        return crypto.pbkdf2Sync(password, 'jira-mcp-salt', 100000, 32, 'sha256');
    }

    private decrypt(encryptedText: string, key: Buffer): string {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    private async tryOSCredentialLoad(): Promise<SecureCredentials | null> {
        // This would integrate with node-keytar or similar for real OS credential loading
        // For now, return null to use encrypted local storage
        return null;
    }

    private loadEncryptedCredentials(): SecureCredentials | null {
        try {
            const configPath = path.join(os.homedir(), '.jira-mcp-secure.json');
            
            if (!fs.existsSync(configPath)) {
                return null;
            }

            const configContent = fs.readFileSync(configPath, 'utf8');
            const config: EncryptedConfig = JSON.parse(configContent);

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
            const systemKey = os.hostname() + os.userInfo().username;
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

        } catch (error) {
            console.error('⚠️  Failed to load encrypted credentials:', (error as Error).message);
            return null;
        }
    }

    private loadLegacyCredentials(): SecureCredentials | null {
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
            const envPath = path.join(os.homedir(), '.jira-mcp.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const envVars: { [key: string]: string } = {};
                
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
        } catch (error) {
            console.error('⚠️  Failed to load legacy credentials:', (error as Error).message);
            return null;
        }
    }

    public async loadCredentials(): Promise<SecureCredentials | null> {
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
        } catch (error) {
            console.error('❌ Failed to load any credentials:', (error as Error).message);
            return null;
        }
    }

    public clearCache(): void {
        this.cachedCredentials = null;
    }

    public hasCredentials(): boolean {
        // Check if any credential source exists
        const secureConfigPath = path.join(os.homedir(), '.jira-mcp-secure.json');
        const legacyEnvPath = path.join(os.homedir(), '.jira-mcp.env');
        
        return (
            fs.existsSync(secureConfigPath) ||
            fs.existsSync(legacyEnvPath) ||
            !!(process.env.JIRA_URL && process.env.JIRA_USERNAME && process.env.JIRA_API_TOKEN)
        );
    }

    public async validateCredentials(): Promise<{ isValid: boolean; error?: string }> {
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
        } catch {
            return {
                isValid: false,
                error: 'Invalid Jira URL in credentials'
            };
        }

        return { isValid: true };
    }

    public getAuthHeader(credentials?: SecureCredentials): string {
        const creds = credentials || this.cachedCredentials;
        if (!creds) {
            throw new Error('No credentials available for authentication');
        }

        return Buffer.from(`${creds.username}:${creds.apiToken}`).toString('base64');
    }

    public async setupEnvironmentVariables(): Promise<void> {
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

export const credentialLoader = CredentialLoader.getInstance();

// Helper functions for backward compatibility
export async function loadSecureCredentials(): Promise<SecureCredentials | null> {
    return credentialLoader.loadCredentials();
}

export function hasStoredCredentials(): boolean {
    return credentialLoader.hasCredentials();
}

export async function validateStoredCredentials(): Promise<{ isValid: boolean; error?: string }> {
    return credentialLoader.validateCredentials();
}

export function getJiraAuthHeader(credentials?: SecureCredentials): string {
    return credentialLoader.getAuthHeader(credentials);
}

export async function setupJiraEnvironment(): Promise<void> {
    return credentialLoader.setupEnvironmentVariables();
}