---
title: SDK reference
description: Every function, option and type in @covennetwork/sdk.
---

## createCoven

```ts
import { createCoven } from '@covennetwork/sdk'

const coven = createCoven(config?)
```

Returns an instance. Create one per app and reuse it, since it caches the token list and discovered pools.

### Configuration

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `integrator` | `{ address, feeBps }` | none | Your fee address and rate, 0 to 300 basis points |
| `arcTransport` | viem `Transport` | public Arc RPC | Endpoint for everything on Arc |
| `chainTransports` | `Record<number, Transport>` | viem defaults | Endpoints for source chains when bridging |
| `bundlerUrls` | `Record<number, string>` | Pimlico public | Bundlers for gasless deposits |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch, for tests or proxies |

An invalid integrator address or an out-of-range fee throws `CovenError` immediately.

## Quoting and swapping

### quote

```ts
const quote = await coven.quote({
  tokenIn,
  tokenOut,
  amountIn,
  maxImpactBps?, // default 500 (5%)
  extraPools?,   // extra v4 pools to consider
})
```

Returns a `Quote`. Throws `NO_ROUTE` when nothing fills the amount inside the price impact limit, and `PAUSED` when swaps are paused.

```ts
type Quote = {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  amountOut: bigint      // after all fees
  hops: Hop[]
  feeToken: Address
  platformFee: bigint
  integratorFee: bigint
}

type Hop = {
  protocol: 'v3' | 'v4'
  tokenOut: Address
  fee: number
  tickSpacing: number
  hooks: Address
}
```

### swap

```ts
const { hash, amountOut, quote } = await coven.swap({
  wallet,            // viem WalletClient on Arc
  tokenIn,
  tokenOut,
  amountIn,
  slippageBps?,      // default 50 (0.5%)
  recipient?,        // default the wallet's address
  maxImpactBps?,
  deadlineSeconds?,  // default 300
})
```

Approves the exact amount if needed, re-quotes, simulates, sends, and waits for the receipt. `amountOut` is read from the swap event, so it is the amount actually received.

## Tokens

```ts
coven.tokens.list()                  // Token[], official first
coven.tokens.get(address)            // Token | undefined, no network call
await coven.tokens.resolve(address)  // Token, reads the contract if unknown
await coven.tokens.loadCoinGecko()   // adds CoinGecko's Arc list
```

```ts
type Token = {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  sources: ('official' | 'coingecko' | 'discovered' | 'custom')[]
  flags: { impersonator: boolean; metadataUnavailable: boolean }
}
```

## Pools

```ts
const stop = coven.pools.watch({
  onPools,             // (pools: Pool[], phase: 'backfill' | 'live') => void
  onError?,
  lookbackBlocks?,     // default 1800n, about 15 minutes
  pollMs?,             // default 1000
  includeUnroutable?,  // default false
})
```

Returns a function that stops the watcher.

```ts
type Pool = {
  protocol: 'v3' | 'v4'
  id: Hex
  token0: Address
  token1: Address
  fee: number
  tickSpacing: number
  hooks: Address
  key?: PoolKey          // v4 only
  block: bigint
  liquidity: bigint
  routable: boolean
  unroutableReason?: 'native-currency' | 'hook-not-allowed'
}
```

## Bridging

```ts
coven.bridge.chains()

await coven.bridge.quoteFromArc({ tokenIn, amountIn, destinationChainId, maxImpactBps? })
await coven.bridge.fromArc({ wallet, tokenIn, amountIn, destinationChainId, recipient?, slippageBps?, deadlineSeconds? })

await coven.bridge.quoteToArc({ sourceChainId, amount, speed? })
await coven.bridge.toArc({ wallet, sourceChainId, amount, recipient?, speed? })

await coven.bridge.gaslessAccount({ owner, sourceChainId })
await coven.bridge.toArcGasless({ account, sourceChainId, amount, recipient?, speed?, maxGasUsdc? })

await coven.bridge.status({ sourceChainId, hash })
await coven.bridge.waitForDelivery({ sourceChainId, hash, timeoutMs?, pollMs?, onStatus?, signal? })
```

`speed` is `'fast'` or `'standard'`. `maxGasUsdc` defaults to `5_000_000n`, which is 5 USDC.

Both `fromArc` and `toArc` return `{ hash, amountBurned, maxFee, sourceChainId }`. The gasless version adds `userOperationHash`.

```ts
type TransferStatus = {
  state: 'not_found' | 'pending' | 'attested' | 'delivered'
  forwardState?: string
  forwardTxHash?: Hex
  delayReason?: string
}
```

## Exported constants

```ts
import {
  arc,                    // viem chain for Arc
  USDC, EURC, USYC,
  COVEN_ROUTER, COVEN_LENS,
  TOKEN_MESSENGER, CIRCLE_PAYMASTER,
  CCTP_CHAINS, ARC_DOMAIN,
  MAX_INTEGRATOR_FEE_BPS,
  CovenError,
  isImpersonator,
} from '@covennetwork/sdk'
```

## Amounts

Every amount is a `bigint` in the token's smallest unit. USDC, EURC and USYC use 6 decimals. viem's `parseUnits` and `formatUnits` convert to and from strings.

```ts
import { parseUnits } from 'viem'

const amountIn = parseUnits('25', 6) // 25 USDC
```
