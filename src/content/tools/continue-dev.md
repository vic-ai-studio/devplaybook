---
title: "Continue.dev — Open-Source AI Coding Assistant for VS Code & JetBrains"
description: "Continue is an open-source AI code assistant that integrates directly into VS Code and JetBrains IDEs. Connect any LLM — Claude, GPT-4, Mistral, or local models — for inline autocomplete and chat."
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
