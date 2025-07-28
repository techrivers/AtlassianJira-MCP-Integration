#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupJiraConfig() {
  console.log('🚀 Welcome to Jira Activity Timeline MCP Server Setup!\n');
  
  const configPath = path.join(os.homedir(), '.jira-mcp.env');
  
  // Check if config exists
  if (fs.existsSync(configPath)) {
    const overwrite = await question('Configuration already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
  }
  
  console.log('Please provide your Jira configuration:\n');
  
  const jiraUrl = await question('Jira URL (e.g., https://your-company.atlassian.net): ');
  const username = await question('Username (your email): ');
  const apiToken = await question('API Token (get from https://id.atlassian.com/manage-profile/security/api-tokens): ');
  const projectKey = await question('Default Project Key (optional): ');
  
  const config = `# Jira Configuration
JIRA_URL=${jiraUrl}
JIRA_USERNAME=${username}
JIRA_API_TOKEN=${apiToken}
JIRA_PROJECT_KEY=${projectKey}
JIRA_DEFAULT_PRIORITY=Medium
JIRA_ACTIVITY_TIMELINE_ENABLED=true
`;
  
  fs.writeFileSync(configPath, config);
  console.log(`\n✅ Configuration saved to ${configPath}`);
  console.log('\n🎉 Setup complete! Your Jira MCP server is ready to use.');
  console.log('\nRestart Claude Desktop to use the tools.');
  
  rl.close();
}

if (process.argv.includes('--setup')) {
  setupJiraConfig().catch(console.error);
} else {
  // Start the main server
  require('../build/index.js');
}
