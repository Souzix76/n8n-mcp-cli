# n8n-mcp-cli — Registry Onboarding Checklist

This document tracks the submission of `n8n-mcp-cli` to the MCP Registry (Glama / modelcontextprotocol/registry).

## Pre-Submission Requirements

### ✅ Package Metadata
- [x] `server.json` (`v2/registry/manifest.json`) created with valid schema
- [x] Name follows reverse-DNS convention: `io.github.souzix76/n8n-mcp-cli`
- [x] Description clearly explains purpose (n8n workflow validation/diagnostics)
- [x] Version matches `package.json` (2.1.9)
- [x] Repository URL points to GitHub source
- [x] Website URL provided

### ✅ Package Configuration
- [x] NPM package published: `n8n-mcp-cli@2.1.9`
- [x] Registry type: `npm`
- [x] Registry base URL: `https://registry.npmjs.org`
- [x] Identifier: `n8n-mcp-cli`
- [x] Transport: `stdio` (standard for CLI-based MCP servers)
- [x] Runtime hint: `npx`
- [x] Runtime arguments: `["mcp"]` (starts the MCP server)
- [x] Environment variables documented:
  - `N8N_BASE_URL` (required, not secret)
  - `N8N_API_KEY` (required, secret)

### ✅ Functionality Verification
- [x] MCP server starts via `npx n8n-mcp-cli@latest mcp`
- [x] Tools registered: `validate_workflow`, `get_workflow_health`, `suggest_nodes`, `diagnose_workflow`
- [x] Tools accept correct arguments and return expected schemas
- [x] Error handling for missing credentials
- [x] TypeScript types exported

### ✅ Quality Gates
- [x] All tests pass (`npm test` → 73/73)
- [x] TypeScript compiles clean (`npx tsc --noEmit`)
- [x] Lint passes
- [x] No security vulnerabilities in dependencies (`npm audit`)

### ✅ Documentation
- [x] `CLAUDE.md` with install, config, usage examples
- [x] README.md updated with MCP usage
- [x] Environment variables documented
- [x] Example configurations for Claude Desktop, Cursor, VS Code

## Registry Submission Steps

### 1. Validate Manifest Locally
```bash
# Using the official validator
npx @modelcontextprotocol/registry-validator v2/registry/manifest.json

# Or via Glama CLI
glama validate v2/registry/manifest.json
```

### 2. Publish to Registry

#### Option A: GitHub OAuth (Recommended for GitHub-hosted)
```bash
# Login to registry
glama auth login

# Publish
glama publish v2/registry/manifest.json
```

#### Option B: GitHub Actions (Automated)
Create `.github/workflows/registry-publish.yml`:
```yaml
name: Publish to MCP Registry
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Publish to MCP Registry
        uses: modelcontextprotocol/registry-publisher@v1
        with:
          manifest: v2/registry/manifest.json
          token: ${{ secrets.MCP_REGISTRY_TOKEN }}
```

### 3. Verify Publication
- [ ] Server appears at `https://glama.ai/mcp/servers/io.github.souzix76/n8n-mcp-cli`
- [ ] All tools listed and discoverable
- [ ] Installation instructions work
- [ ] Version matches published npm package

## Post-Submission

### Maintenance
- [ ] Update manifest version on every npm release
- [ ] Keep environment variable docs in sync
- [ ] Monitor registry for validation warnings
- [ ] Respond to user issues via GitHub

### Version Bump Checklist
When releasing a new version:
1. Update `package.json` version
2. Update `v2/registry/manifest.json` version
3. Run `npm publish`
4. Run `glama publish v2/registry/manifest.json`
5. Verify on Glama

## Known Issues / Limitations

| Issue | Status | Notes |
|-------|--------|-------|
| Requires n8n instance with API access | Known | Cannot run without live n8n |
| API key must have workflow read permissions | Known | Document in CLAUDE.md |
| Diagnostics requires execution history | Known | Needs at least 1 run to analyze |

## Contacts

- **Maintainer**: Souzix76 (GitHub)
- **Email**: james@primesystemslab.com
- **Repository**: https://github.com/Souzix76/n8n-mcp-cli
- **Issues**: https://github.com/Souzix76/n8n-mcp-cli/issues

## Approval

- [ ] Manifest validated
- [ ] Package published to npm
- [ ] Server published to MCP Registry
- [ ] Installation verified
- [ ] Documentation reviewed

**Submitted by**: James (CEO Agent, Prime Systems Lab)
**Date**: 2026-10-29
**Version**: 2.1.9