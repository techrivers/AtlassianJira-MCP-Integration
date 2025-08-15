import axios from 'axios';

export interface JiraField {
    id: string;
    name: string;
    custom: boolean;
    schema?: {
        type: string;
        custom?: string;
    };
}

export interface FieldMapping {
    [columnName: string]: string | null; // null means unmappable
}

export class JiraFieldMapper {
    private fields: JiraField[] = [];
    private fieldCache: Map<string, JiraField> = new Map();
    
    constructor(
        private baseUrl: string,
        private userEmail: string,
        private apiToken: string
    ) {}

    private getAuthConfig() {
        const authBuffer = Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64');
        return {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
        },
        timeout: 10000
        };
    }

    async discoverFields(): Promise<JiraField[]> {
        if (this.fields.length > 0) return this.fields;

        try {
            const config = this.getAuthConfig();
            const response = await axios.get(`${this.baseUrl}/rest/api/3/field`, config);
            
            this.fields = response.data.map((field: any) => ({
                id: field.id,
                name: field.name,
                custom: field.custom || false,
                schema: field.schema
            }));

            // Build cache for faster lookups
            this.fields.forEach(field => {
                this.fieldCache.set(field.name.toLowerCase(), field);
                this.fieldCache.set(field.id, field);
            });

            return this.fields;
        } catch (error: any) {
            throw new Error(`Failed to discover Jira fields: ${error.message}`);
        }
    }

    async mapSpreadsheetColumns(columnNames: string[]): Promise<FieldMapping> {
        await this.discoverFields();
        
        const mapping: FieldMapping = {};
        
        for (const columnName of columnNames) {
            const normalizedColumn = columnName.toLowerCase().trim();
            
            // Direct mapping for standard fields
            if (this.isStandardField(normalizedColumn)) {
                mapping[columnName] = this.mapStandardField(normalizedColumn);
                continue;
            }
            
            // Search for custom fields
            const customField = this.findCustomField(normalizedColumn);
            if (customField) {
                mapping[columnName] = customField.id;
                continue;
            }
            
            // Mark as unmappable but continue processing
            mapping[columnName] = null;
        }
        
        return mapping;
    }

    private isStandardField(columnName: string): boolean {
        const standardFields = [
            'title', 'summary', 'story title',
            'description', 'desc',
            'priority', 'pri',
            'assignee', 'assigned to',
            'issue type', 'type', 'issuetype'
        ];
        return standardFields.includes(columnName);
    }

    private mapStandardField(columnName: string): string {
        const mappings: { [key: string]: string } = {
            'title': 'summary',
            'story title': 'summary',
            'summary': 'summary',
            'description': 'description',
            'desc': 'description',
            'priority': 'priority',
            'pri': 'priority',
            'assignee': 'assignee',
            'assigned to': 'assignee',
            'issue type': 'issuetype',
            'type': 'issuetype',
            'issuetype': 'issuetype'
        };
        return mappings[columnName] || columnName;
    }

    private findCustomField(columnName: string): JiraField | null {
        // Story point field variations
        const storyPointPatterns = [
            'story point', 'story points', 'points', 'estimate', 'story point estimate',
            'sp', 'story_point', 'storypoint', 'storypoints'
        ];
        
        // Sprint field variations
        const sprintPatterns = ['sprint', 'sprints', 'active sprint'];
        
        // Hours field variations
        const hoursPatterns = ['hours', 'frontend hours', 'backend hours', 'qa hours'];
        
        // Flagged field variations
        const flaggedPatterns = ['flagged', 'flag', 'blocked'];
        
        // Version field variations
        const versionPatterns = ['fix version', 'fix versions', 'version', 'versions'];
        
        // QA field variations
        const qaPatterns = ['qa cycle', 'qa', 'cycle'];
        
        // Check story points
        if (storyPointPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern([
                'story point', 'story points', 'estimate', 'points'
            ]);
        }
        
        // Check sprint
        if (sprintPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern(['sprint']);
        }
        
        // Check hours fields
        if (hoursPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern(['hours']);
        }
        
        // Check flagged
        if (flaggedPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern(['flagged']);
        }
        
        // Check versions
        if (versionPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern(['fix version', 'version']);
        }
        
        // Check QA cycle
        if (qaPatterns.some(pattern => columnName.includes(pattern))) {
            return this.findFieldByNamePattern(['qa cycle', 'qa', 'cycle']);
        }
        
        // Generic search by exact name match
        return this.fieldCache.get(columnName) || null;
    }

    private findFieldByNamePattern(patterns: string[]): JiraField | null {
        for (const pattern of patterns) {
            const field = Array.from(this.fieldCache.values()).find(f => 
                f.name.toLowerCase().includes(pattern.toLowerCase())
            );
            if (field) return field;
        }
        return null;
    }

    async buildJiraPayload(row: any, fieldMapping: FieldMapping, projectKey: string): Promise<{payload: any, skippedFields: string[]}> {
        // Get available issue types and use first one as default
        const availableTypes = await this.getAvailableIssueTypes(projectKey);
        const defaultIssueType = availableTypes[0] || 'Task';
        
        const payload: any = {
            fields: {
                project: { key: projectKey },
                issuetype: { name: defaultIssueType }
            }
        };
        
        // Ensure project key is properly set
        if (!projectKey || projectKey.trim() === '') {
            throw new Error('Project key is required');
        }
        
        const skippedFields: string[] = [];
        
        // Add debug info to skipped fields if no available types found
        if (availableTypes.length === 0) {
            skippedFields.push(`Warning: No issue types found for project ${projectKey}, using fallback: ${defaultIssueType}`);
        }

        // Check if row has issue type column and validate it
        const issueTypeColumn = Object.keys(row).find(key => 
            key.toLowerCase().includes('issue type') || 
            key.toLowerCase().includes('type') ||
            key.toLowerCase().includes('issuetype')
        );
        
        if (issueTypeColumn && row[issueTypeColumn]) {
            const requestedType = String(row[issueTypeColumn]).trim();
            
            if (availableTypes.includes(requestedType)) {
                payload.fields.issuetype = { name: requestedType };
            } else {
                // Use first available type instead of requested invalid type
                const defaultType = availableTypes[0] || 'Task';
                payload.fields.issuetype = { name: defaultType };
                skippedFields.push(`${issueTypeColumn} (invalid type: ${requestedType}, using: ${defaultType})`);
            }
        } else {
            // If no issue type column found, ensure we use a valid default
            payload.fields.issuetype = { name: defaultIssueType };
        }

        for (const [columnName, fieldId] of Object.entries(fieldMapping)) {
            if (fieldId === null || !row[columnName]) continue;

            const value = row[columnName];
            
            try {
                // Skip project field from spreadsheet - use env variable instead
                if (columnName.toLowerCase().includes('project')) {
                    continue;
                }
                
                // Handle standard fields - but skip issuetype as it's handled above
                if (this.isStandardField(columnName.toLowerCase())) {
                    if (fieldId === 'issuetype') {
                        continue; // Skip - already handled with fallback logic above
                    }
                    this.setStandardField(payload, fieldId, value);
                    continue;
                }
                
                // Handle custom fields
                const field = this.fieldCache.get(fieldId);
                if (field) {
                    this.setCustomField(payload, field, value);
                }
            } catch (error) {
                skippedFields.push(columnName);
            }
        }

        return { payload, skippedFields };
    }

    async validateFieldPermissions(fieldMapping: FieldMapping, projectKey: string, issueTypeName: string = 'Story'): Promise<FieldMapping> {
        const validatedMapping: FieldMapping = {};
        
        // Test field permissions by attempting to get create metadata
        try {
            const config = this.getAuthConfig();
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes.fields`,
                config
            );
            
            const project = response.data.projects?.find((p: any) => p.key === projectKey);
            if (!project) {
                throw new Error(`Project ${projectKey} not found or not accessible`);
            }
            
            // Get available issue types for better error messages
            const availableIssueTypes = project.issuetypes?.map((it: any) => it.name) || [];
            
            const targetIssueType = project.issuetypes?.find((it: any) => it.name === issueTypeName);
            if (!targetIssueType) {
                // Fall back to first available issue type
                const fallbackIssueType = project.issuetypes?.[0];
                if (fallbackIssueType) {
                    return this.validateFieldPermissions(fieldMapping, projectKey, fallbackIssueType.name);
                }
                throw new Error(`No valid issue types found for project ${projectKey}`);
            }
            
            const availableFields = targetIssueType.fields || {};
            
            for (const [columnName, fieldId] of Object.entries(fieldMapping)) {
                if (fieldId === null) {
                    validatedMapping[columnName] = null;
                    continue;
                }
                
                // Check if field is available for this project and issue type
                if (availableFields[fieldId]) {
                    validatedMapping[columnName] = fieldId;
                } else {
                    validatedMapping[columnName] = null;
                }
            }
            
            return validatedMapping;
        } catch (error) {
            return fieldMapping;
        }
    }

    async getAvailableIssueTypes(projectKey: string): Promise<string[]> {
        try {
            const config = this.getAuthConfig();
            const response = await axios.get(
                `${this.baseUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`,
                config
            );
            
            const project = response.data.projects?.find((p: any) => p.key === projectKey);
            return project?.issuetypes?.map((it: any) => it.name) || [];
        } catch (error) {
            return ['Task', 'Epic', 'Subtask']; // Default fallback based on your Jira
        }
    }

    private setStandardField(payload: any, fieldId: string, value: any): void {
        // Sanitize value for standard fields too
        let sanitizedValue = value;
        if (typeof value === 'string') {
            sanitizedValue = value.replace(/^["']|["']$/g, '').trim();
        }
        
        switch (fieldId) {
            case 'summary':
                payload.fields.summary = String(sanitizedValue);
                break;
            case 'description':
                payload.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        { type: 'paragraph', content: [{ type: 'text', text: String(sanitizedValue) }] }
                    ]
                };
                break;
            case 'priority':
                payload.fields.priority = { name: String(sanitizedValue) };
                break;
            case 'assignee':
                payload.fields.assignee = { emailAddress: String(sanitizedValue) };
                break;
            case 'issuetype':
                payload.fields.issuetype = { name: String(sanitizedValue) };
                break;
        }
    }

    private setCustomField(payload: any, field: JiraField, value: any): void {
        if (!value || value === '') return; // Skip empty values
        
        // Sanitize value - handle potential JSON strings and special characters
        let sanitizedValue = value;
        if (typeof value === 'string') {
            // Clean up potential JSON parsing issues
            sanitizedValue = value.replace(/^["']|["']$/g, '').trim();
        }
        
        // Handle different custom field types with error handling
        try {
            if (field.schema?.type === 'number') {
                const numValue = Number(sanitizedValue);
                if (isNaN(numValue)) {
                    return;
                }
                payload.fields[field.id] = numValue;
            } else if (field.schema?.type === 'string') {
                payload.fields[field.id] = String(sanitizedValue);
            } else if (field.schema?.type === 'array') {
                // Handle different array field types
                if (field.schema?.custom === 'com.pyxis.greenhopper.jira:gh-sprint') {
                    // Sprint field - needs special handling
                    payload.fields[field.id] = Array.isArray(sanitizedValue) ? sanitizedValue : [String(sanitizedValue)];
                } else if (field.id === 'labels') {
                    // Labels - split by comma and handle special characters
                    const labels = String(sanitizedValue).split(',').map(l => l.trim()).filter(l => l);
                    payload.fields[field.id] = labels;
                } else if (field.id === 'fixVersions') {
                    // Fix versions - needs version objects (skip if version doesn't exist)
                    return; // Skip invalid versions
                } else if (field.schema?.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes') {
                    // Multi-checkbox fields like Flagged (skip if not valid options)
                    return; // Skip invalid flagged options
                } else {
                    // Generic array handling
                    payload.fields[field.id] = Array.isArray(sanitizedValue) ? sanitizedValue : [String(sanitizedValue)];
                }
            } else if (field.schema?.type === 'priority') {
                payload.fields[field.id] = { name: String(sanitizedValue) };
            } else if (field.schema?.type === 'user') {
                payload.fields[field.id] = { emailAddress: String(sanitizedValue) };
            } else {
                // Default to string representation
                payload.fields[field.id] = String(sanitizedValue);
            }
        } catch (error) {
            // Continue processing other fields rather than failing completely
        }
    }

    getUnmappedColumns(fieldMapping: FieldMapping): string[] {
        return Object.entries(fieldMapping)
            .filter(([_, fieldId]) => fieldId === null)
            .map(([columnName, _]) => columnName);
    }
}