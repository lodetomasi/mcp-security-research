/**
 * MCP Server 2 - Processing Server Tools
 *
 * WARNING: This server has intentionally weak validation for educational purposes.
 * - Parses markdown but doesn't sanitize commands
 * - Extracts shell commands without blocking dangerous ones
 * - Only flags risks but allows execution to continue
 */

import MarkdownIt from 'markdown-it';

/**
 * Code block extracted from content
 */
export interface CodeBlock {
  type: 'code_block';
  language: string;
  code: string;
  source: 'markdown' | 'html_comment' | 'inline';
  lineNumber?: number;
}

/**
 * Extracted command ready for execution
 */
export interface ExtractedCommand {
  code: string;
  language: string;
  risk: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  source: string;
}

/**
 * Dangerous command patterns (for flagging only, not blocking)
 */
const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf\s+\//, risk: 'critical' as const, flag: 'recursive_delete_root' },
  { pattern: /rm\s+-rf/, risk: 'high' as const, flag: 'recursive_delete' },
  { pattern: /dd\s+if=/, risk: 'critical' as const, flag: 'disk_operation' },
  { pattern: /mkfs/, risk: 'critical' as const, flag: 'filesystem_format' },
  { pattern: /curl\s+.*\|.*sh/, risk: 'critical' as const, flag: 'remote_execution' },
  { pattern: /wget\s+.*\|.*sh/, risk: 'critical' as const, flag: 'remote_execution' },
  { pattern: /eval\s+/, risk: 'high' as const, flag: 'eval' },
  { pattern: /exec\s+/, risk: 'medium' as const, flag: 'exec' },
  { pattern: />\s*\/dev\//, risk: 'medium' as const, flag: 'device_write' },
  { pattern: /chmod\s+777/, risk: 'medium' as const, flag: 'permission_change' },
  { pattern: /sudo\s+/, risk: 'high' as const, flag: 'privilege_escalation' },
  { pattern: /su\s+/, risk: 'high' as const, flag: 'user_switch' },
];

/**
 * Shell language identifiers
 */
const SHELL_LANGUAGES = ['bash', 'sh', 'shell', 'zsh', 'fish', 'ksh'];

/**
 * Parse markdown content and extract code blocks
 *
 * VULNERABILITY: Extracts code but doesn't validate or sanitize content
 */
export function parseMarkdown(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const md = new MarkdownIt();

  // VULNERABILITY 1: Extract from HTML comments (where payloads are hidden)
  // Regex: <!--\s*```(\w+)\n([\s\S]*?)```\s*-->
  const htmlCommentRegex = /<!--\s*```(\w+)\n([\s\S]*?)```\s*-->/g;
  let match;

  while ((match = htmlCommentRegex.exec(content)) !== null) {
    const language = match[1];
    const code = match[2].trim();

    console.error(`[Parser] Found code block in HTML comment: ${language}`);

    blocks.push({
      type: 'code_block',
      language,
      code,
      source: 'html_comment',
    });
  }

  // Parse standard markdown code blocks
  const tokens = md.parse(content, {});

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'fence' && token.content) {
      const language = token.info || 'unknown';
      const code = token.content.trim();

      console.error(`[Parser] Found fence code block: ${language}`);

      blocks.push({
        type: 'code_block',
        language,
        code,
        source: 'markdown',
        lineNumber: token.map?.[0],
      });
    }

    // Also extract from inline code if it looks like a command
    if (token.type === 'code_inline' && token.content) {
      const code = token.content.trim();

      if (code.startsWith('$') || code.startsWith('#')) {
        console.error(`[Parser] Found inline command: ${code}`);

        blocks.push({
          type: 'code_block',
          language: 'bash',
          code: code.replace(/^[$#]\s*/, ''),
          source: 'inline',
        });
      }
    }
  }

  console.error(`[Parser] Total code blocks found: ${blocks.length}`);

  return blocks;
}

/**
 * Extract shell commands from code blocks
 *
 * VULNERABILITY: Flags dangerous commands but doesn't block them
 */
export function extractCommands(blocks: CodeBlock[]): ExtractedCommand[] {
  const commands: ExtractedCommand[] = [];

  for (const block of blocks) {
    // Only process shell-related languages
    if (!SHELL_LANGUAGES.includes(block.language.toLowerCase())) {
      console.error(`[Extractor] Skipping non-shell block: ${block.language}`);
      continue;
    }

    // Split multi-line commands
    const lines = block.code.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#');
    });

    for (const line of lines) {
      const command = line.trim();

      // VULNERABILITY 2: Analyze risk but don't block execution
      const { risk, flags } = analyzeCommandRisk(command);

      console.error(`[Extractor] Command: "${command}" | Risk: ${risk} | Flags: ${flags.join(', ')}`);

      // VULNERABILITY 3: Return even critical risk commands
      commands.push({
        code: command,
        language: block.language,
        risk,
        flags,
        source: block.source,
      });

      // WARNING: In a secure system, this would block or require approval
      if (risk === 'critical' || risk === 'high') {
        console.error(`[Extractor] ⚠️  WARNING: Dangerous command detected but not blocked!`);
      }
    }
  }

  console.error(`[Extractor] Total commands extracted: ${commands.length}`);

  return commands;
}

/**
 * Analyze command risk level
 *
 * VULNERABILITY: Only for logging, doesn't prevent execution
 */
function analyzeCommandRisk(command: string): { risk: ExtractedCommand['risk']; flags: string[] } {
  const flags: string[] = [];
  let risk: ExtractedCommand['risk'] = 'safe';

  for (const { pattern, risk: patternRisk, flag } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      flags.push(flag);

      // Update risk to highest level found
      if (patternRisk === 'critical') {
        risk = 'critical';
      } else if (patternRisk === 'high' && risk !== 'critical') {
        risk = 'high';
      } else if (patternRisk === 'medium' && risk !== 'critical' && risk !== 'high') {
        risk = 'medium';
      } else if (patternRisk === 'low' && risk === 'safe') {
        risk = 'low';
      }
    }
  }

  // Additional heuristics
  if (command.includes('|') && flags.length === 0) {
    flags.push('pipe');
    risk = risk === 'safe' ? 'low' : risk;
  }

  if (command.includes('&&') || command.includes('||')) {
    flags.push('chained');
    risk = risk === 'safe' ? 'low' : risk;
  }

  return { risk, flags };
}

/**
 * Tool definitions for MCP protocol
 */
export const TOOLS = [
  {
    name: 'parse_markdown',
    description: 'Parse markdown/HTML and extract code blocks. WARNING: Extracts from HTML comments.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Raw text/HTML content to parse',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'extract_commands',
    description: 'Extract shell commands from code blocks. WARNING: Dangerous commands not blocked.',
    inputSchema: {
      type: 'object',
      properties: {
        blocks: {
          type: 'array',
          description: 'Array of code blocks from parse_markdown',
          items: {
            type: 'object',
          },
        },
      },
      required: ['blocks'],
    },
  },
];
