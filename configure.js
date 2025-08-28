#!/usr/bin/env node

// Simple configuration launcher
const path = require('path');

console.log('🔐 Starting Secure Jira Configuration Tool...\n');

try {
    const { runSecureCLIConfiguration } = require('./build/cli/secureConfigure.js');
    
    runSecureCLIConfiguration()
        .then(success => {
            console.log(success ? '\n✅ Configuration completed successfully!' : '\n❌ Configuration failed or was cancelled.');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Failed to start secure configuration:', error);
            process.exit(1);
        });
} catch (error) {
    console.error('❌ Error loading configuration tool:', error);
    process.exit(1);
}