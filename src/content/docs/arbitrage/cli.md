---
title: The arbitrage CLI
description: Install and run coven-arb — run, scan, index and doctor, its flags and environment, and what decides whether it makes money.
---

`coven-arb` is the primary way to run the solver. It watches every block, finds USDC cycles across Uniswap v3 and v4 pools, measures each one's exact profit on-chain through `CovenArb`, and sends the profitable ones. A trade either makes money or reverts; you never hold inventory.

## Install

Requires **Node.js ≥ 18.3**. `viem` is a peer dependency and is installed automatically on npm 7+.

```sh
# global install (recommended for a long-running bot)
npm i -g @covennetwork/arb
coven-arb doctor

# or run without installing
npx @covennetwork/arb doctor
```

The package ships a compiled CLI; there is no build step on your side.

## Commands

```sh
coven-arb run      [--dry-run] [--min-profit <usdc>] [--bid <percent>] [--log <file>]
coven-arb scan     [--min-profit <usdc>] [--json]
coven-arb index    [--from <block>]
coven-arb doctor
```

- **`run`** is the live bot. It needs a signer (see [Environment](#environment)) unless you pass `--dry-run`, which does everything except sign and send. Ctrl-C stops it cleanly: it waits for pending transactions and prints the session's profit and gas.
- **`scan`** is one read-only pass over the current market. It prints every cycle that is profitable on-chain right now and whether it clears the floor after gas.
- **`index`** is optional. It records every pool ever created, newest first, so a token's dormant venues are known before they first trade. It is resumable (Ctrl-C is safe) and needs an endpoint that serves historical logs; on the public endpoints a full index takes about two hours.
- **`doctor`** checks each endpoint's latency and log support, the `CovenArb` contract and its current fee, the gas price and what a trade costs, the signer's balance, and the pool cache. It exits non-zero if anything fails.

There is no `--arb` flag: the CLI always uses the deployed `CovenArb`. There is no `--tokens` flag either, since the bot finds its own markets.

## Flags

| Flag | Applies to | Default | Description |
| --- | --- | --- | --- |
| `--rpc <url,...>` | all | `$ARC_RPC_URL`, else the public Arc endpoints | Comma-separated. Requests are spread across all endpoints, a rate-limited one is skipped, and transactions are broadcast to every one. |
| `--min-profit <usdc>` | `run`, `scan` | `0.01` | Smallest profit worth sending, after `CovenArb`'s fee, gas and the priority bid. |
| `--bid <percent>` | `run`, `scan` | `20` | Share of expected profit paid as priority fee, with a floor of 1 gwei. See [Racing](#racing). |
| `--dry-run` | `run` | off | Report what it would trade without signing anything. |
| `--log <file>` | `run` | — | Append every opportunity, trade, outcome and status line as JSON lines. |
| `--json` | `scan` | off | Print opportunities as JSON. |
| `--from <block>` | `index` | first DEX block | Oldest block to index. |
| `--help`, `-h` | — | — | Print usage and exit. |

## Environment

| Variable | Used by | Description |
| --- | --- | --- |
| `COVEN_PRIVATE_KEY` | `run`, `doctor` | Raw private key (`0x`-prefixed or bare). |
| `COVEN_KEYSTORE` / `COVEN_KEYSTORE_PASSWORD` | `run`, `doctor` | An encrypted v3 keystore, as written by geth, `cast wallet` or MetaMask, and its password. |
| `ARC_RPC_URL` | all | Default endpoints when `--rpc` is not passed. Comma-separated. |
| `COVEN_ARB_CACHE` | all | Directory for the pool cache. Default `~/.cache/coven-arb`. |

The signer only pays gas. `CovenArb` settles each cycle inside one transaction, so no trading capital is needed; a few cents of USDC covers hundreds of attempts.

## No private-key flag

There is no `--private-key` flag, on purpose. It lands in shell history and in screenshots when people paste logs. Provide the key out of band instead:

```sh
export COVEN_KEYSTORE=~/.keys/arb.json COVEN_KEYSTORE_PASSWORD=...
coven-arb run --log trades.jsonl
```

## How a trade is found

1. **Discovery.** At startup the bot replays about three hours of swap and liquidity events to find every pool that is actually trading. A v3 pool is rebuilt from its own getters and kept only if the canonical factory created it. A v4 pool only reveals its key in its `Initialize` event, usually older than a public endpoint will serve, so the key is recovered from a transaction that swapped the pool. For each token found, it also checks the token's other venues: v3 fee tiers, common v4 fee and tick-spacing pairs, and hooks the token already uses. Everything is cached, so later starts take seconds.
2. **Cycles.** Every `USDC → X → USDC` and `USDC → X → Y → USDC` loop through distinct pools.
3. **Screen.** Each poll is one `eth_getLogs`. Swap events carry the pool's new price and liquidity, so state stays exact. Cycles touched by new events are priced from spot prices and LP fees, and survivors get a size estimate from the [solver](/arbitrage/overview/#the-solver).
4. **Verify and size on-chain.** Sixteen sizes around the estimate are simulated against `CovenArb` in one call, and the most profitable one is the trade. Nothing is sent unless the chain says it profits.
5. **Execute.** The transaction is signed locally and broadcast to every endpoint, with a priority fee set by `--bid` and `maxFeeBps` pinned to the contract's current fee.

## Racing

Arc orders transactions by priority fee, so when two bots go for the same cycle the higher bid lands and the other reverts. A lost race costs about the gas plus the bid. `--bid` sets that trade-off as a share of the expected profit. At the time of writing, other bots on Arc bid around 20 gwei on small trades and far more on large ones.

Three things decide whether a run makes money:

- **Latency.** Competing bots react within one block (0.5 s). On public endpoints each round trip takes 0.5 to 0.8 s and a trade needs three, so expect to lose most contested races there. Use your own node or a paid endpoint near the validators. `doctor` prints per-endpoint latency, and every `sent` line reports the milliseconds from trigger to broadcast.
- **Gas.** A two-leg cycle through `CovenArb` uses about 280k gas, roughly 0.006 USDC at the base fee, and 3 to 4 times what the leanest competing contracts use.
- **Opportunity size.** Most cycles that are profitable at a given moment are dust pools worth a fraction of a cent, below gas. Real opportunities follow large swaps on pools that share a token with another venue.

Before putting a key in, run `coven-arb run --dry-run --log runs.jsonl` for an hour or two on the endpoint you will actually use, and count how often a trade clears the floor.

## The log

With `--log`, every event is one JSON line:

| `type` | Written when |
| --- | --- |
| `opportunity` | A dry run finds a trade that clears the floor. |
| `below_floor` | A cycle is profitable on-chain but not after gas and the bid. |
| `sent` | A transaction is broadcast, with `reactionMs` from the triggering block. |
| `outcome` | It lands (`won` or `reverted`) or is `dropped`, with the realized profit and gas paid. |
| `status` | Once a minute: block, pools, cycles, probes, trades and running profit. |
| `error` | Anything that went wrong, with where it happened. |

It is the dataset that answers whether the strategy makes money.

## Limits

- **Native-USDC pools are not traded.** Many launchpad pools are quoted in native USDC (`address(0)` in v4, 18 decimals) rather than the ERC-20. Mixing the two in one cycle is unverified against the contract, so these pools are indexed but never routed.
- **Hook fees are invisible until simulated.** A hooked pool can look profitable on spot prices and still lose. The on-chain check catches this before anything is sent, and the cycle is not checked again until its edge improves.
- **Some v4 pools cannot be recovered.** For 10 to 20% of the v4 pools seen trading, the key cannot be rebuilt from one transaction. `index` finds them from their `Initialize` event.
