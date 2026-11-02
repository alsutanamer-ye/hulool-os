# A2A Protocol - Hulool OS

## Overview

A2A means Agent-to-Agent communication. It allows Hulool agents to delegate work to other agents through validated messages.

## Message Format

Each A2A message includes:

- `messageId`
- `senderId`
- `receiverId`
- `intent`
- `action`
- `payload`
- `requiresResponse`
- `timestamp`
- `ttl`

## Supported Actions

| Action | Description | Payload |
|---|---|---|
| `research` | Ask an agent to research a topic | `{ "query": "AI trends" }` |
| `write` | Ask an agent to write content | `{ "topic": "AI", "research": "..." }` |
| `review` | Ask an agent to review content | `{ "content": "..." }` |
| `summarize` | Ask an agent to summarize text | `{ "text": "..." }` |

## CLI Usage

```bash
hulool agent delegate writer researcher research --payload '{"query":"AI trends in 2026"}'

hulool agent delegate editor writer write --payload '{"topic":"AI trends","research":"..."}'

hulool a2a logs

hulool a2a logs --json

hulool a2a logs --clear
```

## Log File

A2A messages are stored in:

```text
.hulool/a2a-log.json
```

## Safety

- All messages are validated with Zod.
- Unknown actions return an error response.
- Requests have TTL timeout.
- Sender and receiver agents must exist before delegation.
