"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJiraStory = createJiraStory;
exports.resetFieldMappingCache = resetFieldMappingCache;
const jiraFieldMapper_1 = require("./jiraFieldMapper");
const axios_1 = __importDefault(require("axios"));
// Cache for field mapper to avoid repeated API calls
let fieldMapperCache = null;
let fieldMappingCache = null;
async function createJiraStory(row) {
    const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
    const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'PROJ';
    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Jira environment variables are not configured. Check your .env file.');
    }
    try {
        // Initialize field mapper if not cached
        if (!fieldMapperCache) {
            fieldMapperCache = new jiraFieldMapper_1.JiraFieldMapper(JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN);
        }
        // Get column names from the actual row data
        const actualColumnNames = Object.keys(row);
        // Get field mapping for actual columns
        const initialMapping = await fieldMapperCache.mapSpreadsheetColumns(actualColumnNames);
        const validatedMapping = await fieldMapperCache.validateFieldPermissions(initialMapping, JIRA_PROJECT_KEY);
        console.log('Row field mapping:', validatedMapping);
        // Build payload using validated field mapping
        const { payload, skippedFields } = await fieldMapperCache.buildJiraPayload(row, validatedMapping, JIRA_PROJECT_KEY);
        if (skippedFields.length > 0) {
            console.log(`Skipped fields for this story: ${skippedFields.join(', ')}`);
        }
        // Handle acceptance criteria by appending to description
        if (row.acceptanceCriteria && payload.fields.description) {
            const currentDesc = payload.fields.description.content[0].content[0].text;
            payload.fields.description.content[0].content[0].text =
                `${currentDesc}\n\nAcceptance Criteria:\n${row.acceptanceCriteria}`;
        }
        const authBuffer = Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
        const response = await axios_1.default.post(`${JIRA_BASE_URL}/rest/api/3/issue`, payload, {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
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
