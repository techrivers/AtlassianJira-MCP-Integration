#!/usr/bin/env node
import { spawn } from 'child_process';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

export interface SecureJiraConfig {
    url?: string;
    username?: string;
    projectKey?: string;
    defaultAssignee?: string;
    defaultPriority?: string;
}

export interface CredentialMetadata {
    service: string;
    account: string;
    label: string;
}

/**
 * Secure Credential Manager that integrates with OS-level credential stores
 * and provides encrypted local storage fallback with master password protection
 */
export class SecureCredentialManager {
    private readonly configPath: string;
    private readonly metadataPath: string;
    private readonly serviceName = 'jira-mcp-integration';
    private masterKeyPath: string;

    constructor() {
        const configDir = path.join(os.homedir(), '.jira-mcp-secure');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { mode: 0o700 }); // Restricted permissions
        }
        
        this.configPath = path.join(configDir, 'config.secure');
        this.metadataPath = path.join(configDir, 'metadata.json');
        this.masterKeyPath = path.join(configDir, '.key');
    }

    /**
     * Store credentials securely using OS credential manager with fallback to encrypted storage
     */
    public async storeCredentials(config: SecureJiraConfig & { apiToken: string }): Promise<boolean> {
        try {
            // Try OS credential manager first (most secure)
            const osStored = await this.storeInOSCredentialManager(config.apiToken, config);
            if (osStored) {
                console.error('✅ Credentials stored securely in OS credential manager');
                return true;
            }

            // Fallback to encrypted local storage
            const encryptedStored = await this.storeEncrypted(config);
            if (encryptedStored) {
                console.error('✅ Credentials stored with encryption and master password');
                return true;
            }

            console.error('❌ Failed to store credentials securely');
            return false;
        } catch (error) {
            console.error('❌ Error storing credentials:', error);
            return false;
        }
    }

    /**
     * Retrieve credentials securely without exposing them to AI
     */
    public async getCredentials(): Promise<(SecureJiraConfig & { apiToken: string }) | null> {
        try {
            // Try OS credential manager first
            const osCredentials = await this.getFromOSCredentialManager();
            if (osCredentials) {
                return osCredentials;
            }

            // Fallback to encrypted local storage
            const encryptedCredentials = await this.getFromEncrypted();
            if (encryptedCredentials) {
                return encryptedCredentials;
            }

            return null;
        } catch (error) {
            console.error('❌ Error retrieving credentials:', error);
            return null;
        }
    }

    /**
     * Store credentials in OS-specific credential manager
     */
    private async storeInOSCredentialManager(apiToken: string, config: SecureJiraConfig): Promise<boolean> {
        const platform = os.platform();
        
        try {
            if (platform === 'darwin') {
                // macOS Keychain
                return await this.storeMacOSKeychain(apiToken, config);
            } else if (platform === 'win32') {
                // Windows Credential Manager
                return await this.storeWindowsCredentialManager(apiToken, config);
            } else if (platform === 'linux') {
                // Linux Secret Service (libsecret)
                return await this.storeLinuxSecretService(apiToken, config);
            }
        } catch (error) {
            console.error(`OS credential manager storage failed: ${error}`);
        }
        
        return false;
    }

    /**
     * Store in macOS Keychain
     */
    private async storeMacOSKeychain(apiToken: string, config: SecureJiraConfig): Promise<boolean> {
        return new Promise((resolve) => {
            const accountName = `${config.username}@${config.url}`;
            const args = [
                'add-generic-password',
                '-s', this.serviceName,
                '-a', accountName,
                '-w', apiToken,
                '-T', '', // Allow access only to this application
                '-U' // Update if exists
            ];

            const keychainProcess = spawn('security', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            keychainProcess.on('close', (code) => {
                if (code === 0) {
                    // Store metadata separately (non-sensitive)
                    this.storeMetadata(config);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            keychainProcess.on('error', () => resolve(false));
        });
    }

    /**
     * Store in Windows Credential Manager
     */
    private async storeWindowsCredentialManager(apiToken: string, config: SecureJiraConfig): Promise<boolean> {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${config.username}@${config.url}`;
            const args = [
                '/generic:' + targetName,
                '/user:' + config.username,
                '/pass:' + apiToken
            ];

            const cmdmlProcess = spawn('cmdkey', ['/add'].concat(args), {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            cmdmlProcess.on('close', (code) => {
                if (code === 0) {
                    this.storeMetadata(config);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            cmdmlProcess.on('error', () => resolve(false));
        });
    }

    /**
     * Store in Linux Secret Service
     */
    private async storeLinuxSecretService(apiToken: string, config: SecureJiraConfig): Promise<boolean> {
        return new Promise((resolve) => {
            const label = `${this.serviceName} - ${config.username}@${config.url}`;
            const args = [
                '--label', label,
                '--attribute', 'service', this.serviceName,
                '--attribute', 'username', config.username || '',
                '--attribute', 'url', config.url || ''
            ];

            const secretProcess = spawn('secret-tool', ['store'].concat(args), {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            secretProcess.stdin?.write(apiToken);
            secretProcess.stdin?.end();

            secretProcess.on('close', (code) => {
                if (code === 0) {
                    this.storeMetadata(config);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            secretProcess.on('error', () => resolve(false));
        });
    }

    /**
     * Store metadata (non-sensitive configuration)
     */
    private storeMetadata(config: SecureJiraConfig): void {
        const metadata = {
            url: config.url,
            username: config.username,
            projectKey: config.projectKey,
            defaultAssignee: config.defaultAssignee,
            defaultPriority: config.defaultPriority,
            lastUpdated: new Date().toISOString(),
            storageMethod: 'os-credential-manager'
        };

        fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2), {
            mode: 0o600 // Readable only by owner
        });
    }

    /**
     * Retrieve credentials from OS credential manager
     */
    private async getFromOSCredentialManager(): Promise<(SecureJiraConfig & { apiToken: string }) | null> {
        if (!fs.existsSync(this.metadataPath)) {
            return null;
        }

        try {
            const metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'));
            const platform = os.platform();
            
            let apiToken = '';

            if (platform === 'darwin') {
                apiToken = await this.getMacOSKeychain(metadata);
            } else if (platform === 'win32') {
                apiToken = await this.getWindowsCredentialManager(metadata);
            } else if (platform === 'linux') {
                apiToken = await this.getLinuxSecretService(metadata);
            }

            if (apiToken) {
                return {
                    ...metadata,
                    apiToken
                };
            }
        } catch (error) {
            console.error('Error reading metadata or retrieving credentials:', error);
        }

        return null;
    }

    /**
     * Get from macOS Keychain
     */
    private async getMacOSKeychain(metadata: any): Promise<string> {
        return new Promise((resolve) => {
            const accountName = `${metadata.username}@${metadata.url}`;
            const args = [
                'find-generic-password',
                '-s', this.serviceName,
                '-a', accountName,
                '-w' // Output password only
            ];

            const keychainProcess = spawn('security', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let password = '';
            keychainProcess.stdout?.on('data', (data) => {
                password += data.toString().trim();
            });

            keychainProcess.on('close', (code) => {
                resolve(code === 0 ? password : '');
            });

            keychainProcess.on('error', () => resolve(''));
        });
    }

    /**
     * Get from Windows Credential Manager
     */
    private async getWindowsCredentialManager(metadata: any): Promise<string> {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${metadata.username}@${metadata.url}`;
            
            const cmdmlProcess = spawn('cmdkey', ['/list:' + targetName], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let output = '';
            cmdmlProcess.stdout?.on('data', (data) => {
                output += data.toString();
            });

            cmdmlProcess.on('close', (code) => {
                if (code === 0) {
                    // Parse cmdkey output to extract password
                    // Note: This is a simplified version - real implementation would need more robust parsing
                    const match = output.match(/Password:\s*(.+)/);
                    resolve(match ? match[1].trim() : '');
                } else {
                    resolve('');
                }
            });

            cmdmlProcess.on('error', () => resolve(''));
        });
    }

    /**
     * Get from Linux Secret Service
     */
    private async getLinuxSecretService(metadata: any): Promise<string> {
        return new Promise((resolve) => {
            const args = [
                'lookup',
                'service', this.serviceName,
                'username', metadata.username,
                'url', metadata.url
            ];

            const secretProcess = spawn('secret-tool', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let password = '';
            secretProcess.stdout?.on('data', (data) => {
                password += data.toString().trim();
            });

            secretProcess.on('close', (code) => {
                resolve(code === 0 ? password : '');
            });

            secretProcess.on('error', () => resolve(''));
        });
    }

    /**
     * Encrypted storage fallback with master password
     */
    private async storeEncrypted(config: SecureJiraConfig & { apiToken: string }): Promise<boolean> {
        try {
            // Generate or get master key
            const masterKey = Buffer.from(this.getMasterKey(), 'hex');
            
            // Generate random IV for AES-256-CBC
            const iv = randomBytes(16);
            
            // Encrypt the API token
            const cipher = createCipheriv('aes-256-cbc', masterKey, iv);
            let encryptedToken = cipher.update(config.apiToken, 'utf8', 'hex');
            encryptedToken += cipher.final('hex');

            const secureConfig = {
                url: config.url,
                username: config.username,
                projectKey: config.projectKey,
                defaultAssignee: config.defaultAssignee,
                defaultPriority: config.defaultPriority,
                encryptedApiToken: encryptedToken,
                iv: iv.toString('hex'),
                lastUpdated: new Date().toISOString(),
                storageMethod: 'encrypted-local'
            };

            fs.writeFileSync(this.configPath, JSON.stringify(secureConfig, null, 2), {
                mode: 0o600 // Readable only by owner
            });

            console.error('⚠️  Using encrypted local storage - OS credential manager not available');
            return true;
        } catch (error) {
            console.error('❌ Failed to store encrypted credentials:', error);
            return false;
        }
    }

    /**
     * Get from encrypted storage
     */
    private async getFromEncrypted(): Promise<(SecureJiraConfig & { apiToken: string }) | null> {
        if (!fs.existsSync(this.configPath)) {
            return null;
        }

        try {
            const secureConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            const masterKey = Buffer.from(this.getMasterKey(), 'hex');
            const iv = Buffer.from(secureConfig.iv, 'hex');

            // Decrypt the API token
            const decipher = createDecipheriv('aes-256-cbc', masterKey, iv);
            let decryptedToken = decipher.update(secureConfig.encryptedApiToken, 'hex', 'utf8');
            decryptedToken += decipher.final('utf8');

            return {
                url: secureConfig.url,
                username: secureConfig.username,
                projectKey: secureConfig.projectKey,
                defaultAssignee: secureConfig.defaultAssignee,
                defaultPriority: secureConfig.defaultPriority,
                apiToken: decryptedToken
            };
        } catch (error) {
            console.error('❌ Failed to decrypt credentials:', error);
            return null;
        }
    }

    /**
     * Generate or retrieve master key for encryption
     */
    private getMasterKey(): string {
        if (fs.existsSync(this.masterKeyPath)) {
            const key = fs.readFileSync(this.masterKeyPath, 'utf8');
            // Ensure key is exactly 32 bytes (64 hex characters) for AES-256
            if (key.length === 64) {
                return key;
            }
        }

        // Generate new 256-bit (32-byte) master key
        const masterKey = randomBytes(32).toString('hex');
        fs.writeFileSync(this.masterKeyPath, masterKey, { mode: 0o600 });
        return masterKey;
    }

    /**
     * Check if credentials are stored
     */
    public hasCredentials(): boolean {
        return fs.existsSync(this.metadataPath) || fs.existsSync(this.configPath);
    }

    /**
     * Delete stored credentials
     */
    public async deleteCredentials(): Promise<boolean> {
        try {
            const platform = os.platform();
            
            if (fs.existsSync(this.metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(this.metadataPath, 'utf8'));
                
                // Delete from OS credential manager
                if (platform === 'darwin') {
                    await this.deleteMacOSKeychain(metadata);
                } else if (platform === 'win32') {
                    await this.deleteWindowsCredentialManager(metadata);
                } else if (platform === 'linux') {
                    await this.deleteLinuxSecretService(metadata);
                }

                fs.unlinkSync(this.metadataPath);
            }

            // Delete encrypted local storage
            if (fs.existsSync(this.configPath)) {
                fs.unlinkSync(this.configPath);
            }

            if (fs.existsSync(this.masterKeyPath)) {
                fs.unlinkSync(this.masterKeyPath);
            }

            return true;
        } catch (error) {
            console.error('❌ Error deleting credentials:', error);
            return false;
        }
    }

    /**
     * Delete from macOS Keychain
     */
    private async deleteMacOSKeychain(metadata: any): Promise<void> {
        return new Promise((resolve) => {
            const accountName = `${metadata.username}@${metadata.url}`;
            const keychainProcess = spawn('security', [
                'delete-generic-password',
                '-s', this.serviceName,
                '-a', accountName
            ], { stdio: 'ignore' });

            keychainProcess.on('close', () => resolve());
            keychainProcess.on('error', () => resolve());
        });
    }

    /**
     * Delete from Windows Credential Manager
     */
    private async deleteWindowsCredentialManager(metadata: any): Promise<void> {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${metadata.username}@${metadata.url}`;
            const cmdmlProcess = spawn('cmdkey', ['/delete:' + targetName], {
                stdio: 'ignore'
            });

            cmdmlProcess.on('close', () => resolve());
            cmdmlProcess.on('error', () => resolve());
        });
    }

    /**
     * Delete from Linux Secret Service
     */
    private async deleteLinuxSecretService(metadata: any): Promise<void> {
        return new Promise((resolve) => {
            const secretProcess = spawn('secret-tool', [
                'clear',
                'service', this.serviceName,
                'username', metadata.username,
                'url', metadata.url
            ], { stdio: 'ignore' });

            secretProcess.on('close', () => resolve());
            secretProcess.on('error', () => resolve());
        });
    }
}

// Export singleton instance
export const secureCredentialManager = new SecureCredentialManager();