#!/usr/bin/env node

/**
 * MCP Server 2 - Processing Server
 *
 * Educational demonstration of weak validation in content processing.
 *
 * VULNERABILITIES:
 * 1. Extracts commands from HTML comments (hidden payloads)
 * 2. Flags dangerous commands but doesn't block them
 * 3. No content sanitization before parsing
 * 4. No user approval required for risky commands
 * 5. Returns commands ready for execution without re-validation
 *
 * This server demonstrates the "middle layer" vulnerability where
 * content is processed but not properly validated before passing
 * to the next stage.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  TOOLS,
  parseMarkdown,
  extractCommands,
  CodeBlock,
} from './tools.js';

/**
 * Server metadata
 */
const SERVER_INFO = {
  name: 'processing-server',
  version: '1.0.0',
  description: 'MCP Server with weak validation in content processing',
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
      case 'parse_markdown': {
        const { content } = args as { content: string };

        if (!content) {
          throw new Error('Content is required');
        }

        console.error(`[Server] Parsing ${content.length} characters`);

        const blocks = parseMarkdown(content);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  blocks,
                  count: blocks.length,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'extract_commands': {
        const { blocks } = args as { blocks: CodeBlock[] };

        if (!blocks || !Array.isArray(blocks)) {
          throw new Error('Blocks array is required');
        }

        console.error(`[Server] Extracting commands from ${blocks.length} blocks`);

        const commands = extractCommands(blocks);

        // Count risk levels
        const riskCounts = {
          safe: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        };

        for (const cmd of commands) {
          riskCounts[cmd.risk]++;
        }

        console.error(`[Server] Risk breakdown: ${JSON.stringify(riskCounts)}`);

        // VULNERABILITY: Return all commands even if critical
        if (riskCounts.critical > 0 || riskCounts.high > 0) {
          console.error(`[Server] ⚠️  WARNING: ${riskCounts.critical} critical and ${riskCounts.high} high-risk commands found!`);
          console.error(`[Server] ⚠️  Commands will be returned anyway (no blocking)`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  commands,
                  count: commands.length,
                  riskBreakdown: riskCounts,
                  timestamp: new Date().toISOString(),
                  warning:
                    riskCounts.critical > 0 || riskCounts.high > 0
                      ? 'Dangerous commands detected but not blocked'
                      : undefined,
                },
                null,
                2
              ),
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
  console.error('MCP PROCESSING SERVER');
  console.error('='.repeat(60));
  console.error(`Name: ${SERVER_INFO.name}`);
  console.error(`Version: ${SERVER_INFO.version}`);
  console.error(`Description: ${SERVER_INFO.description}`);
  console.error('');
  console.error('⚠️  WARNING: This server has weak validation!');
  console.error('    - Parses HTML comments (where payloads hide)');
  console.error('    - Flags dangerous commands but doesn\'t block them');
  console.error('    - No user approval for risky operations');
  console.error('');
  console.error('For educational purposes only.');
  console.error('='.repeat(60));
  console.error('');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('✓ Server started successfully');
  console.error('✓ Listening on stdio');
  console.error('✓ Available tools: parse_markdown, extract_commands');
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
