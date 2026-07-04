# Contributing to Analytical MCP Server

Thanks for your interest in contributing. This guide covers the essentials; see
[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the full development reference.

By participating, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting started

Requires Node.js ≥ 20.

```bash
npm install
npm run build
```

`EXA_API_KEY` is **not** required for the analytical core or the unit tests — only the
research-backed tools (`verify_research`, `perspective_shifter`) use it at call time.

## Development loop

Before opening a pull request, all of these must pass:

```bash
npm run typecheck      # tsc, 0 errors
npm run lint           # ESLint, 0 errors
npm test               # offline unit suite (no API key, no network)
npm run smoke          # builds, then drives initialize/tools-list/tools-call over real stdio
```

CI runs typecheck + lint + unit tests + smoke on Linux and Windows × Node 20/22.

## Conventions

- **ES modules**: relative imports use a `.js` extension even in `.ts` files.
- **ESM Jest**: `jest.mock()` does not work. Use
  `import.meta.jest.unstable_mockModule('<path>.js', factory)` before a dynamic
  `await import()`, or avoid mocks (most analytical code is pure and needs none).
- **stdio is the protocol channel**: never write to stdout — use `Logger` (which writes
  to stderr). A stray `console.log` corrupts the JSON-RPC stream.
- **Determinism**: analytical tools must compute real results — no `Math.random()` in
  analytical paths, no fabricated numbers, no mocked statistics.
- **No backup copies**: edit the canonical file; don't create `.fixed.ts` / `.updated.ts`
  variants. Git is the history.
- TypeScript strict, explicit return types, 100-char lines, 2-space indent, single quotes.

## Adding or changing a tool

Each tool lives in `src/tools/`, exporting a Zod schema and a handler. Register it in the
`toolRegistrations` array in `src/tools/index.ts` — a tool is not exposed until it is there.
Then extend `src/__tests__/server_protocol.test.ts` (the real client↔server protocol test)
and run `npm run smoke`.

## Pull requests

1. Branch from `main` (`feature/...` or `fix/...`).
2. Make focused commits with clear messages.
3. Ensure the four checks above are green and add tests for new behavior.
4. Open a PR using the template; describe the change and how you verified it.
5. CI must pass before merge.

## Reporting bugs and requesting features

Use the issue templates (Bug report / Feature request). For security vulnerabilities, do
**not** open a public issue — see [SECURITY.md](./SECURITY.md).
