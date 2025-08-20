"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigurationTools = registerConfigurationTools;
const zod_1 = require("zod");
const configManager_1 = require("../utils/configManager");
// --- Tool: getJiraConfiguration ---
const getJiraConfigurationSchema = zod_1.z.object({});
async function getJiraConfiguration({}) {
    const status = configManager_1.dynamicConfig.getStatus();
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
const updateJiraConfigurationSchema = zod_1.z.object({
    url: zod_1.z.string().url().refine(v => v.startsWith('https://'), 'Only https:// URLs are allowed for Jira').optional(),
    username: zod_1.z.string().email().optional(),
    apiToken: zod_1.z.string().optional(),
    projectKey: zod_1.z.string().optional(),
    defaultAssignee: zod_1.z.string().email().optional(),
    defaultPriority: zod_1.z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest']).optional(),
});
async function updateJiraConfiguration({ url, username, apiToken, projectKey, defaultAssignee, defaultPriority }) {
    const updates = {};
    if (url)
        updates.url = url;
    if (username)
        updates.username = username;
    if (apiToken)
        updates.apiToken = apiToken;
    if (projectKey)
        updates.projectKey = projectKey;
    if (defaultAssignee)
        updates.defaultAssignee = defaultAssignee;
    if (defaultPriority)
        updates.defaultPriority = defaultPriority;
    if (Object.keys(updates).length === 0) {
        return {
            success: false,
            message: "No configuration updates provided"
        };
    }
    configManager_1.dynamicConfig.updateConfig(updates);
    const status = configManager_1.dynamicConfig.getStatus();
    return {
        success: true,
        message: "✅ Jira configuration updated successfully",
        updated: Object.keys(updates),
        configured: status.configured,
        missingFields: status.missingFields
    };
}
// --- Tool: testJiraConnection ---
const testJiraConnectionSchema = zod_1.z.object({});
async function testJiraConnection({}) {
    const result = await configManager_1.dynamicConfig.testConnection();
    return {
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString()
    };
}
// --- Tool: resetJiraConfiguration ---
const resetJiraConfigurationSchema = zod_1.z.object({
    confirm: zod_1.z.boolean().default(false)
});
async function resetJiraConfiguration({ confirm }) {
    if (!confirm) {
        return {
            success: false,
            message: "❌ Reset cancelled. Set 'confirm: true' to proceed with reset."
        };
    }
    configManager_1.dynamicConfig.resetConfig();
    return {
        success: true,
        message: "✅ Jira configuration has been reset. All settings cleared."
    };
}
// --- Tool: suggestJiraConfiguration ---
const suggestJiraConfigurationSchema = zod_1.z.object({
    domain: zod_1.z.string().optional()
});
async function suggestJiraConfiguration({ domain }) {
    const status = configManager_1.dynamicConfig.getStatus();
    const suggestions = [];
    if (!status.currentConfig.url) {
        if (domain) {
            suggestions.push({
                field: 'url',
                suggestion: `https://${domain}.atlassian.net`,
                reason: 'Standard Atlassian Cloud URL format'
            });
        }
        else {
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
function registerConfigurationTools(server) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getJiraConfiguration", "Get current Jira configuration status and settings (sensitive data masked).", getJiraConfigurationSchema.shape, getJiraConfiguration);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("updateJiraConfiguration", "Update Jira configuration settings. Supports partial updates.", updateJiraConfigurationSchema.shape, updateJiraConfiguration);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("testJiraConnection", "Test the current Jira configuration by making a connection to the API.", testJiraConnectionSchema.shape, testJiraConnection);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("resetJiraConfiguration", "Reset all Jira configuration settings. Requires confirmation.", resetJiraConfigurationSchema.shape, resetJiraConfiguration);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("suggestJiraConfiguration", "Get intelligent suggestions for improving your Jira configuration.", suggestJiraConfigurationSchema.shape, suggestJiraConfiguration);
}
