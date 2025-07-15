# 🚀 Jira Activity Timeline MCP Server - Complete Setup Guide

A comprehensive MCP server for Jira integration with Slack automation, time tracking, and work summaries.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Slack Integration](#slack-integration)
5. [Available Tools](#available-tools)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Jira account with API access
- Slack workspace (optional but recommended)

### Basic Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Build and start
npm run build
npm start
```

---

## 📦 Installation

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd jira-activitytimeline-server
npm install
```

### Step 2: Environment Configuration
Create `.env` file with required variables:

```env
# Required - Jira Configuration
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=YOUR-PROJECT

# Optional - Jira Defaults
JIRA_DEFAULT_ASSIGNEE=team-lead@company.com
JIRA_DEFAULT_PRIORITY=Medium
JIRA_ACTIVITY_TIMELINE_ENABLED=true

# Optional - Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_DEFAULT_CHANNEL=#general
```

### Step 3: Get Jira API Token
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token to your `.env` file

---

## 🔧 Configuration

### Jira Setup
The server requires these minimum Jira permissions:
- **Browse Projects** - View project issues
- **Work on Issues** - Log time and add comments
- **Create Issues** - Create new tasks (optional)

### MCP Client Configuration
Add to your MCP client config:

```json
{
  "mcpServers": {
    "jira-activitytimeline": {
      "command": "node",
      "args": ["/path/to/jira-activitytimeline-server/build/index.js"],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

---

## 💬 Slack Integration

### Step 1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `jira_mcp` (or your preference)
4. Select your workspace

### Step 2: Configure Bot Permissions
**OAuth & Permissions → Bot Token Scopes:**
```
app_mentions:read      - Read when bot is mentioned
channels:history       - Read channel messages
channels:read          - View basic channel info
chat:write            - Send messages as bot
chat:write.public     - Send messages to channels
im:history            - Read direct messages
im:write              - Send direct messages
users:read            - View workspace members
```

### Step 3: Set Up Webhook (For Interactive Features)

**Install ngrok:**
```bash
# macOS
brew install ngrok
# Or download from https://ngrok.com/

# Authenticate
ngrok config add-authtoken YOUR_TOKEN
```

**Start webhook server:**
```bash
# Terminal 1: Start webhook server
node slack-webhook-server.js

# Terminal 2: Expose with ngrok
ngrok http 3000
```

**Configure Slack App:**
1. **Event Subscriptions:**
   - Enable Events: ON
   - Request URL: `https://your-ngrok-url.ngrok.io/slack/events`
   - Bot Events: `app_mention`, `message.channels`, `message.im`

2. **Interactivity & Shortcuts:**
   - Interactivity: ON  
   - Request URL: `https://your-ngrok-url.ngrok.io/slack/interactive`

3. **Reinstall App** after configuration changes

### Step 4: Test Slack Integration
```bash
# Test bot credentials
node test-suite.js --slack-only

# Test interactive features
# Send DM to bot: "help"
# Mention bot in channel: "@jira_mcp help"
```

---

## 🛠️ Available Tools

### Core Jira Tools
- **`logTime`** - Log work time to Jira issues
- **`createTask`** - Create new Jira tasks
- **`getTimeline`** - Get activity timeline from Jira
- **`getTimeReport`** - Generate time reports
- **`sheetToJiraStories`** - Bulk import from spreadsheets

### Summary Generation
- **`generateDailySummary`** - Daily work summary
- **`generateWeeklySummary`** - Weekly work summary  
- **`generateMonthlySummary`** - Monthly work summary

### Slack Integration
- **`sendTimeLogNotification`** - Send time log alerts
- **`sendSummaryToSlack`** - Share summaries in Slack
- **`sendSlackReminder`** - Send reminder messages
- **`getSlackUserInfo`** - Look up user information
- **`sendSlackDirectMessage`** - Send direct messages
- **`createSlackChannel`** - Create new channels

### Interactive Slack Features
- **`handleSlackMessage`** - Process incoming messages
- **`sendInteractiveReminder`** - Send interactive reminders
- **`handleButtonInteraction`** - Handle button clicks
- **`scheduleReminder`** - Schedule automatic reminders

---

## 🧪 Testing

### Comprehensive Test Suite
```bash
# Run all tests
node test-suite.js

# Individual test categories
node test-suite.js --jira-only      # Test Jira connection
node test-suite.js --slack-only     # Test Slack connection
node test-suite.js --webhook-only   # Test webhook server
node test-suite.js --build-only     # Test MCP build
```

### Manual Testing
```bash
# Test MCP server
npm run build
npm start

# Test Slack webhook (if configured)
curl -X POST https://your-ngrok-url.ngrok.io/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

### Slack Command Testing
**Direct Message Commands:**
```
help                                    # Show available commands
log 2h on PROJ-123 for environment setup   # Log time to issue
summary                                 # Get work summary
```

**Channel Mentions:**
```
@jira_mcp help                         # Show help in channel
@jira_mcp log 1h on PROJ-456 for testing  # Log time via mention
@jira_mcp summary                      # Get summary in channel
```

---

## 🔍 Troubleshooting

### Common Issues

#### "Authentication failed" (Jira)
- ✅ Check JIRA_URL format: `https://company.atlassian.net`
- ✅ Verify API token is correct
- ✅ Ensure username is email address
- ✅ Test with: `node test-suite.js --jira-only`

#### "Bot not responding" (Slack)
- ✅ Check bot token starts with `xoxb-`
- ✅ Verify webhook server is running: `curl localhost:3000/health`
- ✅ Ensure ngrok tunnel is active
- ✅ Check Slack app has correct permissions
- ✅ Reinstall Slack app after permission changes

#### "Infinite loop" (Slack Messages)
- ✅ Webhook server filters bot messages automatically
- ✅ If still occurring, restart webhook server: `pkill -f slack-webhook-server.js`

#### "MCP tools not available"
- ✅ Build project: `npm run build`
- ✅ Check MCP client configuration
- ✅ Verify all environment variables are set

### Debug Mode
Enable verbose logging:
```bash
DEBUG=* npm start                    # Enable all debug logs
DEBUG=jira:* npm start              # Enable Jira-specific logs
DEBUG=slack:* node slack-webhook-server.js  # Enable Slack logs
```

### Log Files
- **MCP Server:** Check console output where server is running
- **Webhook Server:** Check terminal running `slack-webhook-server.js`
- **Ngrok:** Check `ngrok.log` or ngrok dashboard at http://localhost:4040

---

## 📚 Additional Resources

### Configuration Files
- **`.env.example`** - Environment variable template
- **`package.json`** - Project dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`slack-webhook-server.js`** - Standalone Slack webhook server

### Scripts
- **`npm run build`** - Compile TypeScript to JavaScript
- **`npm start`** - Build and start MCP server
- **`npm run dev`** - Development mode with auto-reload
- **`node test-suite.js`** - Comprehensive testing
- **`node slack-webhook-server.js`** - Start Slack webhook server

### Architecture
```
src/
├── index.ts                    # Main MCP server entry point
├── tools/                      # MCP tool implementations
│   ├── activityTimeline.ts     # Jira timeline tools
│   ├── createTask.ts           # Task creation
│   ├── logTime.ts              # Time logging
│   ├── sheetToJiraStories.ts   # Bulk import
│   ├── slackIntegration/       # Slack tools
│   └── summaryGenerator/       # Summary generation
└── utils/                      # Shared utilities
    ├── jiraIssueCreator.ts     # Jira API helpers
    └── types.ts                # TypeScript definitions
```

---

## 🎯 Next Steps

1. **Basic Setup:** Follow Quick Start guide
2. **Jira Integration:** Configure API access and test connection
3. **Slack Setup:** Create bot and configure webhooks (optional)
4. **MCP Client:** Add server to your MCP client configuration
5. **Testing:** Run test suite to verify everything works
6. **Customization:** Modify tools for your specific workflow

**Need help?** Check the troubleshooting section or create an issue in the repository.

---

*Generated by Jira Activity Timeline MCP Server v1.0.0*