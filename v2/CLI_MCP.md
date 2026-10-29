# v2 CLI + MCP combination

## Why both layers matter

The v2 should not be a single interface. It should have two complementary surfaces:

- MCP for AI-assisted assistance and contextual interaction
- CLI for automation, QA, CI and operational checks

## MCP role

The MCP layer is the conversational layer. It helps with:
- summarizing workflow status
- obtaining execution insights
- suggesting safer next steps
- answering natural-language questions about health and risk

## CLI role

The CLI layer is the operational layer. It helps with:
- running suites in CI
- validating workflow quality in a release pipeline
- exporting reports in multiple formats
- enforcing read-only safety rules
- allowing automation without a human-driven chat session

## Shared core

Both layers use the same underlying v2 core:
- safety policy
- validation engine
- health scoring
- recommendation engine
- reporting model
- error and retry logic

## Final product principle

The v2 is a secure workflow health system with two front doors:
- one intelligence-first (MCP)
- one automation-first (CLI)

That gives the product a real operational identity.
