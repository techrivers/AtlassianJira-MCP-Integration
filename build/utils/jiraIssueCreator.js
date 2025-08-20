"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJiraStory = createJiraStory;
exports.resetFieldMappingCache = resetFieldMappingCache;
const jiraFieldMapper_1 = require("./jiraFieldMapper");
const configManager_1 = require("./configManager");
const axios_1 = __importDefault(require("axios"));
// Cache for field mapper to avoid repeated API calls
let fieldMapperCache = null;
let fieldMappingCache = null;
async function createJiraStory(row) {
    const config = configManager_1.dynamicConfig.getConfig();
    if (!configManager_1.dynamicConfig.isConfigured()) {
        const missing = configManager_1.dynamicConfig.getMissingFields();
        throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
    }
    try {
        // Initialize field mapper if not cached
        if (!fieldMapperCache) {
            fieldMapperCache = new jiraFieldMapper_1.JiraFieldMapper(config.url, config.username, config.apiToken);
        }
        // Get column names from the actual row data
        const actualColumnNames = Object.keys(row);
        // Get field mapping for actual columns
        const initialMapping = await fieldMapperCache.mapSpreadsheetColumns(actualColumnNames);
        const validatedMapping = await fieldMapperCache.validateFieldPermissions(initialMapping, config.projectKey || 'PROJ');
        // Build payload using validated field mapping
        const { payload, skippedFields } = await fieldMapperCache.buildJiraPayload(row, validatedMapping, config.projectKey || 'PROJ');
        // Handle acceptance criteria by appending to description
        if (row.acceptanceCriteria && payload.fields.description) {
            const currentDesc = payload.fields.description.content[0].content[0].text;
            payload.fields.description.content[0].content[0].text =
                `${currentDesc}\n\nAcceptance Criteria:\n${row.acceptanceCriteria}`;
        }
        const authBuffer = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
        const response = await axios_1.default.post(`${config.url}/rest/api/3/issue`, payload, {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        if (response.status === 201) {
            return { success: true };
        }
        else {
            return { success: false, error: `Jira API returned status ${response.status}` };
        }
    }
    catch (err) {
        const errorMessage = err.response?.data?.errors || err.message;
        return { success: false, error: errorMessage };
    }
}
// Function to reset cache (useful for testing or when field configuration changes)
function resetFieldMappingCache() {
    fieldMapperCache = null;
    fieldMappingCache = null;
}
