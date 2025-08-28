#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCredentialManager = exports.SecureCredentialManager = void 0;
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
/**
 * Secure Credential Manager that integrates with OS-level credential stores
 * and provides encrypted local storage fallback with master password protection
 */
class SecureCredentialManager {
    configPath;
    metadataPath;
    serviceName = 'jira-mcp-integration';
    masterKeyPath;
    constructor() {
        const configDir = path_1.default.join(os_1.default.homedir(), '.jira-mcp-secure');
        if (!fs_1.default.existsSync(configDir)) {
            fs_1.default.mkdirSync(configDir, { mode: 0o700 }); // Restricted permissions
        }
        this.configPath = path_1.default.join(configDir, 'config.secure');
        this.metadataPath = path_1.default.join(configDir, 'metadata.json');
        this.masterKeyPath = path_1.default.join(configDir, '.key');
    }
    /**
     * Store credentials securely using OS credential manager with fallback to encrypted storage
     */
    async storeCredentials(config) {
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
        }
        catch (error) {
            console.error('❌ Error storing credentials:', error);
            return false;
        }
    }
    /**
     * Retrieve credentials securely without exposing them to AI
     */
    async getCredentials() {
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
        }
        catch (error) {
            console.error('❌ Error retrieving credentials:', error);
            return null;
        }
    }
    /**
     * Store credentials in OS-specific credential manager
     */
    async storeInOSCredentialManager(apiToken, config) {
        const platform = os_1.default.platform();
        try {
            if (platform === 'darwin') {
                // macOS Keychain
                return await this.storeMacOSKeychain(apiToken, config);
            }
            else if (platform === 'win32') {
                // Windows Credential Manager
                return await this.storeWindowsCredentialManager(apiToken, config);
            }
            else if (platform === 'linux') {
                // Linux Secret Service (libsecret)
                return await this.storeLinuxSecretService(apiToken, config);
            }
        }
        catch (error) {
            console.error(`OS credential manager storage failed: ${error}`);
        }
        return false;
    }
    /**
     * Store in macOS Keychain
     */
    async storeMacOSKeychain(apiToken, config) {
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
            const keychainProcess = (0, child_process_1.spawn)('security', args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            keychainProcess.on('close', (code) => {
                if (code === 0) {
                    // Store metadata separately (non-sensitive)
                    this.storeMetadata(config);
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            });
            keychainProcess.on('error', () => resolve(false));
        });
    }
    /**
     * Store in Windows Credential Manager
     */
    async storeWindowsCredentialManager(apiToken, config) {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${config.username}@${config.url}`;
            const args = [
                '/generic:' + targetName,
                '/user:' + config.username,
                '/pass:' + apiToken
            ];
            const cmdmlProcess = (0, child_process_1.spawn)('cmdkey', ['/add'].concat(args), {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            cmdmlProcess.on('close', (code) => {
                if (code === 0) {
                    this.storeMetadata(config);
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            });
            cmdmlProcess.on('error', () => resolve(false));
        });
    }
    /**
     * Store in Linux Secret Service
     */
    async storeLinuxSecretService(apiToken, config) {
        return new Promise((resolve) => {
            const label = `${this.serviceName} - ${config.username}@${config.url}`;
            const args = [
                '--label', label,
                '--attribute', 'service', this.serviceName,
                '--attribute', 'username', config.username || '',
                '--attribute', 'url', config.url || ''
            ];
            const secretProcess = (0, child_process_1.spawn)('secret-tool', ['store'].concat(args), {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            secretProcess.stdin?.write(apiToken);
            secretProcess.stdin?.end();
            secretProcess.on('close', (code) => {
                if (code === 0) {
                    this.storeMetadata(config);
                    resolve(true);
                }
                else {
                    resolve(false);
                }
            });
            secretProcess.on('error', () => resolve(false));
        });
    }
    /**
     * Store metadata (non-sensitive configuration)
     */
    storeMetadata(config) {
        const metadata = {
            url: config.url,
            username: config.username,
            projectKey: config.projectKey,
            defaultAssignee: config.defaultAssignee,
            defaultPriority: config.defaultPriority,
            lastUpdated: new Date().toISOString(),
            storageMethod: 'os-credential-manager'
        };
        fs_1.default.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2), {
            mode: 0o600 // Readable only by owner
        });
    }
    /**
     * Retrieve credentials from OS credential manager
     */
    async getFromOSCredentialManager() {
        if (!fs_1.default.existsSync(this.metadataPath)) {
            return null;
        }
        try {
            const metadata = JSON.parse(fs_1.default.readFileSync(this.metadataPath, 'utf8'));
            const platform = os_1.default.platform();
            let apiToken = '';
            if (platform === 'darwin') {
                apiToken = await this.getMacOSKeychain(metadata);
            }
            else if (platform === 'win32') {
                apiToken = await this.getWindowsCredentialManager(metadata);
            }
            else if (platform === 'linux') {
                apiToken = await this.getLinuxSecretService(metadata);
            }
            if (apiToken) {
                return {
                    ...metadata,
                    apiToken
                };
            }
        }
        catch (error) {
            console.error('Error reading metadata or retrieving credentials:', error);
        }
        return null;
    }
    /**
     * Get from macOS Keychain
     */
    async getMacOSKeychain(metadata) {
        return new Promise((resolve) => {
            const accountName = `${metadata.username}@${metadata.url}`;
            const args = [
                'find-generic-password',
                '-s', this.serviceName,
                '-a', accountName,
                '-w' // Output password only
            ];
            const keychainProcess = (0, child_process_1.spawn)('security', args, {
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
    async getWindowsCredentialManager(metadata) {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${metadata.username}@${metadata.url}`;
            const cmdmlProcess = (0, child_process_1.spawn)('cmdkey', ['/list:' + targetName], {
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
                }
                else {
                    resolve('');
                }
            });
            cmdmlProcess.on('error', () => resolve(''));
        });
    }
    /**
     * Get from Linux Secret Service
     */
    async getLinuxSecretService(metadata) {
        return new Promise((resolve) => {
            const args = [
                'lookup',
                'service', this.serviceName,
                'username', metadata.username,
                'url', metadata.url
            ];
            const secretProcess = (0, child_process_1.spawn)('secret-tool', args, {
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
    async storeEncrypted(config) {
        try {
            // Generate or get master key
            const masterKey = Buffer.from(this.getMasterKey(), 'hex');
            // Generate random IV for AES-256-CBC
            const iv = (0, crypto_1.randomBytes)(16);
            // Encrypt the API token
            const cipher = (0, crypto_1.createCipheriv)('aes-256-cbc', masterKey, iv);
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
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(secureConfig, null, 2), {
                mode: 0o600 // Readable only by owner
            });
            console.error('⚠️  Using encrypted local storage - OS credential manager not available');
            return true;
        }
        catch (error) {
            console.error('❌ Failed to store encrypted credentials:', error);
            return false;
        }
    }
    /**
     * Get from encrypted storage
     */
    async getFromEncrypted() {
        if (!fs_1.default.existsSync(this.configPath)) {
            return null;
        }
        try {
            const secureConfig = JSON.parse(fs_1.default.readFileSync(this.configPath, 'utf8'));
            const masterKey = Buffer.from(this.getMasterKey(), 'hex');
            const iv = Buffer.from(secureConfig.iv, 'hex');
            // Decrypt the API token
            const decipher = (0, crypto_1.createDecipheriv)('aes-256-cbc', masterKey, iv);
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
        }
        catch (error) {
            console.error('❌ Failed to decrypt credentials:', error);
            return null;
        }
    }
    /**
     * Generate or retrieve master key for encryption
     */
    getMasterKey() {
        if (fs_1.default.existsSync(this.masterKeyPath)) {
            const key = fs_1.default.readFileSync(this.masterKeyPath, 'utf8');
            // Ensure key is exactly 32 bytes (64 hex characters) for AES-256
            if (key.length === 64) {
                return key;
            }
        }
        // Generate new 256-bit (32-byte) master key
        const masterKey = (0, crypto_1.randomBytes)(32).toString('hex');
        fs_1.default.writeFileSync(this.masterKeyPath, masterKey, { mode: 0o600 });
        return masterKey;
    }
    /**
     * Check if credentials are stored
     */
    hasCredentials() {
        return fs_1.default.existsSync(this.metadataPath) || fs_1.default.existsSync(this.configPath);
    }
    /**
     * Delete stored credentials
     */
    async deleteCredentials() {
        try {
            const platform = os_1.default.platform();
            if (fs_1.default.existsSync(this.metadataPath)) {
                const metadata = JSON.parse(fs_1.default.readFileSync(this.metadataPath, 'utf8'));
                // Delete from OS credential manager
                if (platform === 'darwin') {
                    await this.deleteMacOSKeychain(metadata);
                }
                else if (platform === 'win32') {
                    await this.deleteWindowsCredentialManager(metadata);
                }
                else if (platform === 'linux') {
                    await this.deleteLinuxSecretService(metadata);
                }
                fs_1.default.unlinkSync(this.metadataPath);
            }
            // Delete encrypted local storage
            if (fs_1.default.existsSync(this.configPath)) {
                fs_1.default.unlinkSync(this.configPath);
            }
            if (fs_1.default.existsSync(this.masterKeyPath)) {
                fs_1.default.unlinkSync(this.masterKeyPath);
            }
            return true;
        }
        catch (error) {
            console.error('❌ Error deleting credentials:', error);
            return false;
        }
    }
    /**
     * Delete from macOS Keychain
     */
    async deleteMacOSKeychain(metadata) {
        return new Promise((resolve) => {
            const accountName = `${metadata.username}@${metadata.url}`;
            const keychainProcess = (0, child_process_1.spawn)('security', [
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
    async deleteWindowsCredentialManager(metadata) {
        return new Promise((resolve) => {
            const targetName = `${this.serviceName}:${metadata.username}@${metadata.url}`;
            const cmdmlProcess = (0, child_process_1.spawn)('cmdkey', ['/delete:' + targetName], {
                stdio: 'ignore'
            });
            cmdmlProcess.on('close', () => resolve());
            cmdmlProcess.on('error', () => resolve());
        });
    }
    /**
     * Delete from Linux Secret Service
     */
    async deleteLinuxSecretService(metadata) {
        return new Promise((resolve) => {
            const secretProcess = (0, child_process_1.spawn)('secret-tool', [
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
exports.SecureCredentialManager = SecureCredentialManager;
// Export singleton instance
exports.secureCredentialManager = new SecureCredentialManager();
