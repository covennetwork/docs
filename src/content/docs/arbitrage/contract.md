---
title: The arbitrage contract
description: How CovenArb executes a plan, and the single check that protects the callback.
---

`CovenArb` is a sibling of the retail router, deployed separately and with the opposite security posture. It is unaudited.

The address is recorded here once the contract is deployed with `feeBps = 0`. Until then, pass the address explicitly to the SDK and CLI.

## Execution

`execute(plan)` opens a Uniswap v4 lock and runs the legs in order inside the callback. Each leg's output feeds the next.

- A v4 leg calls `swap` on the PoolManager, which records the deltas without moving tokens.
- A v3 leg syncs the output currency, swaps with the PoolManager as recipient, then settles, so the output lands as a credit. The input is paid just in time inside `uniswapV3SwapCallback`, where the contract takes it from the PoolManager and hands it straight to the pool.

At the end the contract reads its own profit-token delta, requires it to be positive and at least `minProfit`, takes the fee as an ERC-6909 claim, and takes the rest to the caller. Every currency delta is zero at the end apart from the profit that was taken. The contract holds no token at any point.

## The check that matters most

`uniswapV3SwapCallback` is publicly callable and pays out on instruction. It recomputes the pool address from the factory using both token addresses and the fee tier, and requires it to equal `msg.sender`. Without this check, anyone could call it with fabricated data and drain whatever PoolManager credits are live. This is the single most important line in the contract. A callback from an address that is not a real pool reverts.

## Fees and bounds

The fee is taken off the measured profit before the caller is paid, as an ERC-6909 claim minted inside the PoolManager rather than a transfer to an external address. A blocklisted or reverting fee recipient therefore cannot kill an otherwise profitable arb. The contract ships with `feeBps = 0`.

Each leg carries a price limit. It bounds a hostile hook and also bounds gas, since a leg that exhausts liquidity would otherwise walk ticks toward the extreme price and burn far more gas than the trade is worth.

## Deploying

Use the guarded deploy script in the contracts repository. It refuses the wrong chain, refuses a non-contract owner unless explicitly overridden, and verifies the configuration after deployment. Deploy with `feeBps = 0` and run it with a small balance first.
