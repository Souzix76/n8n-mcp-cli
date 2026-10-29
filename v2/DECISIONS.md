# v2 architecture decision: MCP and CLI are complementary

## Decision

The v2 product should provide two interfaces over the same core engine:

1. MCP interface for AI-driven inspection, reasoning and recommendations
2. CLI interface for automation, QA, CI and operational checks

## Reasoning

The market already has many "workflow builder" MCP projects. The v2 should avoid competing in that saturated space.

Instead, the v2 should own the operational trust layer:
- validate workflow health
- explain failures
- classify risk
- recommend safe next steps
- support secure release workflows

## Architectural model

Core engine
- safety policy
- validation rules
- execution diagnostics
- health scoring
- reports
- recommendations

MCP facade
- AI friendly
- contextual and conversational
- read-only by default
- explainable and safe

CLI facade
- automation friendly
- scriptable and CI ready
- environment-aware
- report export oriented
- dry-run / read-only enforceable

## Product outcome

This gives us a stronger strategic identity than a standalone tester or a standalone MCP builder.
The v2 becomes a trustworthy operational layer for n8n, not just a helper for AI workflow generation.
