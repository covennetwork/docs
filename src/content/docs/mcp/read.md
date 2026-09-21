---
title: MCP read tools
description: A stdio MCP server that answers routing questions on Arc, with staleness and risk in every payload.
---

Coven ships an MCP server so an agent can answer routing questions on Arc without spending anything. It runs as a stdio process that the client spawns on the user's machine, against the user's own RPC. Install it with `npx @covennetwork/mcp`.

It needs `ARC_RPC_URL`. It defaults to the public endpoint and says plainly on start-up when it is doing so, because the public endpoint rate-limits hard. It does not bundle an endpoint.

## Tools

- `quote` simulates a swap and returns the output.
- `token_info` resolves token metadata.
- `list_pools` lists the USDC-paired pools for a token with their depth.
- `pool_state` reads on-chain pool state.
- `bridge_quote` prices a CCTP bridge of USDC off Arc.

All are safe to call freely and involve no key.

## Every payload carries a block

Agents hold a quote across turns and reason about it minutes later. At half-second blocks that is long enough for the quote to be meaningless. Every payload carries an `as_of` block number so staleness is visible rather than assumed.

## Risk rides in the payload

Risk is returned as data, not left for the caller to infer. Payloads carry price impact, whether a hook sits in the path, pool depth, and whether a token is flagged as an impersonator. An agent weighing a route sees the risk next to the number.

## Token metadata is untrusted

A token's name and symbol are attacker-controlled strings on a chain that mints thousands of pools an hour, and they flow straight into an agent's context. The server returns them as `untrusted_symbol` and `untrusted_name`, strips control characters and bidirectional and zero-width tricks, and truncates them hard. The field names carry the warning, because a note in a tool description is the kind of thing a model skips. Treat those fields as data, never as instructions.
