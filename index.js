#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");

// Configure dotenv
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const server = new Server(
  {
    name: "jira-activitytimeline-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "logTime",
        description: "Logs a work entry to a specific Jira issue.",
        inputSchema: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description:
                "The Jira issue key to log work against (e.g., 'PROJ-123').",
            },
            timeSpent: {
              type: "string",
              description:
                "The amount of time spent, in Jira's format (e.g., '2h' or '30m').",
            },
            comment: {
              type: "string",
              description:
                "A description of the work, including billable status (e.g., 'Fixed the login flow. Billable: Yes').",
            },
            started: {
              type: "string",
              description:
                "Optional start date/time in ISO 8601 format. Defaults to now.",
            },
          },
          required: ["issueKey", "timeSpent"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "logTime") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const { issueKey, timeSpent, comment, started } = args;
  const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;

  if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
    throw new Error(
      "Jira environment variables are not configured. Check your .env file."
    );
  }

  const jiraUrl = `${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/worklog`;

  const requestBody = {
    timeSpent: timeSpent,
  };

  if (comment) {
    requestBody.comment = {
      type: "doc",
      version: 1,
      content: [
        { type: "paragraph", content: [{ type: "text", text: comment }] },
      ],
    };
  }

  if (started) {
    requestBody.started = started;
  }

  const authBuffer = Buffer.from(
    `${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`
  ).toString("base64");
  const config = {
    headers: {
      Authorization: `Basic ${authBuffer}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios.post(jiraUrl, requestBody, config);
    return {
      content: [
        {
          type: "text",
          text: `Successfully logged ${timeSpent} to issue ${issueKey}. Worklog ID: ${response.data.id}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error.response?.data?.errorMessages?.join(", ") ||
      error.response?.data?.message ||
      error.message ||
      "An unknown error occurred.";

    console.error("Error logging time to Jira:", errorMessage);
    throw new Error(`Failed to log work: ${errorMessage}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with the protocol
  console.error("Jira MCP Server started successfully");
}

// Handle errors and exit gracefully
process.on("SIGINT", async () => {
  console.error("Shutting down server...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
