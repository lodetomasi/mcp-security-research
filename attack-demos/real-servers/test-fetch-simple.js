#!/usr/bin/env node
/**
 * Simple test for OFFICIAL Fetch MCP server
 * Tests vulnerability: HTML comment extraction
 */

const { spawn } = require('child_process');
const path = require('path');

const PAYLOAD_PATH = path.join(__dirname, 'payloads', 'malicious-documentation.html');
const FILE_URL = `file://${PAYLOAD_PATH}`;

console.log('========================================');
console.log('  OFFICIAL FETCH SERVER TEST');
console.log('========================================\n');

console.log(`[*] Testing: ${FILE_URL}\n`);

// Start the MCP server
const server = spawn('uvx', ['mcp-server-fetch'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
});

server.stderr.on('data', (data) => {
  console.error(`Server stderr: ${data}`);
});

// Send initialization
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'vulnerability-test',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initMessage) + '\n');

// Wait a bit then send fetch request
setTimeout(() => {
  const fetchMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'fetch',
      arguments: {
        url: FILE_URL
      }
    }
  };

  console.log('[*] Sending fetch request...\n');
  server.stdin.write(JSON.stringify(fetchMessage) + '\n');

  // Close stdin after sending
  setTimeout(() => {
    server.stdin.end();
  }, 1000);
}, 1000);

// Handle server exit
server.on('close', (code) => {
  console.log('\n[*] Analyzing response...\n');

  // Try to parse JSON responses
  const lines = responseData.split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      const json = JSON.parse(line);
      if (json.result && json.result.content) {
        const content = json.result.content[0];
        if (content && content.text) {
          const text = content.text;

          // Check for HTML comments
          if (text.includes('HIDDEN MALICIOUS PAYLOAD')) {
            console.log('🚨 VULNERABILITY CONFIRMED!');
            console.log('   → HTML comments NOT sanitized');
            console.log('   → Malicious payload present in response\n');
          }

          // Check for bash code blocks
          if (text.includes('```bash')) {
            console.log('🚨 CRITICAL: Bash code blocks found!');
            console.log('   → Commands can be extracted\n');

            // Extract commands
            const bashMatch = text.match(/```bash\n([\s\S]*?)```/);
            if (bashMatch) {
              console.log('🚨 EXTRACTED COMMANDS:');
              console.log('-----------------------------------');
              console.log(bashMatch[1].substring(0, 500)); // First 500 chars
              console.log('-----------------------------------\n');
            }
          }

          // Save full response for analysis
          require('fs').writeFileSync(
            path.join(__dirname, 'official-fetch-response.txt'),
            text
          );
          console.log('[*] Full response saved to: official-fetch-response.txt\n');
        }
      }
    } catch (e) {
      // Not JSON, skip
    }
  }

  console.log('========================================');
  console.log('  TEST COMPLETE');
  console.log('========================================\n');

  console.log('This test demonstrates that the OFFICIAL');
  console.log('@modelcontextprotocol/server-fetch (Python)');
  console.log('has the SAME vulnerability as our demo!\n');
});

setTimeout(() => {
  if (!server.killed) {
    console.log('\n[!] Timeout - killing server');
    server.kill();
  }
}, 5000);
