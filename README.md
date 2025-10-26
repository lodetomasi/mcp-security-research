# MCP Security Demonstration

Educational project demonstrating security vulnerability chains in Model Context Protocol (MCP) server architectures.

## Overview

This project demonstrates how vulnerabilities can chain across multiple MCP servers, highlighting the importance of security validation at each layer. It includes both vulnerable and secured implementations for comparison.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                             │
│                  (Attack Coordinator)                        │
└────┬──────────────────┬──────────────────┬──────────────────┘
     │                  │                  │
     v                  v                  v
┌─────────┐      ┌─────────────┐    ┌──────────────┐
│ Server 1│      │  Server 2   │    │   Server 3   │
│ Input   │─────▶│ Processing  │───▶│  Execution   │
│(Fetch)  │      │  (Parse)    │    │   (Shell)    │
└─────────┘      └─────────────┘    └──────────────┘
     │                  │                  │
     │ No validation    │ Weak validation  │ Accepts from #2
     │                  │                  │
     └──────────────────┴──────────────────┴────▶ Vulnerability Chain
```

## Attack Flow

1. **Input Server**: Fetches content without URL validation
2. **Processing Server**: Extracts commands without content sanitization
3. **Execution Server**: Executes commands without re-validation
4. **Result**: Command injection successful

## Project Structure

```
/mcp-security-demo
├── servers/              # Unsafe MCP server implementations
│   ├── 01-unsafe-input-server
│   ├── 02-processing-server
│   └── 03-execution-server
├── servers-secured/      # Hardened implementations
├── orchestrator/         # Attack automation & demos
├── monitoring/           # Real-time dashboard
├── scripts/              # Setup & utility scripts
├── tests/                # Integration & security tests
└── docs/                 # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (optional)

### Installation

```bash
# Clone and setup
git clone <repo-url>
cd mcp-security-demo
npm run setup

# This will:
# - Install all dependencies
# - Build all servers
# - Create sandbox directory
# - Setup environment
```

### Running the Demo

```bash
# Terminal 1: Start unsafe servers
npm run dev:unsafe

# Terminal 2: Start monitoring dashboard
npm run monitor

# Terminal 3: Run attack demonstration
npm run demo:attack
```

### Compare Secured vs Unsafe

```bash
# Run side-by-side comparison
npm run demo:compare

# Or start secured servers
npm run dev:secured
```

## Attack Scenarios

### Scenario 1: Simple Command Injection
Demonstrates basic command injection through HTML comment payload.

### Scenario 2: Multi-Step Attack
Simulates privilege escalation with staged payloads.

### Scenario 3: Data Exfiltration
Shows how data can be extracted from the sandbox.

## Security Mitigations

The secured version implements:

- **Input Server**: URL whitelist, content-type validation, HTML sanitization
- **Processing Server**: Command blocklist, user approval, shell escape
- **Execution Server**: Strict whitelist, audit logging, network isolation

## Safety Notes

This is an **educational demonstration** with built-in safety:

- All execution is **sandboxed** to `/tmp/mcp-demo-sandbox`
- Command whitelist prevents dangerous operations
- No network access from execution environment
- Auto-cleanup after demos
- Runs as non-root user

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Demo Script](./docs/DEMO_SCRIPT.md)
- [Security Analysis](./docs/SECURITY_ANALYSIS.md)
- [API Reference](./docs/API.md)

## Testing

```bash
# Run all tests
npm test

# Security-specific tests
npm run test:security

# Integration tests
npm run test:integration
```

## Development

```bash
# Clean build artifacts
npm run clean

# Clean sandbox
npm run clean:sandbox

# Build all packages
npm run build
```

## Monitoring

Access the real-time dashboard at `http://localhost:3000` after running:

```bash
npm run monitor
```

Features:
- Attack timeline visualization
- Command execution trace
- Security alert panel
- Sandbox file system view

## License

MIT - Educational purposes only

## Disclaimer

This project is for **educational and security research purposes only**. It demonstrates security vulnerabilities in a controlled, sandboxed environment. Do not use these techniques against systems without explicit authorization.

## Contributing

This is an educational demonstration. Contributions that improve the educational value or add new attack/defense scenarios are welcome.

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
