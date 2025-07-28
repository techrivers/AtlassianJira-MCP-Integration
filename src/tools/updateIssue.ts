import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";
import { JiraFieldMapper } from '../utils/jiraFieldMapper';
import { dynamicConfig } from "../utils/configManager";

// --- Interfaces for Jira API responses ---
interface JiraIssueResponse {
    id: string;
    key: string;
    self: string;
    fields: any;
    [key: string]: any;
}

interface JiraTransition {
    id: string;
    name: string;
    to: {
        name: string;
        id: string;
    };
}

// --- Helper function for making Jira API requests ---
async function makeJiraRequest<T>(url: string, data: any, config: AxiosRequestConfig, method: 'PUT' | 'POST' | 'GET' = 'PUT'): Promise<T> {
    try {
        let response;
        if (method === 'GET') {
            response = await axios.get(url, config);
        } else if (method === 'POST') {
            response = await axios.post(url, data, config);
        } else {
            response = await axios.put(url, data, config);
        }
        return response.data as T;
    } catch (error: any) {
        const errorMessage =
            error.response?.data?.errorMessages?.join(", ") ||
            error.response?.data?.errors ? 
                Object.entries(error.response.data.errors).map(([field, msg]) => `${field}: ${msg}`).join(", ") :
            error.message ||
            "An unknown error occurred.";
        console.error("Error making Jira request:", errorMessage);
        console.error("Full error response:", JSON.stringify(error.response?.data, null, 2));
        throw new Error(`Failed to update issue: ${errorMessage}`);
    }
}

const updateIssueSchema = z.object({
    issueKey: z.string().describe("The issue key to update (e.g., 'JM-1', 'PROJ-123')."),
    
    // Basic field updates
    summary: z.string().optional().describe("Update the issue summary/title."),
    description: z.string().optional().describe("Update the issue description."),
    priority: z.string().optional().describe("Update the priority (e.g., 'High', 'Medium', 'Low')."),
    assignee: z.string().optional().describe("Update the assignee email or username."),
    
    // Status transition
    transitionTo: z.string().optional().describe("Transition issue to this status (e.g., 'In Progress', 'Done')."),
    
    // Labels and components
    labels: z.array(z.string()).optional().describe("Update labels (replaces existing labels)."),
    addLabels: z.array(z.string()).optional().describe("Add these labels to existing ones."),
    removeLabels: z.array(z.string()).optional().describe("Remove these labels from existing ones."),
    
    // Custom fields
    storyPointEstimate: z.number().optional().describe("Update story point estimate."),
    acceptanceCriteria: z.string().optional().describe("Update acceptance criteria."),
    frontendHours: z.number().optional().describe("Update estimated frontend hours."),
    backendHours: z.number().optional().describe("Update estimated backend hours."),
    qaHours: z.number().optional().describe("Update estimated QA hours."),
    qaCycle: z.number().optional().describe("Update QA cycle number."),
    sprint: z.string().optional().describe("Update sprint assignment."),
    fixVersions: z.array(z.string()).optional().describe("Update fix versions."),
    
    // Comment to add during update
    comment: z.string().optional().describe("Add a comment during the update."),
    
    // Additional custom fields
    customFields: z.record(z.any()).optional().describe("Additional custom fields as key-value pairs."),
    
    // Notification control
    notifyUsers: z.boolean().optional().default(true).describe("Whether to notify users of the update.")
});

type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export function registerUpdateIssueTool(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "updateIssue",
        "Updates an existing Jira issue with new field values, status transitions, and more.",
        updateIssueSchema.shape,
        async (input: UpdateIssueInput) => {
            const config = dynamicConfig.getConfig();
            if (!dynamicConfig.isConfigured()) {
                const missing = dynamicConfig.getMissingFields();
                throw new Error(`❌ Jira configuration incomplete. Missing: ${missing.join(', ')}. Use the 'updateJiraConfiguration' tool to set up your Jira connection.`);
            }

            const {
                issueKey,
                transitionTo,
                comment,
                notifyUsers,
                labels,
                addLabels,
                removeLabels,
                customFields,
                ...otherFields
            } = input;

            const authBuffer = Buffer.from(`${config.username}:${config.apiToken}`).toString("base64");
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    Authorization: `Basic ${authBuffer}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            };

            let updatedFields: string[] = [];
            let skippedFields: string[] = [];

            // Handle status transition first if requested
            if (transitionTo) {
                try {
                    await handleStatusTransition(issueKey, transitionTo, comment, config, axiosConfig);
                    updatedFields.push(`status → ${transitionTo}`);
                } catch (error: any) {
                    skippedFields.push(`status transition: ${error.message}`);
                }
            }

            // Handle field updates
            const hasFieldUpdates = Object.keys(otherFields).some(key => otherFields[key as keyof typeof otherFields] !== undefined) || 
                                  labels || addLabels || removeLabels || customFields;

            if (hasFieldUpdates) {
                try {
                    const fieldUpdateResult = await handleFieldUpdates(
                        issueKey, 
                        otherFields, 
                        labels, 
                        addLabels, 
                        removeLabels, 
                        customFields, 
                        config, 
                        axiosConfig
                    );
                    updatedFields.push(...fieldUpdateResult.updated);
                    skippedFields.push(...fieldUpdateResult.skipped);
                } catch (error: any) {
                    skippedFields.push(`field updates: ${error.message}`);
                }
            }

            // Add comment if provided (and not already added during transition)
            if (comment && !transitionTo) {
                try {
                    await addCommentToIssue(issueKey, comment, config, axiosConfig);
                    updatedFields.push("comment added");
                } catch (error: any) {
                    skippedFields.push(`comment: ${error.message}`);
                }
            }

            const successMessage = updatedFields.length > 0 
                ? `Successfully updated ${issueKey}: ${updatedFields.join(', ')}`
                : `No changes applied to ${issueKey}`;

            const skippedMessage = skippedFields.length > 0 
                ? ` (${skippedFields.length} operations failed: ${skippedFields.join(', ')})`
                : '';

            return {
                content: [
                    {
                        type: "text",
                        text: successMessage + skippedMessage,
                    },
                ],
                metadata: {
                    issueKey,
                    updatedFields,
                    skippedFields,
                    notificationsSent: notifyUsers
                },
            };
        }
    );
}

async function handleStatusTransition(
    issueKey: string, 
    targetStatus: string, 
    comment: string | undefined, 
    config: any, 
    axiosConfig: AxiosRequestConfig
): Promise<void> {
    // Get available transitions
    const transitionsUrl = `${config.url}/rest/api/3/issue/${issueKey}/transitions`;
    const transitions = await makeJiraRequest<{transitions: JiraTransition[]}>(
        transitionsUrl, 
        {}, 
        axiosConfig, 
        'GET'
    );

    // Find matching transition
    const transition = transitions.transitions.find(t => 
        t.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );

    if (!transition) {
        const availableTransitions = transitions.transitions.map(t => t.name).join(', ');
        throw new Error(`Status '${targetStatus}' not available. Available transitions: ${availableTransitions}`);
    }

    // Execute transition
    const transitionPayload: any = {
        transition: { id: transition.id }
    };

    if (comment) {
        transitionPayload.update = {
            comment: [
                {
                    add: {
                        body: {
                            type: 'doc',
                            version: 1,
                            content: [
                                { type: 'paragraph', content: [{ type: 'text', text: comment }] }
                            ]
                        }
                    }
                }
            ]
        };
    }

    await makeJiraRequest(transitionsUrl, transitionPayload, axiosConfig, 'POST');
}

async function handleFieldUpdates(
    issueKey: string,
    fields: any,
    labels: string[] | undefined,
    addLabels: string[] | undefined,
    removeLabels: string[] | undefined,
    customFields: Record<string, any> | undefined,
    config: any,
    axiosConfig: AxiosRequestConfig
): Promise<{updated: string[], skipped: string[]}> {
    // Get current issue to handle label operations
    let currentIssue: JiraIssueResponse | null = null;
    if (addLabels || removeLabels) {
        const issueUrl = `${config.url}/rest/api/3/issue/${issueKey}?fields=labels`;
        currentIssue = await makeJiraRequest<JiraIssueResponse>(issueUrl, {}, axiosConfig, 'GET');
    }

    // Build field mapping using existing JiraFieldMapper
    const fieldMapper = new JiraFieldMapper(config.url!, config.username!, config.apiToken!);
    
    // Create mock row data for field mapping
    const mockRow: Record<string, any> = {};
    
    // Add basic fields
    if (fields.summary) mockRow['Summary'] = fields.summary;
    if (fields.description) mockRow['Description'] = fields.description;
    if (fields.priority) mockRow['Priority'] = fields.priority;
    if (fields.assignee) mockRow['Assignee'] = fields.assignee;
    
    // Add custom fields
    if (fields.storyPointEstimate) mockRow['Story Point Estimate'] = fields.storyPointEstimate;
    if (fields.acceptanceCriteria) mockRow['Acceptance Criteria'] = fields.acceptanceCriteria;
    if (fields.frontendHours) mockRow['Frontend Hours'] = fields.frontendHours;
    if (fields.backendHours) mockRow['Backend Hours'] = fields.backendHours;
    if (fields.qaHours) mockRow['QA Hours'] = fields.qaHours;
    if (fields.qaCycle) mockRow['QA Cycle'] = fields.qaCycle;
    if (fields.sprint) mockRow['Sprint'] = fields.sprint;
    if (fields.fixVersions) mockRow['Fix Versions'] = fields.fixVersions;
    
    // Add custom fields
    if (customFields) {
        Object.assign(mockRow, customFields);
    }

    // Handle labels
    if (labels) {
        mockRow['Labels'] = labels;
    } else if (addLabels || removeLabels) {
        const currentLabels = currentIssue?.fields?.labels || [];
        let updatedLabels = [...currentLabels];
        
        if (addLabels) {
            updatedLabels = [...new Set([...updatedLabels, ...addLabels])];
        }
        
        if (removeLabels) {
            updatedLabels = updatedLabels.filter(label => !removeLabels.includes(label));
        }
        
        mockRow['Labels'] = updatedLabels;
    }

    // If no fields to update, return early
    if (Object.keys(mockRow).length === 0) {
        return { updated: [], skipped: [] };
    }

    // Extract project key from issue key
    const projectKey = issueKey.split('-')[0];
    
    // Map fields and build payload
    const columnNames = Object.keys(mockRow);
    const fieldMapping = await fieldMapper.mapSpreadsheetColumns(columnNames);
    const validatedMapping = await fieldMapper.validateFieldPermissions(fieldMapping, projectKey);
    
    const { payload, skippedFields } = await fieldMapper.buildJiraPayload(mockRow, validatedMapping, projectKey);
    
    // Remove project and issuetype from update payload (not needed for updates)
    delete payload.fields.project;
    delete payload.fields.issuetype;

    // If no valid fields to update, return
    if (Object.keys(payload.fields).length === 0) {
        return { updated: [], skipped: skippedFields };
    }

    // Execute field update
    const updateUrl = `${config.url}/rest/api/3/issue/${issueKey}`;
    await makeJiraRequest(updateUrl, payload, axiosConfig, 'PUT');

    const updatedFieldNames = Object.keys(payload.fields);
    return { 
        updated: updatedFieldNames, 
        skipped: skippedFields 
    };
}

async function addCommentToIssue(
    issueKey: string,
    comment: string,
    config: any,
    axiosConfig: AxiosRequestConfig
): Promise<void> {
    const commentUrl = `${config.url}/rest/api/3/issue/${issueKey}/comment`;
    const commentPayload = {
        body: {
            type: 'doc',
            version: 1,
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: comment }] }
            ]
        }
    };

    await makeJiraRequest(commentUrl, commentPayload, axiosConfig, 'POST');
}