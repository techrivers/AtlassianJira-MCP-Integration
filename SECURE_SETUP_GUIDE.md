# 🔐 Secure Credential Setup Guide

## Enterprise-Grade Security for Jira MCP Integration

This guide walks you through the secure credential configuration process that keeps your API tokens completely hidden from AI systems while providing seamless integration with Claude.

## 🎯 Quick Start (Recommended Path)

### Step 1: Add MCP Server to Claude Desktop (No Credentials)

Add this configuration to your Claude Desktop settings (no credentials needed):

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"],
      "env": {
        "MCP_MODE": "true"
      }
    }
  }
}
```

### Step 2: Run Secure Configuration

Open your terminal and run:

```bash
npx -y github:techrivers/AtlassianJira-MCP-Integration --configure
```

This launches the **Secure Jira Configuration Tool** with enterprise-grade security features.

## 🛡️ Security Architecture

### Why This Approach is Secure

1. **Hidden Input**: API tokens are never displayed on screen during entry
2. **Pre-Storage Validation**: Credentials are tested against Jira before storage
3. **Encrypted Storage**: API tokens encrypted with AES-256 before local storage
4. **OS Integration**: Uses your operating system's credential manager when available
5. **Zero AI Exposure**: Claude/AI never sees your actual credentials
6. **Restricted File Permissions**: Configuration files protected with 600 permissions

### Storage Hierarchy

The system tries storage methods in this priority order:

1. **OS Credential Managers** (Future Enhancement)
   - macOS: Keychain Access
   - Windows: Credential Manager
   - Linux: Secret Service (libsecret)

2. **AES-256 Encrypted Local Storage** (Current)
   - API tokens encrypted with system-specific keys
   - Stored in `~/.jira-mcp-secure.json`
   - File permissions set to 600 (owner only)

3. **Legacy Environment Files** (Compatibility)
   - Plain text storage in `~/.jira-mcp.env`
   - Only for backward compatibility

## 📋 Step-by-Step User Experience

### Welcome and Security Briefing

```
================================================================================
🔐 SECURE JIRA CONFIGURATION TOOL
   Enterprise-Grade Credential Management for MCP Integration
================================================================================

📋 SECURITY FEATURES:
   ✅ API tokens are never displayed on screen
   ✅ Credentials stored in OS credential managers when available
   ✅ AES-256 encryption fallback for secure local storage
   ✅ Connection validation before saving
   ✅ Zero exposure to AI systems or logs

💡 WHY THIS IS SECURE:
   • Your API tokens are INPUT with hidden characters
   • Credentials are VALIDATED against Jira before storage
   • Storage uses your OS keychain/credential manager
   • If OS storage fails, AES-256 encrypted local fallback
   • Claude/AI never sees your actual credentials

⚠️  IMPORTANT: Keep your Jira API token secure!
   Get your token from: https://id.atlassian.com/manage-profile/security/api-tokens
```

### Step 1: Jira Instance URL

```
────────────────────────────────────────────────────────────────
📍 STEP 1: JIRA INSTANCE URL
────────────────────────────────────────────────────────────────
Enter your Jira instance URL (where you access Jira in your browser)
Examples: https://mycompany.atlassian.net, https://jira.mycompany.com

🔗 Jira URL: _
```

**Input Validation:**
- Automatically adds `https://` if missing
- Validates URL format
- Warns if URL doesn't appear to be a typical Jira instance
- Provides helpful error messages and suggestions

### Step 2: Username/Email

```
────────────────────────────────────────────────────────────────
📍 STEP 2: USERNAME / EMAIL
────────────────────────────────────────────────────────────────
Enter the email address you use to log into Jira

👤 Username/Email: _
```

**Input Validation:**
- Validates email format
- Provides clear error messages
- Suggestions for common mistakes

### Step 3: API Token (Secure Input)

```
────────────────────────────────────────────────────────────────
📍 STEP 3: API TOKEN (SECURE INPUT)
────────────────────────────────────────────────────────────────
🔐 Your API token will be hidden as you type for security
📋 Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens
💡 Create a new token with a descriptive name like "Claude MCP Integration"

🔑 API Token (hidden): _
```

**Security Features:**
- Input is completely hidden (no asterisks or dots)
- Token validation for minimum length
- Clear instructions for token generation
- Helpful suggestions if validation fails

### Step 4: Optional Settings

```
────────────────────────────────────────────────────────────────
📍 STEP 4: OPTIONAL SETTINGS
────────────────────────────────────────────────────────────────
Configure additional settings (press Enter to skip any)

📋 Default Project Key (e.g., PROJ, DEV): _
👥 Default Assignee Email (optional): _
⚡ Default Priority Options: Highest, High, Medium, Low, Lowest
⚡ Default Priority (Medium): _
```

### Step 5: Connection Validation

```
────────────────────────────────────────────────────────────────
📍 STEP 5: CONNECTION VALIDATION
────────────────────────────────────────────────────────────────

🔍 VALIDATING CONNECTION...
   • Testing authentication with Jira API
   • Verifying permissions and access
   • This may take a few moments...

   ✅ Connection successful!
   👤 Authenticated as: John Doe (john.doe@company.com)
   ✅ Project access verified: PROJ
```

**Comprehensive Testing:**
- Tests authentication with `/rest/api/2/myself`
- Verifies user account is active
- Tests project access if project key provided
- Detailed error messages for different failure scenarios:
  - 401: Invalid credentials with recovery steps
  - 403: Permission issues with administrator contact info
  - 404: Instance not found with URL verification steps
  - Network errors with connectivity troubleshooting

### Step 6: Secure Storage

```
────────────────────────────────────────────────────────────────
📍 STEP 6: SECURE STORAGE
────────────────────────────────────────────────────────────────

💾 STORING CREDENTIALS SECURELY...
   🔍 Checking OS credential manager availability...
   💡 Using secure encrypted local storage (OS keychain integration available in future updates)
   📁 OS credential manager not available, using encrypted local storage
   ✅ Encrypted configuration saved to: /Users/john/.jira-mcp-secure.json
   ✅ Environment file created: /Users/john/.jira-mcp.env
   🔐 API token encrypted with AES-256
```

### Success Confirmation

```
================================================================================
🎉 CONFIGURATION COMPLETED SUCCESSFULLY!
================================================================================

📊 CONFIGURATION SUMMARY:
   🔗 Jira URL: https://mycompany.atlassian.net
   👤 Username: john.doe@company.com
   🔑 API Token: ******************** (securely encrypted)
   📋 Default Project: PROJ
   👥 Default Assignee: john.doe@company.com
   ⚡ Priority: Medium

🛡️  SECURITY STATUS:
   ✅ Credentials validated against Jira API
   ✅ API token encrypted with AES-256
   ✅ Configuration files protected (600 permissions)
   ✅ Zero exposure to AI systems or logs

🚀 NEXT STEPS:
   1. Add MCP server configuration to Claude Desktop:

      {
        "mcpServers": {
          "jira": {
            "command": "npx",
            "args": ["-y", "github:techrivers/AtlassianJira-MCP-Integration"],
            "env": {
              "MCP_MODE": "true"
            }
          }
        }
      }

   2. Restart Claude Desktop completely
   3. Start using Jira integration with Claude!

💬 TRY THESE COMMANDS WITH CLAUDE:
   • "Show me my recent Jira issues"
   • "Create a new task in Jira"
   • "Log time to my current sprint"
   • "Help me import issues from a spreadsheet"

📚 NEED HELP?
   • Documentation: https://github.com/techrivers/AtlassianJira-MCP-Integration
   • Issues: https://github.com/techrivers/AtlassianJira-MCP-Integration/issues
   • Re-run configuration: atlassianjira-mcp-integration --configure
```

## ❌ Error Handling Examples

### Authentication Failures

```
❌ Connection test failed

💥 Error: Authentication failed - Invalid credentials

💡 Suggestions:
   • Verify your username/email is correct
   • Check your API token - it may have expired
   • Generate a new API token: https://id.atlassian.com/manage-profile/security/api-tokens
   • Ensure you're using an API token, not your password

Would you like to try again? (y/n): _
```

### Network Issues

```
❌ Connection test failed

💥 Error: Cannot reach Jira instance

💡 Suggestions:
   • Check your internet connection
   • Verify the Jira URL is correct
   • Ensure the Jira instance is online and accessible

Would you like to try again? (y/n): _
```

### Permission Problems

```
❌ Connection test failed

💥 Error: Access forbidden - Insufficient permissions

💡 Suggestions:
   • Contact your Jira administrator for access
   • Verify your account has API access enabled

Would you like to try again? (y/n): _
```

## 🔄 Recovery and Management

### Re-running Configuration

```bash
npx -y github:techrivers/AtlassianJira-MCP-Integration --configure
```

This will:
- Detect existing configuration
- Offer to overwrite or update
- Maintain same security standards
- Validate new credentials before storage

### Checking Configuration Status

```bash
npx -y github:techrivers/AtlassianJira-MCP-Integration --help
```

Shows current configuration status and storage locations.

### Manual Cleanup

If you need to completely reset:

```bash
rm ~/.jira-mcp-secure.json
rm ~/.jira-mcp.env
```

Then re-run the configuration tool.

## 🏢 Enterprise Features

### Audit Trail

- Configuration timestamps in stored files
- User and hostname tracking in encrypted storage
- Clear logging of security events (without exposing credentials)

### Compliance

- **No Credential Logging**: API tokens never appear in logs or console output
- **Encryption at Rest**: All sensitive data encrypted with AES-256
- **File Permissions**: Restrictive permissions (600) on configuration files
- **Input Validation**: Comprehensive validation prevents injection attacks
- **Timeout Handling**: Network requests have reasonable timeouts

### Future Enhancements

- **OS Keychain Integration**: Native keychain/credential manager support
- **Multi-Profile Support**: Support for multiple Jira instances
- **Token Rotation**: Automatic API token rotation capabilities
- **SSO Integration**: Enterprise SSO authentication flows

## 🎯 Design Principles

### User-Centered Design

1. **Progressive Disclosure**: Information revealed step-by-step
2. **Clear Mental Models**: Users understand what's happening and why
3. **Helpful Error Recovery**: Detailed guidance for fixing problems
4. **Professional Appearance**: Enterprise-grade visual design
5. **Accessibility**: Clear text, good contrast, keyboard navigation

### Security by Design

1. **Zero Trust**: Never trust user input without validation
2. **Defense in Depth**: Multiple layers of security
3. **Principle of Least Exposure**: Minimize credential visibility
4. **Secure Defaults**: Most secure options chosen by default
5. **Audit Ready**: Full traceability without exposing secrets

### Developer Experience

1. **Clear Integration Path**: Simple MCP configuration
2. **Backward Compatibility**: Works with existing setups
3. **Extensible Architecture**: Easy to add new storage backends
4. **Comprehensive Testing**: Connection validation before storage
5. **Helpful Documentation**: Clear guidance at every step

This secure credential setup ensures that your Jira integration is both highly secure and user-friendly, meeting enterprise security requirements while maintaining a smooth user experience.