"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraFieldMapper = void 0;
const axios_1 = __importDefault(require("axios"));
class JiraFieldMapper {
    baseUrl;
    userEmail;
    apiToken;
    fields = [];
    fieldCache = new Map();
    constructor(baseUrl, userEmail, apiToken) {
        this.baseUrl = baseUrl;
        this.userEmail = userEmail;
        this.apiToken = apiToken;
    }
    getAuthConfig() {
        const authBuffer = Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64');
        return {
            headers: {
                Authorization: `Basic ${authBuffer}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        };
    }
    async discoverFields() {
        if (this.fields.length > 0)
            return this.fields;
        try {
            const config = this.getAuthConfig();
            const response = await axios_1.default.get(`${this.baseUrl}/rest/api/3/field`, config);
            this.fields = response.data.map((field) => ({
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
        }
        catch (error) {
            console.error('Failed to discover Jira fields:', error.message);
            throw new Error(`Failed to discover Jira fields: ${error.message}`);
        }
    }
    async mapSpreadsheetColumns(columnNames) {
        await this.discoverFields();
        const mapping = {};
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
            console.warn(`Unable to map column: ${columnName}`);
        }
        return mapping;
    }
    isStandardField(columnName) {
        const standardFields = [
            'title', 'summary', 'story title',
            'description', 'desc',
            'priority', 'pri',
            'assignee', 'assigned to',
            'issue type', 'type', 'issuetype'
        ];
        return standardFields.includes(columnName);
    }
    mapStandardField(columnName) {
        const mappings = {
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
    findCustomField(columnName) {
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
    findFieldByNamePattern(patterns) {
        for (const pattern of patterns) {
            const field = Array.from(this.fieldCache.values()).find(f => f.name.toLowerCase().includes(pattern.toLowerCase()));
            if (field)
                return field;
        }
        return null;
    }
    async buildJiraPayload(row, fieldMapping, projectKey) {
        const payload = {
            fields: {
                project: { key: projectKey },
                issuetype: { name: 'Story' }
            }
        };
        const skippedFields = [];
        for (const [columnName, fieldId] of Object.entries(fieldMapping)) {
            if (fieldId === null || !row[columnName])
                continue;
            const value = row[columnName];
            try {
                // Handle standard fields
                if (this.isStandardField(columnName.toLowerCase())) {
                    this.setStandardField(payload, fieldId, value);
                    continue;
                }
                // Handle custom fields
                const field = this.fieldCache.get(fieldId);
                if (field) {
                    this.setCustomField(payload, field, value);
                }
            }
            catch (error) {
                console.warn(`Skipping field ${columnName} (${fieldId}): ${error}`);
                skippedFields.push(columnName);
            }
        }
        return { payload, skippedFields };
    }
    async validateFieldPermissions(fieldMapping, projectKey) {
        const validatedMapping = {};
        // Test field permissions by attempting to get create metadata
        try {
            const config = this.getAuthConfig();
            const response = await axios_1.default.get(`${this.baseUrl}/rest/api/3/issue/createmeta?projectKeys=${projectKey}&issuetypeNames=Story&expand=projects.issuetypes.fields`, config);
            const project = response.data.projects?.find((p) => p.key === projectKey);
            const storyIssueType = project?.issuetypes?.find((it) => it.name === 'Story');
            const availableFields = storyIssueType?.fields || {};
            for (const [columnName, fieldId] of Object.entries(fieldMapping)) {
                if (fieldId === null) {
                    validatedMapping[columnName] = null;
                    continue;
                }
                // Check if field is available for this project and issue type
                if (this.isStandardField(columnName.toLowerCase()) || availableFields[fieldId]) {
                    validatedMapping[columnName] = fieldId;
                }
                else {
                    console.warn(`Field ${columnName} (${fieldId}) is not available for Story creation in project ${projectKey}`);
                    validatedMapping[columnName] = null;
                }
            }
            return validatedMapping;
        }
        catch (error) {
            console.warn('Could not validate field permissions, proceeding with original mapping:', error);
            return fieldMapping;
        }
    }
    setStandardField(payload, fieldId, value) {
        switch (fieldId) {
            case 'summary':
                payload.fields.summary = String(value);
                break;
            case 'description':
                payload.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        { type: 'paragraph', content: [{ type: 'text', text: String(value) }] }
                    ]
                };
                break;
            case 'priority':
                payload.fields.priority = { name: String(value) };
                break;
            case 'assignee':
                payload.fields.assignee = { emailAddress: String(value) };
                break;
            case 'issuetype':
                payload.fields.issuetype = { name: String(value) };
                break;
        }
    }
    setCustomField(payload, field, value) {
        if (!value || value === '')
            return; // Skip empty values
        // Handle different custom field types
        if (field.schema?.type === 'number') {
            payload.fields[field.id] = Number(value);
        }
        else if (field.schema?.type === 'string') {
            payload.fields[field.id] = String(value);
        }
        else if (field.schema?.type === 'array') {
            // Handle different array field types
            if (field.schema?.custom === 'com.pyxis.greenhopper.jira:gh-sprint') {
                // Sprint field - needs special handling
                payload.fields[field.id] = Array.isArray(value) ? value : [String(value)];
            }
            else if (field.id === 'labels') {
                // Labels - split by comma
                const labels = String(value).split(',').map(l => l.trim()).filter(l => l);
                payload.fields[field.id] = labels;
            }
            else if (field.id === 'fixVersions') {
                // Fix versions - needs version objects (skip if version doesn't exist)
                console.warn(`Fix versions requires existing version names. Skipping: ${value}`);
                return; // Skip invalid versions
            }
            else if (field.schema?.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes') {
                // Multi-checkbox fields like Flagged (skip if not valid options)
                console.warn(`Flagged field requires valid option values. Skipping: ${value}`);
                return; // Skip invalid flagged options
            }
            else {
                // Generic array handling
                payload.fields[field.id] = Array.isArray(value) ? value : [String(value)];
            }
        }
        else if (field.schema?.type === 'priority') {
            payload.fields[field.id] = { name: String(value) };
        }
        else if (field.schema?.type === 'user') {
            payload.fields[field.id] = { emailAddress: String(value) };
        }
        else {
            // Default to string representation
            payload.fields[field.id] = String(value);
        }
    }
    getUnmappedColumns(fieldMapping) {
        return Object.entries(fieldMapping)
            .filter(([_, fieldId]) => fieldId === null)
            .map(([columnName, _]) => columnName);
    }
}
exports.JiraFieldMapper = JiraFieldMapper;
