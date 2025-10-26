#!/bin/bash
# MCP Security Demo - Setup Script

set -e

echo "🔧 MCP Security Demo - Setup"
echo "=============================="

# Create sandbox directory
echo "📁 Creating sandbox directory..."
mkdir -p /tmp/mcp-demo-sandbox
chmod 755 /tmp/mcp-demo-sandbox
echo "✓ Sandbox created at /tmp/mcp-demo-sandbox"

# Create results directory
echo "📁 Creating results directory..."
mkdir -p results
touch results/.gitkeep
echo "✓ Results directory ready"

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
touch logs/.gitkeep
echo "✓ Logs directory ready"

# Copy environment file
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✓ .env file created"
else
  echo "⚠️  .env file already exists, skipping"
fi

# Verify Node.js version
echo "🔍 Verifying Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required (current: $(node -v))"
  exit 1
fi
echo "✓ Node.js version OK ($(node -v))"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. npm run dev:unsafe    # Start unsafe servers"
echo "  2. npm run monitor       # Start monitoring dashboard"
echo "  3. npm run demo:attack   # Run attack demonstration"
echo ""
