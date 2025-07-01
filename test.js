#!/usr/bin/env node

// Simple test script to check if the server can start
const { spawn } = require('child_process');
const path = require('path');

console.log('Testing MCP Server...');
console.log('Server directory:', __dirname);
console.log('Environment check:');

// Check environment variables
require('dotenv').config();
const { JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN } = process.env;

console.log('JIRA_BASE_URL:', JIRA_BASE_URL ? '✓ Set' : '❌ Missing');
console.log('JIRA_USER_EMAIL:', JIRA_USER_EMAIL ? '✓ Set' : '❌ Missing');
console.log('JIRA_API_TOKEN:', JIRA_API_TOKEN ? '✓ Set' : '❌ Missing');

console.log('\nStarting server...');

const server = spawn('node', ['index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'inherit']
});

// Send a simple initialization message
setTimeout(() => {
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

// Send tools/list request
setTimeout(() => {
  const listMessage = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listMessage) + '\n');
}, 2000);

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

server.on('exit', (code) => {
  console.log('Server exited with code:', code);
  process.exit(code);
});

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('Test completed, shutting down...');
  server.kill();
}, 10000);
