/**
 * MCP Server 3 - Execution Server Tools
 *
 * SAFE IMPLEMENTATION with intentional vulnerability for educational purposes:
 * - Executes only in sandboxed directory
 * - Command whitelist enforced
 * - Timeout protection
 * - BUT: Accepts commands from Server 2 without re-validation (the vulnerability!)
 */

import { spawn } from 'child_process';
import { readdirSync, statSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Sandbox directory - all execution happens here
 */
const SANDBOX_DIR = process.env.SANDBOX_PATH || '/tmp/mcp-demo-sandbox';

/**
 * Whitelisted commands - only these can execute
 */
const ALLOWED_COMMANDS = ['touch', 'echo', 'ls', 'cat', 'mkdir', 'pwd', 'date'];

/**
 * Blocked patterns - these will be rejected
 */
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,  // rm -rf / (system destruction)
  /dd\s+if=/,       // disk operations
  /mkfs/,           // filesystem format
  /:\(\)\{.*\}/,    // fork bomb
  /\/dev\/sd/,      // direct device access
  /\/etc\//,        // system config access
  /\/usr\//,        // system directories
  /\/bin\//,        // system binaries (except whitelisted)
  /\/sbin\//,       // system admin binaries
];

/**
 * Command execution timeout (ms)
 */
const COMMAND_TIMEOUT = 5000;

/**
 * Rate limiting
 */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 10; // Max 10 commands
const RATE_LIMIT_WINDOW = 60000; // Per 60 seconds

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  command: string;
  sandboxPath: string;
  timestamp: string;
  blocked?: boolean;
  blockReason?: string;
}

/**
 * Initialize sandbox directory
 */
export function initSandbox(): void {
  if (!existsSync(SANDBOX_DIR)) {
    mkdirSync(SANDBOX_DIR, { recursive: true, mode: 0o755 });
    console.error(`[Sandbox] Created: ${SANDBOX_DIR}`);
  } else {
    console.error(`[Sandbox] Using existing: ${SANDBOX_DIR}`);
  }
}

/**
 * Check rate limit
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];

  // Remove old timestamps outside window
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  recent.push(now);
  rateLimitMap.set(identifier, recent);
  return true;
}

/**
 * Validate command against whitelist and blocklist
 */
function validateCommand(command: string): { allowed: boolean; reason?: string } {
  // Extract base command
  const baseCommand = command.trim().split(/\s+/)[0];

  // Check whitelist
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return {
      allowed: false,
      reason: `Command '${baseCommand}' not in whitelist. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
    };
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Command blocked by security pattern: ${pattern}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Execute command in sandbox
 *
 * VULNERABILITY: If this receives commands from Server 2 without the user
 * knowing they came from a malicious source, they will execute!
 */
export async function executeCommand(command: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.error(`[Executor] Command: ${command}`);

  // Rate limiting
  if (!checkRateLimit('global')) {
    console.error(`[Executor] ⚠️  Rate limit exceeded`);
    return {
      success: false,
      stdout: '',
      stderr: 'Rate limit exceeded. Max 10 commands per minute.',
      exitCode: null,
      duration: Date.now() - startTime,
      command,
      sandboxPath: SANDBOX_DIR,
      timestamp,
      blocked: true,
      blockReason: 'rate_limit',
    };
  }

  // Validate command
  const validation = validateCommand(command);
  if (!validation.allowed) {
    console.error(`[Executor] ❌ Command blocked: ${validation.reason}`);
    return {
      success: false,
      stdout: '',
      stderr: validation.reason || 'Command blocked',
      exitCode: null,
      duration: Date.now() - startTime,
      command,
      sandboxPath: SANDBOX_DIR,
      timestamp,
      blocked: true,
      blockReason: validation.reason,
    };
  }

  // Execute in sandbox
  console.error(`[Executor] ✓ Executing in sandbox: ${SANDBOX_DIR}`);

  return new Promise((resolve) => {
    const child = spawn(command, [], {
      shell: true,
      cwd: SANDBOX_DIR,
      timeout: COMMAND_TIMEOUT,
      env: {
        ...process.env,
        PWD: SANDBOX_DIR,
        HOME: SANDBOX_DIR,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;

      console.error(`[Executor] Exit code: ${code}, Duration: ${duration}ms`);

      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code,
        duration,
        command,
        sandboxPath: SANDBOX_DIR,
        timestamp,
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;

      console.error(`[Executor] Error: ${error.message}`);

      resolve({
        success: false,
        stdout,
        stderr: error.message,
        exitCode: null,
        duration,
        command,
        sandboxPath: SANDBOX_DIR,
        timestamp,
      });
    });
  });
}

/**
 * List files in sandbox
 */
export function listSandboxFiles(): { files: string[]; path: string; count: number } {
  console.error(`[Sandbox] Listing files in: ${SANDBOX_DIR}`);

  try {
    const files = readdirSync(SANDBOX_DIR).map((file) => {
      const fullPath = join(SANDBOX_DIR, file);
      const stats = statSync(fullPath);
      return `${file} (${stats.isDirectory() ? 'dir' : stats.size + ' bytes'})`;
    });

    console.error(`[Sandbox] Found ${files.length} files`);

    return {
      files,
      path: SANDBOX_DIR,
      count: files.length,
    };
  } catch (error) {
    console.error(`[Sandbox] Error listing files: ${error}`);
    return {
      files: [],
      path: SANDBOX_DIR,
      count: 0,
    };
  }
}

/**
 * Tool definitions for MCP protocol
 */
export const TOOLS = [
  {
    name: 'execute_command',
    description: 'Execute a shell command in sandboxed environment. Whitelist enforced.',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute (must be in whitelist)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'list_sandbox_files',
    description: 'List files in the sandbox directory',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];
