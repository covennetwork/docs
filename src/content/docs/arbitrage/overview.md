---
title: Arbitrage on Arc
description: An atomic single-chain arbitrage executor, the sizing solver behind it, and what the measurement found.
---

Coven ships an atomic arbitrage path on Arc alongside the retail router. It is a sibling deployment, `CovenArb`, and it never touches `CovenRouter`. The retail router is unchanged by any of this.

The arb path was covered by [the September 2026 security assessment](/reference/security-review/). Keep approvals scoped and balances small.

## What it is

`CovenArb` executes a fixed list of swap legs inside a single Uniswap v4 lock, so the PoolManager is the flash-loan source and no leg needs upfront capital. A plan is a literal instruction list produced off chain by the solver; the contract makes no routing decisions. Two legs cover a v3 to v4 spread, three cover a triangle. The contract never holds a token between transactions, and it pays out only the realized profit.

Net profit is the only number that decides anything, and it means the USDC you end up holding: expected output minus gas. Gas is USDC on Arc, so that subtraction is exact rather than a currency estimate.

## What the measurement found

Before writing the executor we measured the live chain. Two results matter for anyone deciding whether to run this.

Arc orders transactions within a block by descending priority fee. Over a sample of a few hundred blocks, almost every block was sorted that way, across hundreds of distinct fee values. Arc runs a priority auction, not arrival order. Winning a contested opportunity means out-bidding on priority fee, not arriving first. A reverted attempt costs about 0.007 USDC, so losing a race is cheap, but a crowded opportunity still produces one winner and many gas bills. The viable target is the long tail of launchpad pools that nobody fast is watching.

On the public endpoint the observable opportunity set was close to empty. Launchpad tokens exist in large numbers, but most have a single USDC pool or duplicate pools with no liquidity, so there is nothing to arbitrage against. A real assessment needs a private endpoint and several days of collection. Run the measurement yourself before risking gas.

## The solver

Within a tick range a pool is constant product with virtual reserves, so the optimal trade size has a closed form. The solver sizes each opportunity against real depth rather than a mid-price gap, because a wide gap on a pool holding a few dollars is not a few dollars of profit. Where a hook can affect a swap, the closed form does not apply and the solver searches numerically against the on-chain simulator instead. Every result is checked against `CovenLens`, the same simulator the retail router prices against.

## Contracts

`CovenArb` is deployed separately from the retail contracts, at `0xFFAEFEA08cD27e9f0CA6A7e7ce3047e924cb663e`. See [the arbitrage contract](/arbitrage/contract/) for the execution flow and the checks that protect the callback. The command line tool that runs the solver is described in [the CLI](/arbitrage/cli/).
