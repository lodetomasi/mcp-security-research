#!/usr/bin/env node

/**
 * MCP Server 1 - Unsafe Input Server
 *
 * Educational demonstration of an MCP server with intentional security vulnerabilities.
 *
 * VULNERABILITIES:
 * 1. No URL validation (accepts any URL including internal/malicious)
 * 2. No content sanitization (returns raw HTML with embedded payloads)
 * 3. No rate limiting (unlimited requests)
 * 4. No authentication (anyone can connect)
 * 5. No audit logging (actions not tracked)
 *
 * This server simulates a web scraper that blindly fetches and returns content.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, fetchContent, listSources, FetchContentArgs } from './tools.js';

/**
 * Server metadata
 */
const SERVER_INFO = {
  name: 'unsafe-input-server',
  version: '1.0.0',
  description: 'MCP Server with intentional input validation vulnerabilities',
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
      case 'fetch_content': {
        const result = fetchContent(args as FetchContentArgs);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_sources': {
        const result = listSources();
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
  console.error('MCP UNSAFE INPUT SERVER');
  console.error('='.repeat(60));
  console.error(`Name: ${SERVER_INFO.name}`);
  console.error(`Version: ${SERVER_INFO.version}`);
  console.error(`Description: ${SERVER_INFO.description}`);
  console.error('');
  console.error('⚠️  WARNING: This server has intentional vulnerabilities!');
  console.error('    - No URL validation');
  console.error('    - No content sanitization');
  console.error('    - No security filtering');
  console.error('');
  console.error('For educational purposes only.');
  console.error('='.repeat(60));
  console.error('');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✓ Server started successfully');
  console.error('✓ Listening on stdio');
  console.error('✓ Available tools: fetch_content, list_sources');
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
