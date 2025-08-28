import { z } from "zod";
import { dynamicConfig } from "../utils/configManager";
import { runSecureCLIConfiguration } from "../cli/secureConfigure";
import { secureCredentialManager } from "../utils/secureCredentialManager";

// --- Tool: getJiraConfiguration ---
const getJiraConfigurationSchema = z.object({});
type GetJiraConfigurationInput = z.infer<typeof getJiraConfigurationSchema>;

async function getJiraConfiguration({}: GetJiraConfigurationInput) {
    const status = dynamicConfig.getStatus();
    
    // Mask sensitive data
    const maskedConfig = {
        ...status.currentConfig,
        apiToken: status.currentConfig.apiToken ? '***masked***' : undefined
    };

    return {
        configured: status.configured,
        configPath: status.configPath,
        missingFields: status.missingFields,
        currentConfig: maskedConfig,
        message: status.configured 
            ? "✅ Jira configuration is complete and ready to use"
            : `❌ Jira configuration incomplete. Missing: ${status.missingFields.join(', ')}`
    };
}

// --- Tool: updateJiraConfiguration ---
const updateJiraConfigurationSchema = z.object({
    url: z.string().url().refine(v => v.startsWith('https://'), 'Only https:// URLs are allowed for Jira').optional(),
    username: z.string().email().optional(),
    apiToken: z.string().optional(),
    projectKey: z.string().optional(),
    defaultAssignee: z.string().email().optional(),
    defaultPriority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest']).optional(),
});
type UpdateJiraConfigurationInput = z.infer<typeof updateJiraConfigurationSchema>;

async function updateJiraConfiguration({ 
    url, 
    username, 
    apiToken, 
    projectKey, 
    defaultAssignee, 
    defaultPriority 
}: UpdateJiraConfigurationInput) {
    // SECURITY ENHANCEMENT: Block API token updates through conversation
    if (apiToken) {
        return {
            success: false,
            message: "🔐 Security Policy: API tokens cannot be set through conversation for security reasons. Please use the secure CLI configuration tool: 'npx atlassianjira-mcp-integration --configure'"
        };
    }

    const updates: any = {};
    
    if (url) updates.url = url;
    if (username) updates.username = username;
    if (projectKey) updates.projectKey = projectKey;
    if (defaultAssignee) updates.defaultAssignee = defaultAssignee;
    if (defaultPriority) updates.defaultPriority = defaultPriority;

    if (Object.keys(updates).length === 0) {
        return {
            success: false,
            message: "No configuration updates provided. Note: API tokens must be configured using the secure CLI tool."
        };
    }

    dynamicConfig.updateConfig(updates);
    const status = dynamicConfig.getStatus();

    return {
        success: true,
        message: "✅ Jira configuration updated successfully (non-sensitive fields only)",
        updated: Object.keys(updates),
        configured: status.configured,
        missingFields: status.missingFields,
        securityNote: "🔐 API token must be configured using: npx atlassianjira-mcp-integration --configure"
    };
}

// --- Tool: testJiraConnection ---
const testJiraConnectionSchema = z.object({});
type TestJiraConnectionInput = z.infer<typeof testJiraConnectionSchema>;

async function testJiraConnection({}: TestJiraConnectionInput) {
    const result = await dynamicConfig.testConnection();
    
    return {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
    };
}

// --- Tool: resetJiraConfiguration ---
const resetJiraConfigurationSchema = z.object({
    confirm: z.boolean().default(false)
});
type ResetJiraConfigurationInput = z.infer<typeof resetJiraConfigurationSchema>;

async function resetJiraConfiguration({ confirm }: ResetJiraConfigurationInput) {
    if (!confirm) {
        return {
            success: false,
            message: "❌ Reset cancelled. Set 'confirm: true' to proceed with reset."
        };
    }

    dynamicConfig.resetConfig();

    return {
        success: true,
        message: "✅ Jira configuration has been reset. All settings cleared."
    };
}

// --- Tool: suggestJiraConfiguration ---
const suggestJiraConfigurationSchema = z.object({
    domain: z.string().optional()
});
type SuggestJiraConfigurationInput = z.infer<typeof suggestJiraConfigurationSchema>;

async function suggestJiraConfiguration({ domain }: SuggestJiraConfigurationInput) {
    const status = dynamicConfig.getStatus();
    const suggestions = [];

    if (!status.currentConfig.url) {
        if (domain) {
            suggestions.push({
                field: 'url',
                suggestion: `https://${domain}.atlassian.net`,
                reason: 'Standard Atlassian Cloud URL format'
            });
        } else {
            suggestions.push({
                field: 'url',
                suggestion: 'https://your-company.atlassian.net',
                reason: 'Replace "your-company" with your actual Jira domain'
            });
        }
    }

    if (!status.currentConfig.username) {
        suggestions.push({
            field: 'username',
            suggestion: 'your-email@company.com',
            reason: 'Use your Jira account email address'
        });
    }

    if (!status.currentConfig.apiToken) {
        suggestions.push({
            field: 'apiToken',
            suggestion: 'Generate from: https://id.atlassian.com/manage-profile/security/api-tokens',
            reason: 'Required for API authentication'
        });
    }

    if (!status.currentConfig.projectKey) {
        suggestions.push({
            field: 'projectKey',
            suggestion: 'Find in Jira project settings (e.g., "PROJ", "DEV")',
            reason: 'Sets default project for task creation'
        });
    }

    return {
        configured: status.configured,
        suggestions: suggestions,
        message: suggestions.length > 0 
            ? `Here are ${suggestions.length} configuration suggestions to improve your setup:`
            : "✅ Your Jira configuration looks complete!",
        securityNote: "🔐 For secure credential setup, use: npx atlassianjira-mcp-integration --configure"
    };
}

// --- Tool: startSecureConfiguration ---
const startSecureConfigurationSchema = z.object({});
type StartSecureConfigurationInput = z.infer<typeof startSecureConfigurationSchema>;

async function startSecureConfiguration({}: StartSecureConfigurationInput) {
    return {
        success: false,
        message: "🔐 Secure Configuration Required",
        instructions: [
            "🛡️ SECURITY POLICY: Jira API tokens cannot be configured through AI conversations.",
            "",
            "✅ SECURE SETUP PROCESS:",
            "1. Open a new terminal/command prompt",
            "2. Run: npx @techrivers/atlassianjira-mcp-integration --configure",
            "3. The secure CLI tool will guide you through credential setup",
            "4. Your API token input will be completely hidden",
            "5. Connection will be tested before storing credentials",
            "6. Return to this conversation once setup is complete",
            "",
            "🔒 SECURITY GUARANTEES:",
            "• API tokens NEVER visible to AI systems",
            "• Stored in OS credential managers (Keychain/Credential Manager/Secret Service)",
            "• AES-256 encrypted fallback storage with random IVs",
            "• File permissions restricted to owner only",
            "• Secure master key generation",
            "",
            "🎯 WHAT YOU'LL NEED:",
            "• Jira URL: https://your-company.atlassian.net",
            "• Email: your-email@company.com",
            "• API Token: From https://id.atlassian.com/manage-profile/security/api-tokens",
            "",
            "📋 OPTIONAL SETTINGS:",
            "• Project Key (default project for new tickets)",
            "• Default Assignee",
            "• Default Priority",
            "",
            "⚡ QUICK START:",
            "Copy this command → npx @techrivers/atlassianjira-mcp-integration --configure"
        ],
        alternativeMethod: {
            title: "Environment Variables (Less Secure)",
            warning: "⚠️ This method exposes credentials in config files",
            variables: ["JIRA_URL", "JIRA_USERNAME", "JIRA_API_TOKEN"],
            recommendation: "Use the secure CLI tool instead for production environments"
        },
        securityFeatures: [
            "Cross-platform OS credential storage",
            "AES-256 encrypted local storage fallback", 
            "Hidden input for sensitive data",
            "Connection testing before storage",
            "Restricted file permissions",
            "AI conversation safety"
        ]
    };
}

// --- Tool: checkSecureCredentials ---
const checkSecureCredentialsSchema = z.object({});
type CheckSecureCredentialsInput = z.infer<typeof checkSecureCredentialsSchema>;

async function checkSecureCredentials({}: CheckSecureCredentialsInput) {
    const hasSecure = secureCredentialManager.hasCredentials();
    const status = dynamicConfig.getStatus();
    
    const securityLevel = hasSecure ? "MAXIMUM" : status.configured ? "BASIC" : "NONE";
    const storageMethod = hasSecure ? "OS Credential Manager + Encrypted Fallback" : 
                         status.configured ? "Legacy File Storage" : "Not Configured";
    
    return {
        securityLevel,
        storageMethod,
        secureCredentialsFound: hasSecure,
        legacyConfigFound: status.configured,
        configured: hasSecure || status.configured,
        
        recommendation: hasSecure 
            ? "✅ EXCELLENT: Maximum security configuration active"
            : status.configured 
                ? "⚠️ UPGRADE RECOMMENDED: Legacy storage detected - migrate to secure storage"
                : "❌ SETUP REQUIRED: No Jira credentials configured",
                
        detailedStatus: {
            secureStorage: {
                osCredentialManager: hasSecure,
                encryptedFallback: hasSecure,
                platforms: "macOS Keychain, Windows Credential Manager, Linux Secret Service"
            },
            security: {
                aiSafe: true,
                tokenMasking: true,
                encryptionLevel: hasSecure ? "AES-256-CBC with random IVs" : "None",
                filePermissions: hasSecure ? "Owner-only (chmod 600)" : status.configured ? "Standard" : "N/A"
            },
            compliance: {
                industryStandard: hasSecure,
                zeroKnowledgeAI: true,
                auditTrail: hasSecure
            }
        },
        
        nextSteps: hasSecure ? [
            "✅ Your Jira integration is optimally secured",
            "🔄 Consider periodic API token rotation",
            "📊 Monitor usage through Jira audit logs"
        ] : status.configured ? [
            "🔧 Run: npx @techrivers/atlassianjira-mcp-integration --configure",
            "📈 Upgrade to secure credential storage",
            "🗑️ Legacy credentials will be safely migrated"
        ] : [
            "🚀 Run: npx @techrivers/atlassianjira-mcp-integration --configure", 
            "📋 Have your Jira URL, email, and API token ready",
            "🔒 Follow the secure prompts to complete setup"
        ],
        
        quickActions: {
            configureSecure: "npx @techrivers/atlassianjira-mcp-integration --configure",
            testConnection: "Available after configuration",
            viewDocumentation: "See SECURE_SETUP.md for detailed guide"
        }
    };
}

export function registerConfigurationTools(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getJiraConfiguration",
        "Get current Jira configuration status and settings (sensitive data masked).",
        getJiraConfigurationSchema.shape,
        getJiraConfiguration
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "updateJiraConfiguration",
        "Update Jira configuration settings. Supports partial updates.",
        updateJiraConfigurationSchema.shape,
        updateJiraConfiguration
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "testJiraConnection",
        "Test the current Jira configuration by making a connection to the API.",
        testJiraConnectionSchema.shape,
        testJiraConnection
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "resetJiraConfiguration",
        "Reset all Jira configuration settings. Requires confirmation.",
        resetJiraConfigurationSchema.shape,
        resetJiraConfiguration
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "suggestJiraConfiguration",
        "Get intelligent suggestions for improving your Jira configuration.",
        suggestJiraConfigurationSchema.shape,
        suggestJiraConfiguration
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "startSecureConfiguration",
        "Get instructions for secure Jira credential configuration (outside AI conversation).",
        startSecureConfigurationSchema.shape,
        startSecureConfiguration
    );

    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "checkSecureCredentials",
        "Check the status of secure credential storage and get security recommendations.",
        checkSecureCredentialsSchema.shape,
        checkSecureCredentials
    );
}