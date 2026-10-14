---
title: Coven kit
description: Wallet connection, account and swap views for any EVM app, with one connection shared by your app and every Coven view.
---

The kit is Coven's wallet and trading UI as one package. A single kit instance owns the wallet connection, and every view (connect, account, swap) reads from it, so your app and Coven share one connection. The same views render inline, in a modal, from React, from plain HTML, and inside Coven's hosted iframe.

- **Every EVM mainnet viem ships**, more than 390, with Arc as the default. Narrow the list or add your own chains.
- **Every wagmi connector.** Browser wallets announce themselves through EIP-6963. WalletConnect (QR and mobile links), MetaMask, Coinbase Wallet and Safe are built in, and you can pass any other wagmi connector.
- **Balances** of the native coin and every known token on whichever chain the wallet is on.
- **Swaps follow the pair.** Paying with USDC on Base asks the wallet to switch to Base, sends the USDC to Arc through Circle's CCTP, then switches to Arc to buy. An Arc pair switches to Arc.

Try every option, and copy the code for it, in the [playground](https://kit.coven.network).

## Install

```bash
npm install @covennetwork/kit viem
```

## React

```tsx
import { createKit } from '@covennetwork/kit'
import { ConnectButton, CovenWidget, KitProvider } from '@covennetwork/kit/react'

const kit = createKit({
  app: { name: 'Your app', icon: 'https://your.app/icon.png' },
  integrator: { address: '0xYourFeeAddress', feeBps: 30 },
  theme: { mode: 'dark', accent: '#c8ff5a' },
})

export function TokenPage({ token }: { token: `0x${string}` }) {
  return (
    <KitProvider kit={kit}>
      <ConnectButton />
      <CovenWidget view="swap" tokenOut={token} />
      <button onClick={() => kit.open({ view: 'swap', tokenOut: token })}>Buy</button>
    </KitProvider>
  )
}
```

Create the kit once, outside your components. `createKit` runs in the browser; in Next, create it in a `'use client'` module.

### Your own transactions

Your app's contract calls use the same connection. With wagmi, give wagmi the kit's config and use wagmi hooks as usual:

```tsx
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

<WagmiProvider config={kit.wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <KitProvider kit={kit}>{/* useWriteContract, useAccount… */}</KitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

Without wagmi, `await kit.getProvider()` returns the connected wallet's EIP-1193 provider, and `await kit.walletOn(chainId)` switches the wallet if needed and returns a viem wallet client bound to that chain.

### Hooks

| Hook | Returns |
| --- | --- |
| `useKit()` | The kit from the nearest `KitProvider`. |
| `useKitState()` | `{ status, address, chainId, connector, connectors, modal, theme }`, re-rendering on change. |
| `useKitEvent(name, handler)` | Subscribes to an [event](#events) for the component's lifetime. |

## Plain HTML and other frameworks

The views are standard Web Components, so they work in Vue, Svelte, Angular or no framework at all. Load the kit from a CDN:

```html
<script type="module">
  import { createKit } from 'https://cdn.jsdelivr.net/npm/@covennetwork/kit@0.1/dist/cdn/kit.js'

  const kit = createKit({ app: { name: 'Your app' }, integrator: { address: '0xYourFeeAddress', feeBps: 30 } })
  kit.on('swapConfirmed', (swap) => console.log('bought', swap.tokenOut.symbol, swap.hash))
  document.querySelector('#buy').addEventListener('click', () => kit.open({ view: 'swap', tokenOut: '0xToken' }))
</script>

<coven-connect-button></coven-connect-button>
<coven-widget view="swap" token-out="0xToken"></coven-widget>
<button id="buy">Buy</button>
```

With a bundler, `import '@covennetwork/kit/elements'` registers the same elements.

## Views

Every view takes the same parameters wherever it appears: `<CovenWidget>` props, `<coven-widget>` attributes (in kebab-case, such as `token-out`), `kit.open()` fields and the hosted iframe's query string.

| View | Parameters | Shows |
| --- | --- | --- |
| `connect` | none | The wallet list, WalletConnect QR, and connecting and error states. Once connected, the account. |
| `account` | none | Address, balances on the current chain, a network switcher with search, and disconnect. |
| `swap` | `pool`, `tokenIn`, `tokenOut`, `amount`, `slippageBps`, `poolFee`, `tickSpacing`, `hooks` | Pay and receive, a quote, a review step and live progress. |

**Tokens** are named by an Arc address, or by a [CAIP-19](https://chainagnostic.org/CAIPs/caip-19) id for another chain. USDC on Base is `eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.

**Locking a pool.** Pass `pool` (a v3 pool address or v4 pool id), or both `tokenIn` and `tokenOut` on Arc, and the user can only flip the direction. Add `poolFee`, `tickSpacing` and `hooks` to route through one exact v4 pool. See [the widget guide](/guides/widget/#lock-it-to-one-pool) for how pool ids are resolved.

**Inline or modal.** `<CovenWidget view="swap" />` renders in your layout. `kit.open({ view: 'swap' })` shows the same view in a modal, which follows the WAI-ARIA dialog pattern: focus moves in and stays there, Escape and the backdrop close it, and focus returns to where it was. `kit.open()` with no argument shows connect, or the account once connected. On phones the modal is a bottom sheet.

A view that needs a wallet asks for one when the user acts, so a disconnected visitor can browse quotes first.

## How swaps pick the network

The wallet can be on any chain. Each swap step asks for the chain it runs on, and the review screen says up front when the wallet will be asked to switch.

| Pay with | Receive | What happens |
| --- | --- | --- |
| A token on Arc | A token on Arc | Switch to Arc, approve and swap. |
| USDC on another chain | USDC on Arc | Switch to that chain, approve and send through CCTP. It lands on Arc, usually within a minute. |
| USDC on another chain | A token on Arc | As above, then switch to Arc and buy with exactly the USDC that arrived. The rest of the Arc balance is left alone. |
| A token on Arc | USDC on another chain | Switch to Arc, swap to USDC if needed, and send. It arrives in about 15 to 20 minutes. |

One side has to be on Arc. If the page is closed while USDC is on its way, the swap view offers to finish the transfer when it next opens. The chains CCTP supports are listed under [chains](/reference/chains/).

## Who owns the connection

The kit never opens a second connection. Pick one owner with the `wallet` option:

| `wallet` | Who connects | Use it when |
| --- | --- | --- |
| omitted, or `{ walletConnectProjectId, connectors, defaultConnectors }` | The kit | Your app has no wallet setup yet. |
| `{ wagmiConfig }` | Your existing wagmi config | Your app already uses wagmi. The kit shares its connection. |
| `{ provider, onConnectRequest }` | Your wallet kit (RainbowKit, Privy, Dynamic…) | Pass its EIP-1193 provider. The kit's connect buttons call `onConnectRequest` so your own modal opens. |

Adding a wallet the kit doesn't ship, such as Base Account or a hardware wallet, is one line:

```ts
import { baseAccount } from '@wagmi/connectors'

createKit({ wallet: { connectors: [baseAccount({ appName: 'Your app' })] } })
```

`defaultConnectors: false` drops the built-in set so only your connectors (and EIP-6963 browser wallets) appear. The kit uses Coven's WalletConnect project id unless you pass your own `walletConnectProjectId`, which gives you your own usage dashboard on [Reown](https://cloud.reown.com).

## Chains

```ts
import { arbitrum, base, mainnet } from 'viem/chains'
import { arc } from '@covennetwork/sdk'

createKit({
  chains: [arc, mainnet, base, arbitrum], // default: every EVM mainnet viem ships
  defaultChainId: arc.id,                // default: Arc
  transports: { [mainnet.id]: http('https://your-rpc') }, // default: each chain's public RPC
})
```

The swap view offers USDC on every CCTP chain that is in your list. Public RPCs are rate-limited; for production traffic, pass your own `transports`, especially for Arc.

## Balances

The account view lists non-zero balances on the wallet's current chain: the native coin plus every token the kit knows on that chain, read in Multicall3 batches. Known tokens come from the Uniswap default token list, Arc's token registry and USDC on CCTP chains. Add your own:

```ts
createKit({
  tokens: [{ chainId: 8453, address: '0x…', symbol: 'YOURS', name: 'Your token', decimals: 18 }],
  tokenLists: ['https://tokens.uniswap.org', 'https://your.app/tokenlist.json'],
})

const balances = await kit.balances({ chainId: 8453 })
```

## Events

```ts
const stop = kit.on('swapConfirmed', (swap) => {
  swap.hash      // transaction hash
  swap.chain     // 'eip155:5042'
  swap.side      // relative to USDC: 'buy', 'sell' or 'swap'
  swap.tokenIn   // { asset: 'eip155:8453/erc20:0x…', symbol, decimals }
  swap.amountOut // base units, as a decimal string
})
```

| Event | Payload |
| --- | --- |
| `connect` | `{ account, chain, connector }` |
| `disconnect` | `{}` |
| `accountChanged` | `{ account }` |
| `chainChanged` | `{ chain }` |
| `viewChanged` | `{ open, request }` |
| `swapSubmitted` | `{ hash, chain, kind }` |
| `swapConfirmed` | `{ hash, chain, kind, side, tokenIn, tokenOut, amountIn, amountOut }` |
| `error` | `{ message, code? }` |

`account` is a CAIP-10 id (`eip155:1:0x…`) and `chain` a CAIP-2 id (`eip155:1`). `kind` is `swap`, `deposit` or `bridge-out`.

## Theming

```ts
createKit({ theme: { mode: 'auto', accent: '#3355ff', bg: 'transparent', radius: 12, compact: true } })
kit.setTheme({ mode: 'dark' }) // live
```

| Field | Meaning |
| --- | --- |
| `mode` | `light`, `dark`, or `auto` to follow the visitor's system setting. |
| `accent` | Hex color of the primary action. |
| `bg` | Hex color behind inline views, or `transparent`. The modal always has an opaque surface. |
| `radius` | Corner radius in px. |
| `font` | Font stack. Defaults to Inter, then the system font. |
| `compact` | Tighter spacing and smaller headings, for sidebars. |

The theme is written as CSS custom properties (`--coven-accent`, `--coven-bg`, `--coven-fg`, `--coven-radius`, `--coven-font`) on each element, and the views live in Shadow DOM, so your page's CSS can't break them and theirs can't leak into your page.

## Hosted iframe

For pages that can't load third-party scripts, Coven hosts every view at `https://coven.network/embed`. It takes the view parameters above plus `integrator`, `integratorFee`, `theme`, `bg`, `accent`, `radius` and `compact`:

```html
<iframe
  src="https://coven.network/embed?view=swap&tokenOut=0xToken&integrator=0xYourFeeAddress&integratorFee=30"
  title="Coven"
  style="width: 100%; max-width: 460px; height: 560px; border: 0"
></iframe>
```

The iframe posts messages to your page in a versioned envelope, `{ protocol: 'coven', version: 1, type, payload }`. `resize` carries `{ height }`, and `event` carries `{ name, payload }` for every event above. Kit events include the user's address, so they are sent only to the embedding page's own origin. Check `event.origin` is `https://coven.network` before trusting a message.

To have the iframe use your page's wallet, so users connect once, add `wallet=host` and answer its wallet requests with `bridgeProvider` (or use the [`@covennetwork/widget`](/guides/widget/) component's `provider` prop, which does this for you):

```ts
import { bridgeProvider } from '@covennetwork/kit/iframe'

const stop = bridgeProvider(iframe, {
  iframeOrigin: 'https://coven.network',
  provider: await connector.getProvider(),
  onConnectRequest: () => openYourConnectModal(),
})
```

Only account, chain and transaction methods, and the read calls a wallet client makes while preparing a transaction, are bridged. Message and typed-data signing are never forwarded.
