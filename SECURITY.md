# Security Policy

## Supported versions

This project is pre-1.0; only the latest release on `main` receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions,
or pull requests.**

Report privately through GitHub's built-in private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (Security advisories →
   [Report a vulnerability](https://github.com/quanticsoul4772/analytical-mcp/security/advisories/new)).
3. Include a description, reproduction steps, affected version, and impact.

You should receive an acknowledgement within a few days. We will confirm the issue, work on
a fix, and coordinate disclosure with you.

> If private reporting is not enabled on the repository, ask the maintainer
> ([@quanticsoul4772](https://github.com/quanticsoul4772)) to enable it under
> **Settings → Security → Private vulnerability reporting** rather than filing a public issue.

## Scope notes

- The server runs over **stdio** and exposes analytical tools to the MCP client that
  spawns it; it does not open a network listening socket for the protocol itself.
- The optional metrics HTTP server is **off by default** (`METRICS_ENABLED=false`; opt-in) and
  binds to `127.0.0.1` when enabled. It serves cache/system metrics with **no authentication**,
  so enable it, and expose it beyond localhost (`METRICS_HOST=0.0.0.0`), only deliberately.
- `EXA_API_KEY` and any secrets are read from environment variables and must never be
  committed. `.env` and `.env.test` are gitignored.
