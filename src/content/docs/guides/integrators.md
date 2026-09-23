---
title: For integrators
description: Put Coven in your own app, and earn a fee while doing it.
---

Coven is a package: you build the interface, and the SDK handles routing, fees, discovery and bridging. If you'd rather not build anything, the [swap widget](/guides/widget/) drops the whole experience into your site with one script tag.

## Set up an instance

One instance per app, created once and reused:

```ts
import { createCoven } from '@covennetwork/sdk'

export const coven = createCoven({
  integrator: { address: '0xYourFeeWallet', feeBps: 25 }, // 0.25%
})
```

Every swap through this instance pays your fee to your address, straight from the router. There is nothing to claim later and no account to open. See [fees](/guides/fees/) for how it interacts with Coven's own fee.

## The parts you will use

- `quote` for pricing, including your fee.
- `swap` for execution, which handles approval, simulation and sending.
- `tokens` for a token list with lookalike warnings.
- `pools.watch` for new pairs.
- `bridge` for moving USDC in and out of Arc.

The [SDK reference](/reference/sdk/) lists every option.

## Wallets

The SDK takes a viem `WalletClient`, so every wagmi connector works: browser extensions, WalletConnect, Coinbase Wallet, Safe and embedded wallets.

```tsx
const { data: walletClient } = useWalletClient()

await coven.swap({ wallet: walletClient, tokenIn, tokenOut, amountIn })
```

## Things worth getting right

- **Leave gas behind.** Gas on Arc is USDC. A "max" button that spends the whole balance leaves the user unable to send anything afterwards.
- **Show the lookalike flag.** Arc has tokens impersonating USDC, including one on CoinGecko's own list.
- **Let people paste an address.** The token list will not have every new launch.
- **Surface errors by code.** `CovenError` carries a `code`, which maps cleanly to messages in your interface. See [errors](/reference/errors/).
- **Quote as they type, with a delay.** Roughly 300ms of debounce keeps quoting responsive without hammering the RPC.

## Node and backends

The SDK has no browser dependencies, so bots, backends and scripts can use the same package. Pass a viem account-based wallet client instead of a browser one.

## Reference implementation

The Coven app itself is built on this package and is open source. It covers connecting, quoting, swapping, the new pairs feed and bridging in a few hundred lines.
