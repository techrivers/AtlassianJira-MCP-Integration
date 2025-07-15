import { UserStoryRow } from './types';
import { JiraFieldMapper, FieldMapping } from './jiraFieldMapper';
import axios from 'axios';

// Cache for field mapper to avoid repeated API calls
let fieldMapperCache: JiraFieldMapper | null = null;
let fieldMappingCache: FieldMapping | null = null;

export async function createJiraStory(row: UserStoryRow): Promise<{ success: boolean; error?: string }> {
    const JIRA_BASE_URL = process.env.JIRA_URL;
    const JIRA_USER_EMAIL = process.env.JIRA_USERNAME;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'PROJ';

    if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Jira environment variables are not configured. Check your .env file.');
    }

    try {
        // Initialize field mapper if not cached
        if (!fieldMapperCache) {
            fieldMapperCache = new JiraFieldMapper(JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN);
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
        const response = await axios.post(
            `${JIRA_BASE_URL}/rest/api/3/issue`,
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