---
title: Swapping
description: How Coven prices a trade and what protects the person making it.
---

## Finding a route

For any pair, Coven checks:

- Uniswap v3 pools at all four fee tiers: 0.01%, 0.05%, 0.3% and 1%.
- Uniswap v4 pools without swap hooks, at the same tiers.
- v4 pools whose hook Coven allows, priced through Uniswap's own quoter because the hook decides the outcome.
- Two-hop routes through USDC or EURC, for pairs with no direct pool.

Every candidate is priced by running Uniswap's swap math against the pool's current state, so the result reflects liquidity depth and price impact rather than the fee alone. The route with the largest output wins. A 0.3% pool with deep liquidity often beats a 0.05% pool without it.

All of this happens in a single call to the lens contract, which reads state and never writes any.

## Price impact

Every quote carries a limit on how far a trade may move a pool's price, 5% by default. A pool that cannot absorb the whole amount inside that limit is skipped rather than quoted at a terrible rate.

```ts
const quote = await coven.quote({
  tokenIn: USDC,
  tokenOut: token,
  amountIn: 100_000_000n,
  maxImpactBps: 200, // 2%
})
```

When no route fits, the SDK throws `CovenError` with the code `NO_ROUTE`. For a large trade in a thin market, lowering the amount usually helps more than raising the limit.

## Slippage

`slippageBps` sets how far below the quote the result may land before the transaction reverts. The default is 50, which is 0.5%.

```ts
await coven.swap({ wallet, tokenIn, tokenOut, amountIn, slippageBps: 100 })
```

The minimum is enforced by the router after fees, so what you compare against the quote is what the recipient actually receives.

## Partial fills are refused

If a pool runs dry partway through a trade, the transaction reverts rather than filling part of the order. A quote that says 1,000 tokens is a quote for the whole amount, not for as much as the pool could manage.

## Before signing

`swap` simulates the transaction first. Tokens that block transfers or selling still produce a normal-looking quote, and they fail the simulation instead of costing the user gas. For anything freshly launched, this is the check that matters.

## Approvals

The SDK approves the router for exactly the amount being swapped, and only when the existing allowance is too small. No unlimited approvals are requested. The router can only ever pull tokens from the address that called it, so an approval to it cannot be used by anyone else.

## Sending to someone else

```ts
await coven.swap({ wallet, tokenIn, tokenOut, amountIn, recipient: '0x...' })
```

## What a quote contains

| Field | Meaning |
| --- | --- |
| `amountOut` | What the recipient receives, after all fees |
| `hops` | The route, one entry per pool |
| `feeToken` | The token fees were taken in |
| `platformFee` | Coven's fee, in `feeToken` |
| `integratorFee` | Your fee, in `feeToken`, if you set one |
