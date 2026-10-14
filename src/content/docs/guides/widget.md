---
title: Swap widget
description: Drop Coven's swap, connect or account view into your React or Next app with one iframe component, and earn a fee on every swap.
---

The widget is the [Coven kit](/guides/kit/) in an iframe hosted by Coven. For React and Next apps it's a single component from [`@covennetwork/widget`](https://www.npmjs.com/package/@covennetwork/widget). It can connect its own wallet, or use your app's wallet so your users connect once.

Pick the widget when you want the smallest possible footprint and Coven-hosted updates. Pick the [kit](/guides/kit/) when you want the views in your own page (no iframe), your own wagmi setup, or a modal. To build your own interface, use the [SDK](/guides/integrators/).

## Install

```bash
npm install @covennetwork/widget
```

`react` (18 or 19) is the only peer dependency. The wallet connection, routing and SDK all run **inside the iframe**, so the package itself is a tiny (~2 KB) wrapper — it can't bloat your bundle or clash with your app's own wagmi or wallet setup.

## Add the component

```tsx
import { CovenSwapWidget } from '@covennetwork/widget'

export function Swap() {
  return <CovenSwapWidget integrator="0xYourFeeWallet" integratorFee={30} />
}
```

That renders an open swap: the user picks what to pay with (any Arc token, or USDC on a CCTP chain such as Base) and what to receive. The iframe sizes itself to its content, so there's no fixed height to guess. Every swap pays your fee to your address — see [fees](/guides/fees/).

In Next, it works in both the app and pages routers. It's a client component (it manages the iframe and window messaging), so render it in a `'use client'` tree — it carries its own client boundary, so importing it into a server component is fine.

## Pick a view and prefill the trade

```tsx
<CovenSwapWidget view="swap" tokenIn="eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" tokenOut="0xYourArcToken" amount="25" />
<CovenSwapWidget view="account" />
<CovenSwapWidget view="connect" />
```

Tokens are Arc addresses, or [CAIP-19](https://chainagnostic.org/CAIPs/caip-19) ids for USDC on other chains. When the user pays with USDC on Base, the widget asks their wallet to switch to Base, sends the USDC to Arc, then switches to Arc to buy. See [how swaps pick the network](/guides/kit/#how-swaps-pick-the-network).

## Use your app's wallet

If your app already connects a wallet (to launch tokens, mint or sign in), pass its EIP-1193 provider and the widget uses that connection instead of asking the user to connect again:

```tsx
import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'

function Trade({ token }: { token: string }) {
  const { connector } = useAccount()
  const [provider, setProvider] = useState()
  useEffect(() => {
    connector?.getProvider().then(setProvider)
  }, [connector])

  return (
    <CovenSwapWidget
      tokenOut={token}
      provider={provider}
      onConnectRequest={() => openYourConnectModal()}
      integrator="0xYourFeeWallet"
      integratorFee={30}
    />
  )
}
```

The widget never shows its own wallet list in this mode; its connect button calls `onConnectRequest`. Network switches and transactions go through your wallet, so the prompts show your site. Only account, chain and transaction requests are passed through; message signing never is.

## Lock it to one pool

A locked widget fixes the pay and receive tokens to a single pool's two tokens. The user only chooses direction and amount, and the swap routes through that pool.

### By pool identifier

The simplest way — pass one `pool` and the widget resolves the pair itself:

```tsx
<CovenSwapWidget integrator="0xYourFeeWallet" integratorFee={30} pool="0xYourPoolAddressOrId" />
```

- For a **v3 pool**, that's the pool **contract address**. Its tokens are read straight off it.
- For a **v4 pool**, that's the pool **id** — the hash of its key. A v4 id can't be reversed to its tokens, so the widget resolves it through pool discovery. The id must belong to a pool Coven has discovered, and doing so recovers the full pool key too, so the swap routes through exactly that pool.

### By explicit tokens

If you already know the pair, spell it out and nothing is resolved at runtime:

```tsx
<CovenSwapWidget
  integrator="0xYourFeeWallet"
  integratorFee={30}
  tokenIn="0xUSDC"
  tokenOut="0xYourToken"
  poolFee={3000}
  tickSpacing={60}
  hooks="0x0000000000000000000000000000000000000000"
/>
```

Passing both tokens on Arc locks the pair. Add the full key (`poolFee`, `tickSpacing`, `hooks`) and the router is told to use exactly that pool. `pool` takes priority when both are present. `token0` and `token1` from earlier versions still work as aliases for `tokenIn` and `tokenOut`.

## Props

| Prop               | Type                           | Meaning                                                                 |
| ------------------ | ------------------------------ | ----------------------------------------------------------------------- |
| `view`             | `"swap" \| "connect" \| "account"` | Which view to show. Default `swap`.                               |
| `integrator`       | `string`                       | Address that receives the integrator fee.                               |
| `integratorFee`    | `number`                       | Integrator fee in basis points (capped by the router at 300).           |
| `pool`             | `string`                       | Single pool identifier — v3 pool address or v4 pool id.                 |
| `tokenIn`          | `string`                       | Token the user pays with: Arc address or CAIP-19 id.                    |
| `tokenOut`         | `string`                       | Token the user receives: Arc address or CAIP-19 id.                     |
| `amount`           | `string`                       | Prefilled amount of `tokenIn`, in whole units.                          |
| `poolFee`          | `number`                       | Pool fee tier.                                                          |
| `tickSpacing`      | `number`                       | Pool tick spacing.                                                      |
| `hooks`            | `string`                       | Pool hooks address (`0x0…0` for none).                                  |
| `slippage`         | `number`                       | Max slippage in basis points (default `50`).                            |
| `bg`               | `string`                       | Background color (hex, or `transparent`). Default `#EFECE4`.            |
| `theme`            | `"light" \| "dark" \| "auto"`   | `auto` follows the visitor's system setting.                         |
| `accent`           | `string`                       | Hex color for the primary action.                                       |
| `radius`           | `number`                       | Corner radius in px.                                                    |
| `compact`          | `boolean`                      | Tighter spacing and smaller headings.                                   |
| `provider`         | EIP-1193 provider              | Your app's wallet. See [use your app's wallet](#use-your-apps-wallet).  |
| `onConnectRequest` | `() => void`                   | With `provider`: called when the user presses Connect in the widget.    |
| `onSwap`           | `(swap) => void`               | Called when a swap confirms. See [swap events](#swap-events).           |
| `onEvent`          | `(name, payload) => void`      | Every [kit event](/guides/kit/#events): connect, chainChanged, error…   |
| `maxWidth`         | `number \| string`             | Max iframe width (default `460`).                                      |
| `origin`           | `string`                       | Where the widget is hosted (default `https://coven.network`).           |
| `className`        | `string`                       | Passed to the iframe.                                                   |
| `style`            | `React.CSSProperties`          | Merged onto the iframe.                                                 |

`token0` and `token1` are kept as deprecated aliases of `tokenIn` and `tokenOut`.

## Other sites

Not on React? A script loader drops the same widget into any page — plain HTML, Vue, Webflow — with `data-*` attributes mirroring the props above (`data-view`, `data-integrator`, `data-pool`, `data-token-in`, `data-token-out`, `data-amount`, `data-theme`, and so on; `data-compact` is a bare attribute):

```html
<script
  src="https://coven.network/embed.js"
  data-integrator="0xYourFeeWallet"
  data-integrator-fee="30"
  data-pool="0xYourPoolAddressOrId"
></script>
```

The iframe is inserted where the script tag sits, or into the element named by `data-target`, and it auto-resizes to its content. Every kit event is re-dispatched on the script's parent element as a DOM event named `coven:<event>` (for example `coven:swapConfirmed`), with the payload in `event.detail`.

Or point an iframe at `/embed` yourself; the [kit guide](/guides/kit/#hosted-iframe) describes its parameters and messages. The original `/widget` URL and its `coven:resize` and `coven:swap` messages keep working:

```html
<iframe
  src="https://coven.network/widget?integrator=0xYourFeeWallet&pool=0xYourPoolAddressOrId"
  style="width: 100%; max-width: 460px; height: 520px; border: 0;"
  allow="clipboard-write"
></iframe>
<script>
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'coven:resize') {
      /* set your iframe height to e.data.height */
    }
    if (e.data?.type === 'coven:swap') {
      /* show the trade: e.data.hash, e.data.amountOut, ... */
    }
  })
</script>
```

## Swap events

When a swap made in the widget confirms, the widget posts a `coven:swap` message to the host
window, and the React component passes the same payload (without `type`) to `onSwap`:

```ts
{
  type: 'coven:swap',
  hash: '0x…',                 // transaction hash on Arc
  side: 'buy',                 // relative to USDC: 'buy' paid USDC, 'sell' received it, else 'swap'
  tokenIn: { address: '0x…', symbol: 'USDC', decimals: 6 },
  tokenOut: { address: '0x…', symbol: 'TOKEN', decimals: 18 },
  amountIn: '1000000',         // base units, as a decimal string
  amountOut: '4213370000000000000',
}
```

Without React, listen for it next to the resize message, and check `event.source` is the widget's
iframe before trusting it.

## Good to know

- The user's wallet can be on any network. Each step asks for the network it runs on: Arc for Arc pairs, the source chain when paying with USDC from elsewhere. One side of a trade has to be on Arc.
- The integrator fee is validated against the router's cap; anything above it is clamped. See [fees](/guides/fees/).
- `bg` and `accent` only accept hex colors (`bg` also takes `transparent`); other values fall back to the theme's defaults.
- Resolving a v4 pool by id depends on discovery, which can be slower on a public RPC. For a v4 pool you control, the explicit-tokens form is the more reliable choice.
