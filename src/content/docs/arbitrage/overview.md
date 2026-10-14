---
title: Arbitrage on Arc
description: An atomic single-chain arbitrage contract, how the bot finds and prices routes, and what a week of Arc data says about making money.
---

Coven ships an atomic arbitrage path on Arc alongside the retail router. It runs through `CovenProbe`, a sibling deployment that never touches `CovenRouter`. The retail router is unchanged by any of this.

`CovenProbe` replaced `CovenArb` in October 2026. `CovenArb` is deprecated: it still works, but the bot no longer uses it. See [the arbitrage contract](/arbitrage/contract/#covenarb-deprecated).

## What it is

`CovenProbe` takes a list of routes. For each route it checks the pools' live prices, sizes the trade on-chain, runs the swaps inside a single Uniswap v4 lock and settles. The PoolManager is the flash-loan source, so no leg needs upfront capital and the contract never holds a token between transactions. A route with no gap, or whose trade no longer pays, returns 0 instead of reverting, so a send that arrives too late costs little gas. Anyone can call it; the caller keeps the profit, less a 10% fee.

Net profit is the only number that decides anything, and it means the USDC you end up holding: profit minus gas. Gas is USDC on Arc, so that subtraction is exact rather than a currency estimate.

## What the measurement found

A week of Arc data (5–12 October 2026) held about $11,600 of closed-cycle arbitrage. Four findings shaped the design.

- **Arc orders transactions by descending priority fee.** Blocks come every 0.5 s, the base fee sits at 20 gwei, and there is no visible mempool.
- **Bidding gives the profit away.** Bots that reacted to a swap and bid priority fees won many contested races, but paid a median 81% of what they won in fees. Bots that sent at zero priority fee, and only when their contract found a profit, kept most of theirs.
- **Probing every block is too expensive for most routes.** The two largest operators send one transaction per block whether or not there is anything to take. At 88k gas that is about $300 a day, nearly all of what is left for anyone else: excluding each route's largest single win, about $350 a day went to someone other than them.
- **The largest repeatable source was a fair-launch hook.** Some v4 hooks collect swap fees in the pool's token and sell them to the next swapper at the pool price. Buying that inventory and selling it back is profitable whenever enough has built up, and two operators harvest it within a block or two.

So the bot simulates every candidate route through `CovenProbe` once per block, which costs nothing, and sends only what pays for its gas, at zero priority fee. In a 20-hour simulation in October 2026, that strategy netted $4.00 when sends landed in the block after the gap appeared, and lost $0.59 when they landed a block later. Latency decides the result.

## How a route is priced

Within a tick range a pool is constant product with virtual reserves, so a cycle's best trade size can be estimated in closed form. That estimate only decides which cycles are worth simulating. It cannot see tick crossings, thin liquidity just past the current range, or fees a hook charges.

The chain decides instead. A simulated call to `CovenProbe.probe` runs the real trade against the latest block, so the profit it returns is exact after every tick, hook and fee, including the contract's own cut. A two-leg cycle is sized on-chain: the first swap stops at the price where both pools' fee-adjusted prices meet, and the pool handles tick crossings itself. Every candidate goes into one round of calls per block, and nothing is sent that the chain has not priced.

`CovenLens` is not used for discovery. It only knows hookless pools at standard fee tiers, which leaves out most of what trades on Arc. Pools are found from swap events instead, as described in [the CLI](/arbitrage/cli/#how-a-trade-is-found).

## Contracts

`CovenProbe` is deployed at `0x179606809c8611BebFAC04357f0B4E0Fb8b6479E`. See [the arbitrage contract](/arbitrage/contract/) for the execution flow and the checks that protect it. The command line tool that runs the bot is described in [the CLI](/arbitrage/cli/).
