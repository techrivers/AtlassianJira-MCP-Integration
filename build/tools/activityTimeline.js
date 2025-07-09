"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerActivityTimelineTools = registerActivityTimelineTools;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const AT_BASE_URL = process.env.JIRA_BASE_URL;
const AT_API_TOKEN = process.env.JIRA_API_TOKEN;
const AT_USER_EMAIL = process.env.JIRA_USER_EMAIL;
function getAuthConfig() {
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
const getTimelineSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    projectKey: zod_1.z.string().optional(),
    issueKey: zod_1.z.string().optional(),
});
async function getTimeline({ dateFrom, dateTo, userId, projectKey, issueKey }) {
    const params = {};
    if (dateFrom)
        params.from = dateFrom;
    if (dateTo)
        params.to = dateTo;
    if (userId)
        params.user = userId;
    if (projectKey)
        params.project = projectKey;
    if (issueKey)
        params.issue = issueKey;
    const config = { ...getAuthConfig(), params };
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline`;
    const response = await axios_1.default.get(url, config);
    return response.data;
}
// --- Tool: getResourceInfo ---
const getResourceInfoSchema = zod_1.z.object({
    resourceId: zod_1.z.string().optional(),
});
async function getResourceInfo({ resourceId }) {
    const config = getAuthConfig();
    const url = resourceId
        ? `${AT_BASE_URL}/rest/activitytimeline/1.0/resources/${resourceId}`
        : `${AT_BASE_URL}/rest/activitytimeline/1.0/resources`;
    const response = await axios_1.default.get(url, config);
    return response.data;
}
// --- Tool: addTimeEntry ---
const addTimeEntrySchema = zod_1.z.object({
    issueKey: zod_1.z.string(),
    timeSpent: zod_1.z.string(),
    date: zod_1.z.string().optional(),
    comment: zod_1.z.string().optional(),
    activityType: zod_1.z.string().optional(),
    billableHours: zod_1.z.number().optional(),
});
async function addTimeEntry({ issueKey, timeSpent, date, comment, activityType, billableHours }) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry`;
    const requestBody = {
        issueKey,
        timeSpent,
    };
    if (date)
        requestBody.date = date;
    if (comment)
        requestBody.comment = comment;
    if (activityType)
        requestBody.activityType = activityType;
    if (billableHours !== undefined)
        requestBody.billableHours = billableHours;
    const response = await axios_1.default.post(url, requestBody, config);
    return response.data;
}
// --- Tool: updateTimeEntry ---
const updateTimeEntrySchema = zod_1.z.object({
    entryId: zod_1.z.string(),
    timeSpent: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    comment: zod_1.z.string().optional(),
    activityType: zod_1.z.string().optional(),
    billableHours: zod_1.z.number().optional(),
});
async function updateTimeEntry({ entryId, timeSpent, date, comment, activityType, billableHours }) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const requestBody = {};
    if (timeSpent)
        requestBody.timeSpent = timeSpent;
    if (date)
        requestBody.date = date;
    if (comment)
        requestBody.comment = comment;
    if (activityType)
        requestBody.activityType = activityType;
    if (billableHours !== undefined)
        requestBody.billableHours = billableHours;
    const response = await axios_1.default.put(url, requestBody, config);
    return response.data;
}
// --- Tool: deleteTimeEntry ---
const deleteTimeEntrySchema = zod_1.z.object({
    entryId: zod_1.z.string(),
});
async function deleteTimeEntry({ entryId }) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const response = await axios_1.default.delete(url, config);
    return { success: true, message: `Time entry ${entryId} deleted successfully` };
}
// --- Tool: getTimeEntryDetails ---
const getTimeEntryDetailsSchema = zod_1.z.object({
    entryId: zod_1.z.string(),
});
async function getTimeEntryDetails({ entryId }) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/entry/${entryId}`;
    const response = await axios_1.default.get(url, config);
    return response.data;
}
// --- Tool: getActivityTypes ---
const getActivityTypesSchema = zod_1.z.object({});
async function getActivityTypes({}) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/activities/types`;
    const response = await axios_1.default.get(url, config);
    return response.data;
}
// --- Tool: getTimeReport ---
const getTimeReportSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    userId: zod_1.z.string().optional(),
    projectKey: zod_1.z.string().optional(),
    issueKey: zod_1.z.string().optional(),
    format: zod_1.z.enum(['json', 'csv', 'excel']).optional(),
});
async function getTimeReport({ dateFrom, dateTo, userId, projectKey, issueKey, format = 'json' }) {
    const params = {};
    if (dateFrom)
        params.from = dateFrom;
    if (dateTo)
        params.to = dateTo;
    if (userId)
        params.user = userId;
    if (projectKey)
        params.project = projectKey;
    if (issueKey)
        params.issue = issueKey;
    params.format = format;
    const config = { ...getAuthConfig(), params };
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/reports/time`;
    const response = await axios_1.default.get(url, config);
    return response.data;
}
// --- Tool: bulkImportTimeEntries ---
const bulkImportTimeEntriesSchema = zod_1.z.object({
    entries: zod_1.z.array(zod_1.z.object({
        issueKey: zod_1.z.string(),
        timeSpent: zod_1.z.string(),
        date: zod_1.z.string().optional(),
        comment: zod_1.z.string().optional(),
        activityType: zod_1.z.string().optional(),
        billableHours: zod_1.z.number().optional(),
    })),
});
async function bulkImportTimeEntries({ entries }) {
    const config = getAuthConfig();
    const url = `${AT_BASE_URL}/rest/activitytimeline/1.0/timeline/bulk-import`;
    const requestBody = { entries };
    const response = await axios_1.default.post(url, requestBody, config);
    return response.data;
}
function registerActivityTimelineTools(server) {
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getTimeline", "Get timeline entries from Activity Timeline plugin with filtering options.", getTimelineSchema.shape, getTimeline);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getResourceInfo", "Get resource/user info from Activity Timeline plugin.", getResourceInfoSchema.shape, getResourceInfo);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("addTimeEntry", "Add a new time entry to Activity Timeline for a specific issue.", addTimeEntrySchema.shape, addTimeEntry);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("updateTimeEntry", "Update an existing time entry in Activity Timeline.", updateTimeEntrySchema.shape, updateTimeEntry);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("deleteTimeEntry", "Delete a time entry from Activity Timeline.", deleteTimeEntrySchema.shape, deleteTimeEntry);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getTimeEntryDetails", "Get detailed information about a specific time entry.", getTimeEntryDetailsSchema.shape, getTimeEntryDetails);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getActivityTypes", "Get available activity types for time entries.", getActivityTypesSchema.shape, getActivityTypes);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("getTimeReport", "Generate time reports with filtering and export options.", getTimeReportSchema.shape, getTimeReport);
    // @ts-expect-error: server.tool signature is not typed
    server.tool("bulkImportTimeEntries", "Bulk import multiple time entries at once.", bulkImportTimeEntriesSchema.shape, bulkImportTimeEntries);
}
