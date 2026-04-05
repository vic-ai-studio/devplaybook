---
title: "Continue.dev — Open-Source AI Coding Assistant for VS Code & JetBrains"
description: "Open-source AI code assistant for VS Code and JetBrains — connect any LLM (Claude, GPT-4, Mistral, or local models) for autocomplete and chat."
category: "AI Coding"
pricing: "Open Source"
pricingDetail: "Free (you supply your own API keys or use local models)"
website: "https://continue.dev"
github: "https://github.com/continuedev/continue"
tags: ["ai-coding", "vscode", "jetbrains", "open-source", "autocomplete", "llm", "local-models"]
pros:
  - "Works with any LLM — Anthropic, OpenAI, Ollama, LM Studio, etc."
  - "Full IDE integration: inline autocomplete, chat sidebar, edit commands"
  - "100% open source — no data sent to Continue servers"
  - "Supports local/private models for sensitive codebases"
  - "Custom slash commands and context providers"
  - "Active development; JetBrains support added in 2024"
cons:
  - "Quality depends heavily on the LLM you connect"
  - "Initial setup requires configuring API keys or local model"
  - "Less polished UX than Cursor or GitHub Copilot"
  - "JetBrains support still maturing"
date: "2026-03-24"
---

## What is Continue?

Continue is an open-source AI coding assistant that plugs into VS Code or JetBrains IDEs. Unlike GitHub Copilot (locked to OpenAI) or Cursor (a full fork), Continue works as an extension and lets you connect *any* LLM — cloud or local.

## Key Features

- **Inline autocomplete**: Tab-to-accept suggestions as you type
- **Chat sidebar**: Ask questions about your code or request edits in context
- **Edit mode**: Highlight code → describe what to change → see a diff
- **Codebase context**: Index your repo so the model understands your project structure
- **Custom commands**: Define `/refactor`, `/test`, `/explain` shortcuts

## Setup

```bash
# Install in VS Code
code --install-extension Continue.continue
```

Then configure `~/.continue/config.json` to point to your preferred LLM:

```json
{
  "models": [{
    "title": "Claude 3.5 Sonnet",
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "apiKey": "YOUR_KEY"
  }]
}
```

## Pricing

Continue itself is completely free. You only pay for the API tokens consumed by the LLM you connect. With a local model (Ollama + CodeLlama), the cost is $0.

## Best For

- Developers who want Copilot-like features without vendor lock-in
- Teams handling sensitive code who need local/private model support
- Power users who want to fine-tune which model handles which task

## Quick Start

Install the VS Code extension, then configure your LLM in `~/.continue/config.json`. You can use a cloud model, a local Ollama instance, or both:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "sk-ant-..."
    },
    {
      "title": "Local Llama (Ollama)",
      "provider": "ollama",
      "model": "llama3.2"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen Coder (fast)",
    "provider": "ollama",
    "model": "qwen2.5-coder:3b"
  }
}
```

Use `Cmd+I` for inline edits, `Cmd+L` to open the chat sidebar, and `Tab` to accept completions. Use `@file` in chat to reference a specific file, `@codebase` to search across the indexed repo.

## Use Cases

**Privacy-sensitive codebases**: For companies with strict data policies, Continue + Ollama is the only Copilot-style workflow that keeps all code on-premise. The extension sends nothing to Continue's servers — only to whichever LLM endpoint you configure.

**Cost optimization with model tiering**: Configure a fast, cheap model (Qwen 2.5 Coder 3B on Ollama) for tab autocomplete, and a more capable cloud model (Claude Sonnet) for chat and complex edits. This keeps costs low for the high-volume completions while preserving quality for reasoning tasks.

**JetBrains users**: For IntelliJ, PyCharm, or GoLand developers who can't switch to VS Code or Cursor, Continue is one of the few AI coding tools with real JetBrains support — giving them inline completions and chat in their existing IDE.

**Custom slash commands for your team**: Define project-specific commands in `config.json` — `/pr-description`, `/api-docs`, `/migration` — that run a custom prompt with your team's standards baked in. This lets you standardize how AI assistance is used across the team.
