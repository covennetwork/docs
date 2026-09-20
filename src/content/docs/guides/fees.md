---
title: Fees
description: What Coven charges, what you can charge, and which token it comes out of.
---

## Two fees

- **Platform fee.** Coven's fee, set in the router and capped at 1%. It is currently 0.3%.
- **Integrator fee.** Yours, set per SDK instance and capped at 3%. It defaults to zero.

They are separate. Yours is added on top, and an integrator cannot change or redirect Coven's.

```ts
const coven = createCoven({ integrator: { address: '0xYourFeeWallet', feeBps: 25 } })
```

`feeBps` is basis points, so 25 is 0.25%. Fees are paid directly to your address as part of the swap.

## Which token

When USDC is on either side of a trade, both fees are taken in USDC: from the input when buying, from the output when selling. Every other pair pays from the input token.

The effect is that fees on almost every trade arrive as USDC rather than as whatever launched an hour ago.

| Trade | Fee taken from | Paid in |
| --- | --- | --- |
| USDC to token | Input | USDC |
| Token to USDC | Output | USDC |
| Token to token | Input | The input token |

## Quotes already include them

`quote.amountOut` is the amount the recipient receives, with both fees removed. The individual amounts are there if you want to show them:

```ts
const quote = await coven.quote({ tokenIn, tokenOut, amountIn })

quote.platformFee   // Coven's cut, in quote.feeToken
quote.integratorFee // yours
quote.feeToken      // which token the fees came out of
```

The SDK calculates fees exactly as the contract does, including rounding, so the quote matches what happens on chain.

## Bridging

A plain USDC bridge pays no platform fee. When a swap precedes the bridge, the swap pays fees as usual, then the entire output is sent across. Circle's own fees are quoted separately in `quoteFromArc` and `quoteToArc`.
