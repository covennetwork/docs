---
title: Contracts
description: Addresses, what the owner can do, and what protects users.
---

Two contracts on Arc mainnet, chain 5042.

| Contract | Address |
| --- | --- |
| CovenRouter | `0xA13b8d54E2fD03319f0f7dB036090bD593f53161` |
| CovenLens | `0xc041C0748c5e5a5362E03097c53a59Dd0004Fa96` |

`CovenRouter` executes swaps and holds the settings. `CovenLens` prices routes and stores nothing; apps call it read-only.

The contracts have not been audited.

## What protects users

- The router holds no funds between transactions.
- It can only pull tokens from whoever called it, so an approval given to it cannot be spent by anyone else.
- The SDK approves the exact swap amount rather than an unlimited allowance.
- Approvals the router gives Uniswap and CCTP cover one call and are cleared afterwards.
- Every swap checks a minimum output after fees.
- A pool that cannot fill the whole amount causes a revert instead of a partial fill.
- Neither contract can be upgraded.

## What the owner can do

The owner is a Safe multisig. It can:

- change the platform fee, within the 1% cap
- change the address that receives fees
- allow or remove v4 hooks and hook templates
- pause and unpause swaps
- set the guardian
- recover tokens sent to the router by mistake

None of that reaches a user's wallet. The worst a compromised owner could do is raise the fee to 1%, redirect fee income, or allow a hostile hook, and a hostile hook can take at most what a trader's own slippage setting permits.

Ownership transfers happen in two steps, and ownership cannot be renounced.

The guardian can pause swaps but cannot unpause them. A pause stops new swaps and touches nobody's funds.

## Hooks on Uniswap v4

A v4 pool can attach a hook, and a hook with swap permissions can change what a trader receives. Coven routes through such pools only when the owner has allowed the hook, either individually or through a template that matches a launchpad's hook code. Pools whose hooks cannot affect swaps need no approval.

## Contracts Coven uses

| Contract | Address |
| --- | --- |
| USDC | `0x3600000000000000000000000000000000000000` |
| Uniswap v3 factory | `0xf0db7b58379503491d857dB50AC9ece64c653918` |
| Uniswap SwapRouter02 | `0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77` |
| Uniswap v4 PoolManager | `0x8366a39CC670B4001A1121B8F6A443A643e40951` |
| CCTP TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |

## Sibling deployments

Two contracts sit beside the retail router and do not change it. Both are unaudited.

`CovenArb` runs atomic arbitrage. It is deployed separately with a zero fee and holds no funds between transactions. See [the arbitrage contract](/arbitrage/contract/). `CovenSession` bounds an agent's spending on chain for the MCP write path, and every session is created through a `CovenSessionFactory` that pins the canonical router and lens so a lookalike cannot pass. See [sessions](/mcp/write/). A session trades only pairs with USDC on one side, so its caps stay measurable; it cannot trade token to token. Their addresses are recorded here and in the packages once each is deployed.
