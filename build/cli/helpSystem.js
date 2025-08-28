#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSecureConfigurationHelp = showSecureConfigurationHelp;
exports.showMCPConfigurationExample = showMCPConfigurationExample;
exports.showTroubleshootingHelp = showTroubleshootingHelp;
exports.showSecurityDetailsHelp = showSecurityDetailsHelp;
function showSecureConfigurationHelp() {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                      🔐 SECURE JIRA CONFIGURATION                          │
│                    Enterprise-Grade Credential Management                   │
└─────────────────────────────────────────────────────────────────────────────┘

🚀 QUICK START:
   atlassianjira-mcp-integration --configure

🔐 SECURITY FEATURES:
   ✅ Hidden API token input (never displayed)
   ✅ Real-time connection validation
   ✅ AES-256 encrypted credential storage
   ✅ OS keychain integration (future)
   ✅ Zero exposure to AI systems

📋 WHAT YOU'LL NEED:
   • Your Jira instance URL (e.g., https://company.atlassian.net)
   • Your Jira login email address
   • A Jira API token from: https://id.atlassian.com/manage-profile/security/api-tokens

⏱️  ESTIMATED TIME: 2-3 minutes

🛡️  SECURITY GUARANTEE:
   Your API tokens are NEVER:
   • Displayed on screen during input
   • Stored in plain text
   • Exposed to Claude or any AI system
   • Included in error messages or logs

🎯 AFTER CONFIGURATION:
   1. Your credentials are securely encrypted and stored
   2. Add simple MCP config to Claude Desktop (no credentials needed)
   3. Start using Jira with Claude immediately

💡 NEED HELP?
   • Documentation: https://github.com/techrivers/AtlassianJira-MCP-Integration
   • Issues: Create an issue on GitHub
   • Security Questions: Contact the maintainers

Press Enter to start secure configuration, or Ctrl+C to cancel.
`);
}
function showMCPConfigurationExample() {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                    📋 CLAUDE DESKTOP CONFIGURATION                          │
└─────────────────────────────────────────────────────────────────────────────┘

Add this to your Claude Desktop settings (no credentials needed):

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

📍 CONFIGURATION LOCATION:

macOS:
~/Library/Application Support/Claude/claude_desktop_config.json

Windows:
%APPDATA%\\Claude\\claude_desktop_config.json

Linux:
~/.config/Claude/claude_desktop_config.json

🔄 AFTER ADDING CONFIGURATION:
1. Save the file
2. Restart Claude Desktop completely
3. Your Jira integration will be available immediately

💬 TEST WITH THESE COMMANDS:
• "Show me my recent Jira issues"
• "Create a new task in my project"
• "Log time to my current work"
• "Help me with Jira"
`);
}
function showTroubleshootingHelp() {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                         🔧 TROUBLESHOOTING GUIDE                           │
└─────────────────────────────────────────────────────────────────────────────┘

❌ COMMON ISSUES & SOLUTIONS:

🔐 Authentication Problems:
   Problem: "Authentication failed - Invalid credentials"
   Solutions:
   • Verify your email address is exactly as used in Jira
   • Check if your API token has expired
   • Generate a new API token: https://id.atlassian.com/manage-profile/security/api-tokens
   • Ensure you're using an API token, NOT your password

🌐 Connection Issues:
   Problem: "Cannot reach Jira instance"
   Solutions:
   • Check your internet connection
   • Verify the Jira URL in a web browser
   • Ensure no corporate firewall is blocking access
   • Try adding/removing 'www.' from the URL

🚫 Permission Problems:
   Problem: "Access forbidden - Insufficient permissions"
   Solutions:
   • Contact your Jira administrator
   • Ensure your account has API access enabled
   • Check if your account has proper project permissions

📁 Configuration Issues:
   Problem: "Failed to store credentials"
   Solutions:
   • Check file permissions in your home directory
   • Ensure you have write access to ~/.jira-mcp-secure.json
   • Try running with administrator/sudo privileges (not recommended)

🔄 Claude Integration Issues:
   Problem: "Jira tools not available in Claude"
   Solutions:
   • Verify MCP configuration is correct
   • Restart Claude Desktop completely
   • Check Claude Desktop's log files for errors
   • Re-run configuration: atlassianjira-mcp-integration --configure

📊 DIAGNOSTIC COMMANDS:
   • Check configuration: atlassianjira-mcp-integration --help
   • Reconfigure: atlassianjira-mcp-integration --configure
   • View logs: Check Claude Desktop application logs

🆘 STILL NEED HELP?
   Create a GitHub issue with:
   • Your operating system
   • Error messages (without credentials)
   • Steps to reproduce the problem
   • Your Jira instance type (Cloud/Server/Data Center)

🔗 GitHub Issues: https://github.com/techrivers/AtlassianJira-MCP-Integration/issues
`);
}
function showSecurityDetailsHelp() {
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                         🛡️ SECURITY ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

🔐 CREDENTIAL PROTECTION:

Input Security:
   • API tokens never echoed to terminal
   • No asterisks or dots shown during input
   • Input buffer cleared immediately after use
   • No input stored in terminal history

Storage Hierarchy (Priority Order):
   1. 🗝️  OS Keychain/Credential Manager (Future)
      - macOS: Keychain Access
      - Windows: Credential Manager
      - Linux: Secret Service (libsecret)
   
   2. 🔒 AES-256 Encrypted Local Storage (Current)
      - API tokens encrypted with PBKDF2-derived keys
      - 100,000 iterations for key derivation
      - System-specific salt generation
      - File permissions: 600 (owner read/write only)
   
   3. 📄 Legacy Environment Files (Fallback)
      - Plain text for backward compatibility only
      - Secured with 600 file permissions

🛡️  RUNTIME SECURITY:

Zero AI Exposure:
   • Credentials loaded directly by MCP server
   • No credentials passed through Claude conversation
   • API tokens never appear in AI context
   • Error messages sanitized of sensitive data

Connection Validation:
   • Real-time testing against Jira API
   • User identity verification
   • Project access validation
   • Comprehensive error handling without exposure

🔍 AUDIT & COMPLIANCE:

Logging:
   • Configuration events logged (without credentials)
   • Connection attempts recorded (sanitized)
   • Error conditions tracked (safe information only)
   • No sensitive data in any log files

File Security:
   • Restrictive file permissions (600)
   • Configuration files stored in user home directory
   • No world-readable or group-readable permissions
   • Encrypted content for sensitive fields

🔄 MAINTENANCE & ROTATION:

Credential Management:
   • Easy reconfiguration with --configure flag
   • Automatic cleanup of old configurations
   • No credential caching beyond secure storage
   • Support for credential rotation workflows

🔬 TECHNICAL IMPLEMENTATION:

Encryption Details:
   • Algorithm: AES-256-CBC
   • Key Derivation: PBKDF2 with SHA-256
   • Iterations: 100,000 (OWASP recommended minimum)
   • Salt: Fixed application salt + system entropy
   • IV: Random 16-byte initialization vector per encryption

Memory Safety:
   • Credential strings cleared after use
   • No persistent in-memory credential storage
   • Secure key derivation on each access
   • Automatic garbage collection of sensitive objects

🎯 THREAT MODEL:

Protected Against:
   ✅ Credential exposure to AI systems
   ✅ Accidental credential logging
   ✅ Credential display in terminal
   ✅ Unauthorized file access (proper permissions)
   ✅ Credential exposure in error messages
   ✅ Network credential interception (HTTPS only)

Limitations:
   ⚠️  Requires user to maintain API token security
   ⚠️  System administrator can access encrypted files
   ⚠️  Physical machine access could compromise storage
   ⚠️  OS keychain not yet implemented (roadmap item)

🚀 ROADMAP ENHANCEMENTS:
   • Native OS keychain integration
   • Hardware security module support
   • Enterprise SSO integration
   • Credential rotation automation
   • Multi-factor authentication support
`);
}
if (require.main === module) {
    const arg = process.argv[2];
    switch (arg) {
        case '--security':
            showSecurityDetailsHelp();
            break;
        case '--troubleshoot':
            showTroubleshootingHelp();
            break;
        case '--mcp':
            showMCPConfigurationExample();
            break;
        case '--help':
        default:
            showSecureConfigurationHelp();
            break;
    }
}
