#!/usr/bin/env node

/**
 * MCP Server 3 - Execution Server
 *
 * Educational demonstration of sandboxed command execution with a critical flaw.
 *
 * SECURITY MEASURES:
 * 1. Sandboxed execution (only in /tmp/mcp-demo-sandbox)
 * 2. Command whitelist (only safe commands)
 * 3. Blocked patterns (no system destruction)
 * 4. Timeout protection (5 seconds max)
 * 5. Rate limiting (10 commands/minute)
 *
 * VULNERABILITY:
 * - Trusts commands from Server 2 without user confirmation
 * - If Server 2 was compromised, malicious commands execute here
 * - This demonstrates "trust boundary violation"
 *
 * The flaw: Each server validates individually, but the chain creates
 * a vulnerability. Server 3 doesn't know the commands came from a
 * malicious source processed by Server 2.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  TOOLS,
  executeCommand,
  listSandboxFiles,
  initSandbox,
} from './tools.js';

/**
 * Server metadata
 */
const SERVER_INFO = {
  name: 'execution-server',
  version: '1.0.0',
  description: 'Sandboxed command execution with whitelist enforcement',
};

/**
 * Initialize MCP server
 */
const server = new Server(
  {
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[Server] Listing tools');
  return {
    tools: TOOLS,
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[Server] Tool called: ${name}`);
  console.error(`[Server] Arguments: ${JSON.stringify(args, null, 2)}`);

  try {
    switch (name) {
      case 'execute_command': {
        const { command } = args as { command: string };

        if (!command) {
          throw new Error('Command is required');
        }

        // VULNERABILITY: No check if this command came from a trusted source
        // Server 3 doesn't know this command was extracted from HTML by Server 2
        // It just sees a valid command that passes whitelist
        console.error(`[Server] Executing command from caller (origin unknown)`);

        const result = await executeCommand(command);

        // Log if execution was successful
        if (result.success) {
          console.error(`[Server] ✓ Command executed successfully`);
        } else if (result.blocked) {
          console.error(`[Server] ✗ Command blocked: ${result.blockReason}`);
        } else {
          console.error(`[Server] ✗ Command failed: ${result.stderr}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_sandbox_files': {
        const result = listSandboxFiles();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Server] Error executing tool ${name}:`, errorMessage);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: errorMessage,
            tool: name,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  console.error('='.repeat(60));
  console.error('MCP EXECUTION SERVER');
  console.error('='.repeat(60));
  console.error(`Name: ${SERVER_INFO.name}`);
  console.error(`Version: ${SERVER_INFO.version}`);
  console.error(`Description: ${SERVER_INFO.description}`);
  console.error('');
  console.error('🔒 Security Measures:');
  console.error('    ✓ Sandboxed execution');
  console.error('    ✓ Command whitelist: touch, echo, ls, cat, mkdir, pwd, date');
  console.error('    ✓ Blocked patterns (system destruction prevention)');
  console.error('    ✓ 5-second timeout');
  console.error('    ✓ Rate limiting (10 cmd/min)');
  console.error('');
  console.error('⚠️  VULNERABILITY:');
  console.error('    ✗ Trusts commands from Server 2 without origin validation');
  console.error('    ✗ No user confirmation for execution');
  console.error('    ✗ Doesn\'t know if command source was malicious');
  console.error('');
  console.error('For educational purposes only.');
  console.error('='.repeat(60));
  console.error('');

  // Initialize sandbox
  initSandbox();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✓ Server started successfully');
  console.error('✓ Listening on stdio');
  console.error('✓ Available tools: execute_command, list_sandbox_files');
  console.error('');
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.error('\n[Server] Shutting down...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n[Server] Shutting down...');
  await server.close();
  process.exit(0);
});

// Start server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
