---
title: Swap widget
description: Drop the Coven swap experience into your React or Next app with one component, and earn a fee on every swap.
---

The widget is the Coven app in an iframe: users connect their own wallet and swap on Arc without leaving your page. For React and Next apps it's a single component from [`@covennetwork/widget`](https://www.npmjs.com/package/@covennetwork/widget). If you'd rather build your own interface, use the [SDK](/guides/integrators/) instead.

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

That renders an open widget: the user picks any Arc pair and swaps. The iframe sizes itself to its content, so there's no fixed height to guess. Every swap pays your fee to your address — see [fees](/guides/fees/).

In Next, it works in both the app and pages routers. It's a client component (it manages the iframe and window messaging), so render it in a `'use client'` tree — it carries its own client boundary, so importing it into a server component is fine.

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
  token0="0xUSDC"
  token1="0xYourToken"
  poolFee={3000}
  tickSpacing={60}
  hooks="0x0000000000000000000000000000000000000000"
/>
```

Passing `token0` and `token1` alone locks the pair. Add the full key (`poolFee`, `tickSpacing`, `hooks`) and the router is told to use exactly that pool. `token0`/`token1` take priority over `pool` when both are present.

## Props

| Prop            | Type                  | Meaning                                                        |
| --------------- | --------------------- | -------------------------------------------------------------- |
| `integrator`    | `string`              | Address that receives the integrator fee.                      |
| `integratorFee` | `number`              | Integrator fee in basis points (capped by the router).         |
| `pool`          | `string`              | Single pool identifier — v3 pool address or v4 pool id.        |
| `token0`        | `string`              | Pool token the user pays with by default.                      |
| `token1`        | `string`              | Pool token the user receives by default.                       |
| `poolFee`       | `number`              | Pool fee tier.                                                 |
| `tickSpacing`   | `number`              | Pool tick spacing.                                             |
| `hooks`         | `string`              | Pool hooks address (`0x0…0` for none).                         |
| `slippage`      | `number`              | Max slippage in basis points (default `50`).                   |
| `bg`            | `string`              | Background color (hex, or `transparent`). Default `#EFECE4`.   |
| `theme`         | `"light" \| "dark"`   | Ink palette. `dark` for dark hosts; defaults `bg` to `#0E0E0D`. |
| `accent`        | `string`              | Hex color for the primary action.                              |
| `compact`       | `boolean`             | Tighter spacing, smaller headings, no hero heading.            |
| `onSwap`        | `(swap) => void`      | Called when a swap confirms. See [swap events](#swap-events).  |
| `maxWidth`      | `number \| string`    | Max iframe width (default `460`).                              |
| `origin`        | `string`              | Where the widget is hosted (default `https://coven.network`).  |
| `className`     | `string`              | Passed to the iframe.                                          |
| `style`         | `React.CSSProperties` | Merged onto the iframe.                                        |

## Other sites

Not on React? A script loader drops the same widget into any page — plain HTML, Vue, Webflow — with `data-*` attributes mirroring the props above (`data-integrator`, `data-pool`, `data-token0`, `data-slippage`, `data-theme`, and so on; `data-compact` is a bare attribute):

```html
<script
  src="https://coven.network/embed.js"
  data-integrator="0xYourFeeWallet"
  data-integrator-fee="30"
  data-pool="0xYourPoolAddressOrId"
></script>
```

The iframe is inserted where the script tag sits, or into the element named by `data-target`, and it auto-resizes to its content. Or point an iframe at `/widget` yourself and size it from the resize message:

```html
<iframe
  src="https://coven.network/widget?integrator=0xYourFeeWallet&pool=0xYourPoolAddressOrId"
  style="width: 100%; max-width: 460px; height: 520px; border: 0;"
  allow="clipboard-write; ethereum"
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

- The widget only swaps on Arc. If the user's wallet is on another network it prompts them to switch. Bridging between chains stays in the full [app](https://coven.network) and the [SDK](/guides/bridging/).
- The integrator fee is validated against the router's cap; anything above it is clamped. See [fees](/guides/fees/).
- `bg` and `accent` only accept hex colors (`bg` also takes `transparent`); other values fall back to the theme's defaults.
- Resolving a v4 pool by id depends on discovery, which can be slower on a public RPC. For a v4 pool you control, the explicit-tokens form is the more reliable choice.
