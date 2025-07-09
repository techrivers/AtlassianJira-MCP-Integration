import { z } from "zod";
import axios, { AxiosRequestConfig } from "axios";

const AT_BASE_URL = process.env.JIRA_BASE_URL;
const AT_API_TOKEN = process.env.JIRA_API_TOKEN;
const AT_USER_EMAIL = process.env.JIRA_USER_EMAIL;

function getAuthConfig(): AxiosRequestConfig {
    if (!AT_BASE_URL || !AT_API_TOKEN || !AT_USER_EMAIL) {
        throw new Error("Jira environment variables are not configured. Check your .env file.");
    }
    const authBuffer = Buffer.from(`${AT_USER_EMAIL}:${AT_API_TOKEN}`).toString("base64");
    return {
        headers: {
            Authorization: `Basic ${authBuffer}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        },
    };
}

// --- Tool: getTimeline ---
const getTimelineSchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    userId: z.string().optional(),
    projectKey: z.string().optional(),
    issueKey: z.string().optional(),
});
type GetTimelineInput = z.infer<typeof getTimelineSchema>;

async function getTimeline({ dateFrom, dateTo, userId, projectKey, issueKey }: GetTimelineInput) {
    const params: Record<string, string> = {};
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    if (userId) params.user = userId;
    if (projectKey) params.project = projectKey;
    if (issueKey) params.issue = issueKey;
    const config = { ...getAuthConfig(), params };
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline`;
    const response = await axios.get(url, config);
    return response.data;
}

// --- Tool: getResourceInfo ---
const getResourceInfoSchema = z.object({
    resourceId: z.string().optional(),
});
type GetResourceInfoInput = z.infer<typeof getResourceInfoSchema>;

async function getResourceInfo({ resourceId }: GetResourceInfoInput) {
    const config = getAuthConfig();
    const url = resourceId
        ? `${AT_BASE_URL}/rest/activitytimeline/1.0/resources/${resourceId}`
        : `${AT_BASE_URL}/rest/activitytimeline/1.0/resources`;
    const response = await axios.get(url, config);
    return response.data;
}

// --- Tool: addTimeEntry ---
const addTimeEntrySchema = z.object({
    issueKey: z.string(),
    timeSpent: z.string(),
    date: z.string().optional(),
    comment: z.string().optional(),
    activityType: z.string().optional(),
    billableHours: z.number().optional(),
});
type AddTimeEntryInput = z.infer<typeof addTimeEntrySchema>;

async function addTimeEntry({ issueKey, timeSpent, date, comment, activityType, billableHours }: AddTimeEntryInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry`;
    const requestBody: any = {
        issueKey,
        timeSpent,
    };
    
    if (date) requestBody.date = date;
    if (comment) requestBody.comment = comment;
    if (activityType) requestBody.activityType = activityType;
    if (billableHours !== undefined) requestBody.billableHours = billableHours;
    
    const response = await axios.post(url, requestBody, config);
    return response.data;
}

// --- Tool: updateTimeEntry ---
const updateTimeEntrySchema = z.object({
    entryId: z.string(),
    timeSpent: z.string().optional(),
    date: z.string().optional(),
    comment: z.string().optional(),
    activityType: z.string().optional(),
    billableHours: z.number().optional(),
});
type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

async function updateTimeEntry({ entryId, timeSpent, date, comment, activityType, billableHours }: UpdateTimeEntryInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const requestBody: any = {};
    
    if (timeSpent) requestBody.timeSpent = timeSpent;
    if (date) requestBody.date = date;
    if (comment) requestBody.comment = comment;
    if (activityType) requestBody.activityType = activityType;
    if (billableHours !== undefined) requestBody.billableHours = billableHours;
    
    const response = await axios.put(url, requestBody, config);
    return response.data;
}

// --- Tool: deleteTimeEntry ---
const deleteTimeEntrySchema = z.object({
    entryId: z.string(),
});
type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;

async function deleteTimeEntry({ entryId }: DeleteTimeEntryInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const response = await axios.delete(url, config);
    return { success: true, message: `Time entry ${entryId} deleted successfully` };
}

// --- Tool: getTimeEntryDetails ---
const getTimeEntryDetailsSchema = z.object({
    entryId: z.string(),
});
type GetTimeEntryDetailsInput = z.infer<typeof getTimeEntryDetailsSchema>;

async function getTimeEntryDetails({ entryId }: GetTimeEntryDetailsInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const response = await axios.get(url, config);
    return response.data;
}

// --- Tool: getActivityTypes ---
const getActivityTypesSchema = z.object({});
type GetActivityTypesInput = z.infer<typeof getActivityTypesSchema>;

async function getActivityTypes({}: GetActivityTypesInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/activities/types`;
    const response = await axios.get(url, config);
    return response.data;
}

// --- Tool: getTimeReport ---
const getTimeReportSchema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    userId: z.string().optional(),
    projectKey: z.string().optional(),
    issueKey: z.string().optional(),
    format: z.enum(['json', 'csv', 'excel']).optional(),
});
type GetTimeReportInput = z.infer<typeof getTimeReportSchema>;

async function getTimeReport({ dateFrom, dateTo, userId, projectKey, issueKey, format = 'json' }: GetTimeReportInput) {
    const params: Record<string, string> = {};
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    if (userId) params.user = userId;
    if (projectKey) params.project = projectKey;
    if (issueKey) params.issue = issueKey;
    params.format = format;
    
    const config = { ...getAuthConfig(), params };
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/reports/time`;
    const response = await axios.get(url, config);
    return response.data;
}

// --- Tool: bulkImportTimeEntries ---
const bulkImportTimeEntriesSchema = z.object({
    entries: z.array(z.object({
        issueKey: z.string(),
        timeSpent: z.string(),
        date: z.string().optional(),
        comment: z.string().optional(),
        activityType: z.string().optional(),
        billableHours: z.number().optional(),
    })),
});
type BulkImportTimeEntriesInput = z.infer<typeof bulkImportTimeEntriesSchema>;

async function bulkImportTimeEntries({ entries }: BulkImportTimeEntriesInput) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/bulk-import`;
    const requestBody = { entries };
    
    const response = await axios.post(url, requestBody, config);
    return response.data;
}

export function registerActivityTimelineTools(server: unknown) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getTimeline",
        "Get timeline entries from Activity Timeline plugin with filtering options.",
        getTimelineSchema.shape,
        getTimeline
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getResourceInfo",
        "Get resource/user info from Activity Timeline plugin.",
        getResourceInfoSchema.shape,
        getResourceInfo
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "addTimeEntry",
        "Add a new time entry to Activity Timeline for a specific issue.",
        addTimeEntrySchema.shape,
        addTimeEntry
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "updateTimeEntry",
        "Update an existing time entry in Activity Timeline.",
        updateTimeEntrySchema.shape,
        updateTimeEntry
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "deleteTimeEntry",
        "Delete a time entry from Activity Timeline.",
        deleteTimeEntrySchema.shape,
        deleteTimeEntry
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getTimeEntryDetails",
        "Get detailed information about a specific time entry.",
        getTimeEntryDetailsSchema.shape,
        getTimeEntryDetails
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getActivityTypes",
        "Get available activity types for time entries.",
        getActivityTypesSchema.shape,
        getActivityTypes
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "getTimeReport",
        "Generate time reports with filtering and export options.",
        getTimeReportSchema.shape,
        getTimeReport
    );
    
    // @ts-expect-error: server.tool signature is not typed
    server.tool(
        "bulkImportTimeEntries",
        "Bulk import multiple time entries at once.",
        bulkImportTimeEntriesSchema.shape,
        bulkImportTimeEntries
    );
}
