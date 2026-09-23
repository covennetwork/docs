---
title: Contracts
description: Addresses, what the owner can do, and what protects users.
---

Four contracts on Arc mainnet, chain 5042, deployed 23 September 2026.

| Contract | Address |
| --- | --- |
| CovenRouter | `0x5b86f1e5d95eFe358004B4484bF0a8C386c419a8` |
| CovenLens | `0x098Bb65C8aBBfF80c91e2A72A4A1439D31770fed` |
| CovenSessionFactory | `0xC7d8306A78e91d0C4fA0e5Ad6D1278A73767b057` |
| CovenArb | `0xFFAEFEA08cD27e9f0CA6A7e7ce3047e924cb663e` |

`CovenRouter` executes swaps and holds the settings. `CovenLens` prices routes and stores nothing; apps call it read-only. `CovenSessionFactory` creates the per-user session contracts the MCP write path uses. `CovenArb` runs atomic arbitrage and is independent of the other three.

`@covennetwork/core` exports all four as `COVEN_ROUTER`, `COVEN_LENS`, `COVEN_SESSION_FACTORY` and `COVEN_ARB`, and the SDK uses them by default. You should not need to paste an address anywhere.

These contracts were reviewed in September 2026 and the findings were fixed before this deployment. See [the security assessment](/reference/security-review/).

An earlier router and lens pair, deployed 19 September 2026 at `0xA13b8d54…` and `0xc041C074…`, is still on chain and still works, but it predates the review and should not be used. Nothing migrates automatically; point your integration at the addresses above.

## What protects users

- The router holds no funds between transactions, apart from fees that could not be paid out.
- It can only pull tokens from whoever called it, so an approval given to it cannot be spent by anyone else.
- The SDK approves the exact swap amount rather than an unlimited allowance.
- Approvals the router gives Uniswap and CCTP cover one call and are cleared afterwards.
- Every swap checks a minimum output after fees.
- A pool that cannot fill the whole amount causes a revert instead of a partial fill.
- None of the contracts can be upgraded.

## What the owner can do

The owner is a Safe multisig. It can:

- change the platform fee, within the 1% cap
- change the address that receives fees
- allow or remove v4 hooks and hook templates
- pause and unpause swaps
- set the guardian
- recover tokens sent to the router by mistake, except fees owed to someone else

None of that reaches a user's wallet. The worst a compromised owner could do is raise the fee to 1%, redirect fee income, or allow a hostile hook, and a hostile hook can take at most what a trader's own slippage setting permits.

Ownership transfers happen in two steps, and ownership cannot be renounced.

The guardian can pause swaps but cannot unpause them. A pause stops new swaps and touches nobody's funds.

The fee recipient is a different address from the owner on purpose. Arc USDC can be frozen by its issuer, and if one address were both, a freeze would take out the fee income and the key that would rotate it at the same time.

## Fees that cannot be delivered

Fees are paid during the swap. If a payment fails, because the recipient has been frozen for instance, the amount is credited to that recipient instead of reverting, and they withdraw it later with `claimFees`. A fee recipient who cannot receive a token therefore cannot stop anyone else from trading. Credited fees are reserved: the owner's recovery function can only take what is left over.

## Hooks on Uniswap v4

A v4 pool can attach a hook, and a hook with swap permissions can change what a trader receives. Coven routes through such a pool only when the owner has allowed the hook, either individually or through a template that matches a launchpad's hook code.

Dynamic-fee pools need the same approval even when their hook holds no swap permissions, because the hook can still move the pool's fee, up to 100%, at any moment. Only a pool with a static fee and a hook that cannot intervene in a swap routes without a check.

A template masks the few constants a launchpad varies per token and requires everything else to match byte for byte. Each masked position covers exactly the bytes its constant occupies, and registration walks the reference contract's bytecode and refuses any mask that would reach into executable code. A template also records the hook's permission bits, so identical code deployed at an address with different permissions is treated as a different hook and is not admitted.

Masking a constant means a matching hook may set it to anything. Registering a template is a decision about those values as much as about the code.

## Contracts Coven uses

| Contract | Address |
| --- | --- |
| USDC | `0x3600000000000000000000000000000000000000` |
| Uniswap v3 factory | `0xf0db7b58379503491d857dB50AC9ece64c653918` |
| Uniswap SwapRouter02 | `0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77` |
| Uniswap v4 PoolManager | `0x8366a39CC670B4001A1121B8F6A443A643e40951` |
| CCTP TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |

## Sessions and arbitrage

`CovenSession` bounds an agent's spending on chain for the MCP write path. Every session is created through `CovenSessionFactory`, which pins the canonical router and lens so a lookalike cannot pass, and owns each session to whoever sent the creating transaction. A session trades only pairs with USDC on one side, so its caps stay measurable; it cannot trade token to token. See [sessions](/mcp/write/).

`CovenArb` runs atomic arbitrage. It is permissionless, holds no funds between transactions, and keeps 10% of realized profit. It never touches `CovenRouter`. See [the arbitrage contract](/arbitrage/contract/).
