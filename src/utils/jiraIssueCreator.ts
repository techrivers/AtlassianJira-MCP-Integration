import { UserStoryRow } from './types';
import { JiraFieldMapper, FieldMapping } from './jiraFieldMapper';
import { dynamicConfig } from './configManager';
import axios from 'axios';

// Cache for field mapper to avoid repeated API calls
let fieldMapperCache: JiraFieldMapper | null = null;
let fieldMappingCache: FieldMapping | null = null;

export async function createJiraStory(row: UserStoryRow): Promise<{ success: boolean; error?: string }> {
    const config = dynamicConfig.getConfig();
    if (!dynamicConfig.isConfigured()) {
        const missing = dynamicConfig.getMissingFields();
        throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
    }

    try {
        // Initialize field mapper if not cached
        if (!fieldMapperCache) {
            fieldMapperCache = new JiraFieldMapper(config.url!, config.username!, config.apiToken!);
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
        const response = await axios.post(
            `${config.url}/rest/api/3/issue`,
            payload,
            {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.status === 201) {
            return { success: true };
        } else {
            return { success: false, error: `Jira API returned status ${response.status}` };
        }
    } catch (err: any) {
        const errorMessage = err.response?.data?.errors || err.message;
        return { success: false, error: errorMessage };
    }
}

// Function to reset cache (useful for testing or when field configuration changes)
export function resetFieldMappingCache(): void {
    fieldMapperCache = null;
    fieldMappingCache = null;
} 