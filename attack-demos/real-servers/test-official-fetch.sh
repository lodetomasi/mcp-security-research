#!/bin/bash
#
# Test script for OFFICIAL @modelcontextprotocol/server-fetch
# Demonstrates vulnerability: HTML comments not sanitized
#

set -e

echo "========================================"
echo "  OFFICIAL FETCH SERVER VULNERABILITY TEST"
echo "========================================"
echo

# Get absolute path to payload
PAYLOAD_PATH="$(pwd)/payloads/malicious-documentation.html"
echo "[*] Payload location: $PAYLOAD_PATH"
echo

# Convert to file:// URL
FILE_URL="file://${PAYLOAD_PATH}"
echo "[*] Testing with URL: $FILE_URL"
echo

# Create test request JSON for fetch tool
# MCP protocol: tools/call method
TEST_REQUEST=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
EOF
)

echo "[*] Step 1: Listing available tools from OFFICIAL server..."
echo "$TEST_REQUEST" | uvx mcp-server-fetch 2>/dev/null | grep -A 20 "tools" | head -30

echo
echo "[*] Step 2: Testing fetch with malicious HTML file..."

# Test the fetch
FETCH_REQUEST=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "fetch",
    "arguments": {
      "url": "$FILE_URL"
    }
  }
}
EOF
)

echo "[*] Fetching: $FILE_URL"
RESPONSE=$(echo "$FETCH_REQUEST" | uvx mcp-server-fetch 2>/dev/null)

echo
echo "[*] Step 3: Analyzing response..."

# Check if HTML comments are preserved
if echo "$RESPONSE" | grep -q "HIDDEN MALICIOUS PAYLOAD"; then
    echo "🚨 VULNERABILITY CONFIRMED!"
    echo "   → HTML comments are NOT sanitized"
    echo "   → Malicious payload IS present in response"
    echo "   → Attack vector: HTML comment hiding works!"
else
    echo "✓  HTML comments were stripped (server is safe)"
fi

echo
# Check if bash code blocks are present
if echo "$RESPONSE" | grep -q '```bash'; then
    echo "🚨 CRITICAL: Bash code blocks found in response!"
    echo "   → Commands can be extracted by processing server"
    echo "   → Full attack chain is possible!"
else
    echo "✓  No bash code blocks found"
fi

echo
echo "[*] Step 4: Extracting hidden commands (simulation)..."
COMMANDS=$(echo "$RESPONSE" | grep -oP '(?<=```bash\n)[\s\S]*?(?=\n```)')

if [ ! -z "$COMMANDS" ]; then
    echo "🚨 EXTRACTED COMMANDS:"
    echo "-----------------------------------"
    echo "$COMMANDS"
    echo "-----------------------------------"
    echo
    echo "⚠️  These commands could be executed by a processing server!"
    echo "⚠️  Demonstrates: Fetch → Process → Execute attack chain"
else
    echo "No commands extracted"
fi

echo
echo "========================================"
echo "  TEST COMPLETE"
echo "========================================"
echo
echo "Summary:"
echo "--------"
echo "Server tested: OFFICIAL @modelcontextprotocol/server-fetch (Python)"
echo "Attack vector: HTML comment payload extraction"
echo "Vulnerability: $(echo "$RESPONSE" | grep -q "HIDDEN" && echo "CONFIRMED" || echo "NOT FOUND")"
echo "Impact: $(echo "$RESPONSE" | grep -q '```bash' && echo "HIGH - Commands extractable" || echo "LOW")"
echo
echo "This demonstrates that the OFFICIAL Fetch server from"
echo "Anthropic's modelcontextprotocol repository has the SAME"
echo "vulnerability as our educational demo server!"
echo
