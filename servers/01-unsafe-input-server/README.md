# Server 1: Unsafe Input Server

Educational MCP server demonstrating input validation vulnerabilities.

## Purpose

Simulates a web scraper that fetches content from URLs **without any security validation**. This is the first link in the vulnerability chain.

## Vulnerabilities

### 1. No URL Validation
- Accepts any URL without checking protocol, domain, or path
- Could access internal networks (SSRF)
- Could read local files (file:// protocol)
- No whitelist or blacklist

### 2. No Content Sanitization
- Returns raw HTML including:
  - HTML comments (where malicious payloads are hidden)
  - Script tags
  - Embedded objects
  - Dangerous attributes

### 3. No Rate Limiting
- Unlimited requests allowed
- Vulnerable to DoS attacks
- No throttling mechanism

### 4. No Authentication
- Anyone can connect and make requests
- No API keys or tokens required

### 5. No Audit Logging
- Actions are not tracked
- No security event logging
- Difficult to detect attacks

## Tools

### `fetch_content`

Fetches content from a URL without validation.

**Arguments:**
```json
{
  "url": "string"
}
```

**Returns:**
```json
{
  "content": "raw HTML content",
  "source": "original URL",
  "timestamp": "ISO 8601 timestamp",
  "warning": "optional warning (but content still returned)"
}
```

**Mock Responses:**
- URL containing `"malicious"`: Returns HTML with command injection payload
- URL containing `"multi-attack"`: Returns multi-step attack payload
- URL containing `"obfuscated"`: Returns base64-encoded payload
- Other URLs: Returns safe HTML

### `list_sources`

Lists available data sources with risk levels.

**Returns:**
```json
{
  "sources": [
    { "id": "email", "name": "Email Archive", "risk": "high" },
    { "id": "slack", "name": "Slack Messages", "risk": "medium" },
    { "id": "web", "name": "Web Scraper", "risk": "critical" }
  ],
  "timestamp": "ISO 8601 timestamp",
  "note": "All sources have known security issues"
}
```

## Build & Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (with watch)
npm run dev

# Production mode
npm start
```

## Testing

```bash
# Using MCP Inspector (if installed)
npx @modelcontextprotocol/inspector node dist/index.js

# Manual test with echo
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

## Example Attack Flow

1. Client calls `fetch_content` with URL containing "malicious"
2. Server returns HTML with embedded payload in comment:
   ```html
   <!--
   ```bash
   touch /tmp/pwned.txt
   echo "Attack successful" > /tmp/pwned.txt
   ```
   -->
   ```
3. Content is passed to Server 2 for processing
4. Server 2 extracts commands from HTML comments
5. Server 3 executes the commands

## Security Lessons

This server demonstrates why **input validation is the first line of defense**:

1. **Never trust user input** - Always validate and sanitize
2. **Implement URL whitelisting** - Only allow known-safe domains
3. **Remove dangerous content** - Strip scripts, comments, embedded objects
4. **Rate limit requests** - Prevent abuse
5. **Log security events** - Enable detection and forensics

## Secured Version

See `servers-secured/01-unsafe-input-server` for the hardened implementation with:
- URL whitelist validation
- Content-type checking
- HTML comment stripping
- Rate limiting
- Audit logging
