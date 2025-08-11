#!/usr/bin/env node

/**
 * Test Script for Automated Setup
 * 
 * This script simulates a first-time user experience by:
 * 1. Backing up any existing configuration
 * 2. Running the MCP server to trigger setup
 * 3. Restoring the original configuration
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const configPath = path.join(os.homedir(), '.jira-mcp.env');
const backupPath = path.join(os.homedir(), '.jira-mcp.env.backup');

async function testAutomatedSetup() {
    console.log('🧪 Testing Automated Setup Flow...\n');

    // Step 1: Backup existing configuration if it exists
    let hasExistingConfig = false;
    if (fs.existsSync(configPath)) {
        console.log('📋 Backing up existing configuration...');
        fs.copyFileSync(configPath, backupPath);
        fs.unlinkSync(configPath);
        hasExistingConfig = true;
        console.log('✅ Configuration backed up and removed\n');
    } else {
        console.log('📋 No existing configuration found - perfect for testing!\n');
    }

    // Step 2: Test the MCP server automated setup
    console.log('🚀 Starting MCP server to test automated setup...');
    console.log('Note: This should detect missing configuration and launch the UI');
    console.log('Press Ctrl+C to stop the test when you see the setup UI\n');

    const mcpProcess = spawn('node', ['build/index.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'inherit', 'inherit']
    });

    // Handle process events
    mcpProcess.on('close', (code) => {
        console.log(`\n🔄 MCP server process exited with code ${code}`);
        cleanup();
    });

    mcpProcess.on('error', (error) => {
        console.error('❌ Error running MCP server:', error.message);
        cleanup();
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Test interrupted by user');
        if (mcpProcess && !mcpProcess.killed) {
            mcpProcess.kill('SIGTERM');
        }
        cleanup();
        process.exit(0);
    });

    // Cleanup function
    function cleanup() {
        console.log('\n🔄 Cleaning up...');

        // Remove any test configuration that might have been created
        if (fs.existsSync(configPath)) {
            console.log('🗑️  Removing test configuration...');
            fs.unlinkSync(configPath);
        }

        // Restore original configuration if it existed
        if (hasExistingConfig && fs.existsSync(backupPath)) {
            console.log('📋 Restoring original configuration...');
            fs.copyFileSync(backupPath, configPath);
            fs.unlinkSync(backupPath);
            console.log('✅ Original configuration restored');
        }

        console.log('✨ Cleanup complete!\n');
    }
}

// Usage instructions
if (process.argv.includes('--help')) {
    console.log(`
🧪 Automated Setup Test Script

Usage: node test-automated-setup.js

This script will:
1. Backup your existing Jira configuration (if any)
2. Remove the configuration to simulate a first-time user
3. Run the MCP server to test the automated setup
4. Let you see if the Configuration UI opens automatically
5. Restore your original configuration when you exit

Instructions:
- Run this script
- Watch for the Configuration UI to open in your browser
- Press Ctrl+C to stop the test
- Your original configuration will be restored automatically

Safety:
- Your existing configuration is safely backed up
- Everything is restored when the test ends
- No permanent changes are made to your setup
`);
    process.exit(0);
}

// Main execution
if (require.main === module) {
    testAutomatedSetup().catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}