---
title: Quickstart
description: Install the SDK, price a trade and send your first swap.
---

## Install

```sh
npm install @covennetwork/sdk viem
```

The SDK runs in browsers and in Node 18 or later. viem is a peer dependency, so your app supplies it.

## Price a trade

```ts
import { createCoven, USDC, EURC } from '@covennetwork/sdk'

const coven = createCoven()

const quote = await coven.quote({
  tokenIn: USDC,
  tokenOut: EURC,
  amountIn: 25_000_000n, // 25 USDC, which has 6 decimals
})

console.log(quote.amountOut, quote.hops)
```

`amountOut` is what the recipient receives after every fee. `hops` describes the route, which may pass through USDC or EURC and mix v3 and v4 pools.

Amounts are always `bigint` values in the token's smallest unit. USDC and EURC use 6 decimals, and most other tokens use 18.

## Send a swap

`swap` needs a viem `WalletClient`, which every wagmi connector provides.

```ts
const { hash, amountOut } = await coven.swap({
  wallet: walletClient,
  tokenIn: USDC,
  tokenOut: EURC,
  amountIn: 25_000_000n,
  slippageBps: 50, // 0.5%
})
```

Behind that one call, the SDK approves the router for exactly this amount if needed, takes a fresh quote, simulates the transaction, sends it, and waits for it to land. The returned `amountOut` comes from the swap event, so it is the amount actually received.

The wallet has to be on Arc. In wagmi:

```tsx
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { arc } from '@covennetwork/sdk'

const { chainId } = useAccount()
const { switchChain } = useSwitchChain()
const { data: walletClient } = useWalletClient()

if (chainId !== arc.id) switchChain({ chainId: arc.id })
```

## Gas

Arc charges gas in USDC, so a wallet holding only USDC can trade without holding anything else. Leave a little behind when swapping USDC, or the next transaction has nothing to pay with. A swap costs a fraction of a cent.

## What next

- [Swapping](/guides/swapping/) covers routing, slippage and price impact.
- [Tokens](/guides/tokens/) explains the token list and the lookalike warnings.
- [Bridging](/guides/bridging/) moves USDC to and from other chains.
