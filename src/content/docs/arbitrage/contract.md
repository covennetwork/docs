---
title: The arbitrage contract
description: How CovenArb executes a plan, and the single check that protects the callback.
---

`CovenArb` is a sibling of the retail router, deployed separately and with the opposite security posture. It was covered by [the September 2026 security assessment](/reference/security-review/).

| | |
| --- | --- |
| Address | `0xFFAEFEA08cD27e9f0CA6A7e7ce3047e924cb663e` |
| Fee | 10% of realized profit |

`@covennetwork/arb` exports it as `COVEN_ARB` and uses it by default. Pass `arb` to `createCovenArb` to point at a different deployment.

## Execution

`execute(plan)` opens a Uniswap v4 lock and runs the legs in order inside the callback. Each leg's output feeds the next.

- A v4 leg calls `swap` on the PoolManager, which records the deltas without moving tokens.
- A v3 leg syncs the output currency, swaps with the PoolManager as recipient, then settles, so the output lands as a credit. The input is paid just in time inside `uniswapV3SwapCallback`, where the contract takes it from the PoolManager and hands it straight to the pool.

At the end the contract reads its own profit-token delta, requires it to be positive and at least `minProfit`, takes the fee as an ERC-6909 claim, and takes the rest to the caller. Every currency delta is zero at the end apart from the profit that was taken. The contract holds no token at any point.

## The check that matters most

`uniswapV3SwapCallback` is publicly callable and pays out on instruction. It recomputes the pool address from the factory using both token addresses and the fee tier, and requires it to equal `msg.sender`. Without this check, anyone could call it with fabricated data and drain whatever PoolManager credits are live. This is the single most important line in the contract. A callback from an address that is not a real pool reverts.

## Fees and bounds

The fee is taken off the measured profit before the caller is paid, as an ERC-6909 claim minted inside the PoolManager rather than a transfer to an external address. A blocklisted or reverting fee recipient therefore cannot kill an otherwise profitable arb. The deployment keeps 10% of realized profit, and the owner can change that within a 20% cap.

Every plan names the highest fee it will accept in `maxFeeBps`, and execution reverts if the contract's fee is above it. A fee raised after you signed cannot reprice a transaction still in the mempool. `buildPlan` defaults it to the contract's own 20% cap; pass something lower to refuse a raise.

Redeeming the accrued claims means calling the PoolManager inside an unlock, so the fee recipient has to be an address that can do that.

Each leg carries a price limit. It bounds a hostile hook and also bounds gas, since a leg that exhausts liquidity would otherwise walk ticks toward the extreme price and burn far more gas than the trade is worth.

## Deploying

Use the guarded deploy script in the contracts repository, or `deploy-all.sh` at its root to deploy the whole stack in order. It refuses the wrong chain, refuses a non-contract owner unless explicitly overridden, refuses a zero fee, and verifies the configuration after deployment. Run it with a small balance first.
