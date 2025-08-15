import { z } from "zod";
import { dynamicConfig } from "../utils/configManager";

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
    const updates: any = {};
    
    if (url) updates.url = url;
    if (username) updates.username = username;
    if (apiToken) updates.apiToken = apiToken;
    if (projectKey) updates.projectKey = projectKey;
    if (defaultAssignee) updates.defaultAssignee = defaultAssignee;
    if (defaultPriority) updates.defaultPriority = defaultPriority;

    if (Object.keys(updates).length === 0) {
        return {
            success: false,
            message: "No configuration updates provided"
        };
    }

    dynamicConfig.updateConfig(updates);
    const status = dynamicConfig.getStatus();

    return {
        success: true,
        message: "✅ Jira configuration updated successfully",
        updated: Object.keys(updates),
        configured: status.configured,
        missingFields: status.missingFields
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
            : "✅ Your Jira configuration looks complete!"
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
}