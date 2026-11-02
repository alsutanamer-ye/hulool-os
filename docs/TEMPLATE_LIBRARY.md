# Hulool CLI Template Library

## Overview

Hulool CLI includes a unified template library for:

- Prompts
- Tools
- Skills
- Plugins
- Modules

The template system allows users to create, import, export, validate, and apply reusable AI agent configurations.

---

## Template Types

| Type | Purpose |
|---|---|
| prompt |Reusable system prompts and model presets |
| tool | Tool definitions for agent function calling or MCP |
| skill | Capability bundles that can be attached to agents |
| plugin | External integration packages |
| module | Workflow or orchestration modules |

---

## Directory Structure

```text
templates/
├── prompts/
│   ├── researcher.json
│   ├── writer.json
│   └── index.json
├── tools/
│   └── index.json
├── skills/
│   ├── code-review.json
│   └── index.json
├── plugins/
│   └── index.json
└── modules/
    └── index.json
```

---

## Prompt Template Schema

```json
{
  "id": "prompt-researcher",
  "name": "Research Analyst",
  "type": "prompt",
  "description": "Expert research analyst",
  "tags": ["research", "analysis"],
  "config": {
    "systemPrompt": "You are an expert research analyst...",
    "model": "gpt-4",
    "temperature": 0.7
  },
  "dependencies": [],
  "metadata": {
    "version": "1.0.0",
    "author": "hulool-team",
    "license": "MIT"
  }
}
```

---

## Compatibility Rules

When applying a prompt template to an agent:

1. Template type must be `prompt`.
2. `config.systemPrompt` must exist and be non-empty.
3. Required models are checked against the agent model.
4. Required skills are compared with the agent skills.
5. Conflicting roles or capabilities block application.
6. Warnings can be overridden with `--force`.

---

## CLI Commands

### List templates

```bash
hulool template list
```

### Search templates

```bash
hulool template search research
```

### Apply template to existing agent

```bash
hulool template apply prompt-researcher test-agent
```

### Create agent from template

```bash
hulool template create-agent prompt-writer "My Writer" --budget 150
```

### Export agent as template

```bash
hulool template export test-agent
```

### Rebuild indexes

```bash
pnpm templates:index
```

---

## Import Rules

 Imported templates must include:

- `id`
- `name`
- `type`
- `config`
- `metadata`

Prompt templates without `config.systemPrompt` are rejected.

---

## Best Practices

1. Keep prompts focused on one role.
2. Use tags for discoverability.
3. Add compatibility requirements when needed.
4. Prefer small composable skills over large monolithic templates.
5. Rebuild indexes after manual file edits.

