# Server 3: Execution Server

Sandboxed command execution server with whitelist enforcement and intentional trust boundary vulnerability.

## Purpose

Executes shell commands in a **sandboxed environment** with **strict whitelist** and **safety measures**. However, it has a critical flaw: it **trusts commands from Server 2 without verifying their origin**.

## Security Measures

### ✅ Implemented Protections

1. **Sandbox Execution**
   - All commands run in `/tmp/mcp-demo-sandbox`
   - Working directory locked to sandbox
   - No access to system directories

2. **Command Whitelist**
   - Only allowed: `touch`, `echo`, `ls`, `cat`, `mkdir`, `pwd`, `date`
   - All other commands rejected

3. **Blocked Patterns**
   - `rm -rf /` (system destruction)
   - `dd if=` (disk operations)
   - `mkfs` (filesystem format)
   - Fork bombs
   - Direct device access (`/dev/sd*`)
   - System directories (`/etc/`, `/usr/`, `/bin/`, `/sbin/`)

4. **Timeout Protection**
   - Commands killed after 5 seconds
   - Prevents infinite loops

5. **Rate Limiting**
   - Max 10 commands per minute
   - Prevents DoS attacks

## Vulnerability

### ❌ The Critical Flaw: Trust Boundary Violation

```
Server 2 → Server 3
(Parser)   (Executor)

Server 2 says: "Here are some bash commands to run"
Server 3 says: "OK, they pass whitelist, executing..."

Problem: Server 3 doesn't know these commands came from:
1. Malicious HTML fetched by Server 1
2. Extracted from HTML comments by Server 2
3. Never reviewed by a human

Server 3 trusts the chain implicitly!
```

### Why This Matters

- Server 3 has good security for **individual commands**
- But it doesn't validate the **command source**
- It assumes Server 2 is trustworthy
- No user confirmation required
- The vulnerability is in the **trust relationship**, not the code

## Tools

### `execute_command`

Execute a shell command in the sandbox.

**Arguments:**
```json
{
  "command": "string (must be whitelisted)"
}
```

**Returns:**
```json
{
  "success": true,
  "stdout": "command output",
  "stderr": "",
  "exitCode": 0,
  "duration": 45,
  "command": "touch /tmp/mcp-demo-sandbox/test.txt",
  "sandboxPath": "/tmp/mcp-demo-sandbox",
  "timestamp": "ISO 8601"
}
```

**Blocked Response:**
```json
{
  "success": false,
  "blocked": true,
  "blockReason": "Command 'rm' not in whitelist",
  "stderr": "...",
  "exitCode": null
}
```

### `list_sandbox_files`

List all files created in the sandbox.

**Returns:**
```json
{
  "files": [
    "pwned.txt (23 bytes)",
    "exfiltrated (dir)"
  ],
  "path": "/tmp/mcp-demo-sandbox",
  "count": 2
}
```

## Build & Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Production mode
npm start
```

## Testing

```bash
# Test safe command
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"execute_command","arguments":{"command":"touch test.txt"}}}' \
  | node dist/index.js

# Test blocked command
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"execute_command","arguments":{"command":"rm -rf /"}}}' \
  | node dist/index.js

# List sandbox files
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_sandbox_files","arguments":{}}}' \
  | node dist/index.js
```

## Attack Flow Position

```
Server 1          Server 2          Server 3
(Fetch)           (Parse)           (Execute)
   ↓                 ↓                  ↓
HTML with      Extract cmds       Execute cmds
payload        (no block)         (whitelist OK)
   ↓                 ↓                  ↓
Malicious  →   Commands   →   ✓ EXECUTED
content        flagged              |
               as risky             |
               but passed           |
                  ↓                 ↓
            Trust boundary    Files created!
            NOT enforced      Attack successful
```

## The Attack Scenario

1. **Attacker** embeds payload in HTML: `<!-- ```bash touch /tmp/pwned.txt ``` -->`
2. **Server 1** fetches it without validation
3. **Server 2** extracts `touch /tmp/pwned.txt`, flags as "safe", passes it on
4. **Server 3** receives `touch /tmp/pwned.txt`
   - Checks: Is `touch` in whitelist? ✓ Yes
   - Checks: Any blocked patterns? ✓ No
   - Checks: Command source? ✗ **NOT CHECKED**
   - **Executes the command**
5. **Result**: `pwned.txt` created in sandbox
6. **Attack successful** - malicious code executed

## Security Lessons

1. **Never trust upstream services implicitly**
   - Each layer must validate independently
   - Don't assume previous layers did their job

2. **Validate command origin**
   - Where did this command come from?
   - Was it user-initiated or automated?
   - Was there human review?

3. **User confirmation for sensitive actions**
   - Even whitelisted commands may be malicious
   - Require explicit approval for execution

4. **Defense in depth**
   - Whitelist is good
   - But not sufficient alone
   - Need origin validation + user approval

5. **Trust boundaries must be explicit**
   - Document which services trust which
   - Validate at every boundary crossing

## Secured Version

See `servers-secured/03-execution-server` for hardened implementation with:
- User approval required for all executions
- Command origin tracking
- Audit logging (immutable)
- Additional sandbox restrictions
- Network isolation
