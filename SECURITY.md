# Security Policy

## Supported versions

This project is pre-1.0; only the latest release on `main` receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.3.x   | ✅        |
| < 0.3   | ❌        |

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

## Rotating and revoking the Exa API key

`EXA_API_KEY` is read **once at server startup** and sent to Exa only as an
`Authorization: Bearer` header over HTTPS — it is never logged or written to disk. Because it is
read once, changing it requires a **server restart**; there is no hot reload.

### Routine rotation

1. Create a new key in the Exa dashboard.
2. Update `EXA_API_KEY` wherever it is configured for this server — the MCP client's server
   definition (e.g. the `env` block in the Claude Desktop / Claude Code config), a container or
   orchestrator secret, or `.env` for local development.
3. Restart the MCP server so it re-reads the key.
4. Verify with a research-backed tool call (`verify_research` or `perspective_shifter`). This
   requires `ENABLE_RESEARCH_INTEGRATION=true` **in addition to** the key — with the flag off,
   those tools report "research integration disabled" regardless of the key. A successful call
   confirms the new key works.
5. Revoke the old key in the Exa dashboard.

### Emergency revocation (suspected compromise)

1. **Revoke the exposed key first** in the Exa dashboard — that invalidates it immediately at
   Exa, regardless of what any running process still holds.
2. Then rotate to a new key (steps above). A server left holding a revoked key sees failures only
   on the two research tools (`verify_research`, `perspective_shifter`) — auth failures when
   research integration is enabled, or the "disabled" message when it is not; the other ten
   analytical tools are unaffected.

### Notes

- Store the key only in environment/secret configuration; never commit it (`.env` and `.env.test`
  are gitignored).
- Rotation currently requires a restart because a single key is wired at startup. The internal
  rate limiter can hold multiple keys per provider, so multi-key / zero-downtime rotation is a
  possible future enhancement, not a current feature.
