---
title: New pairs
description: Watch pools appear on Arc within seconds of their creation.
---

New tokens launch on Arc constantly, and Coven can show them as they arrive.

```ts
const stop = coven.pools.watch({
  onPools: (pools, phase) => {
    for (const pool of pools) {
      console.log(phase, pool.protocol, pool.token0, pool.token1, pool.liquidity)
    }
  },
})

// later
stop()
```

The first call arrives within a couple of seconds and carries pools created in roughly the last fifteen minutes, marked `backfill`. After that, new pools arrive marked `live`, usually within a second or two of creation. Tokens from those pools join the token list automatically.

Arc blocks are final when they land, so a pool reported once never has to be taken back.

## Filtering

By default you only see pools Coven can trade through:

- Uniswap v3 pools.
- v4 pools whose hooks cannot alter a swap.
- v4 pools whose hook the router allows.

To see everything, including pools that cannot be traded:

```ts
coven.pools.watch({ includeUnroutable: true, onPools })
```

Those carry `routable: false` and an `unroutableReason`, either `hook-not-allowed` or `native-currency`.

## Looking further back

```ts
coven.pools.watch({ lookbackBlocks: 7200n, onPools }) // about an hour
```

Blocks are half a second apart, so 7,200 blocks is an hour. Longer windows mean more requests on startup, and the public RPC will throttle a browser that asks for too much at once. An hour is comfortable; a full day is not, and that is the point where a cached snapshot from your own backend starts to pay off.

## What a pool looks like

| Field | Meaning |
| --- | --- |
| `protocol` | `v3` or `v4` |
| `id` | Pool address on v3, pool ID on v4 |
| `token0`, `token1` | The pair, sorted by address |
| `fee`, `tickSpacing`, `hooks` | Pool settings |
| `liquidity` | Current liquidity, zero for one-sided launches |
| `block` | Block the pool was created in |
| `routable` | Whether Coven can trade it |

Newly launched pools often start one-sided, holding only the new token, so `liquidity` of zero does not mean the pool is dead. It usually means nobody has bought yet.

## Trading what you find

Nothing extra is needed. Pass the token's address to `quote` or `swap`, and discovered v4 pools are offered to the router automatically.

Treat fresh launches carefully. Check `flags.impersonator`, look at how much USDC the pool holds, and remember that `swap` simulates before signing, which catches tokens that cannot be sold.
