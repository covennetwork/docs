---
title: The arbitrage CLI
description: Install and run coven-arb — run, scan, index and doctor, its flags and environment, and what decides whether it makes money.
---

`coven-arb` is the primary way to run the bot. It watches every block, finds USDC cycles across Uniswap v3, v4 and v3-style forks, plus the payouts of fair-launch hooks, simulates each route through [`CovenProbe`](/arbitrage/contract/) against live state, and sends only the ones that pay for their own gas. A trade either makes money or is skipped on-chain; you never hold inventory.

Version 0.5.0 moved the bot from `CovenArb` to `CovenProbe`. If you ran 0.4, see [Upgrading from 0.4](#upgrading-from-04).

## Install

Requires **Node.js ≥ 18.3** (Node 22+ for the websocket feed). `viem` is a peer dependency and is installed automatically on npm 7+.

```sh
# global install (recommended for a long-running bot)
npm i -g @covennetwork/arb
coven-arb doctor

# or run without installing
npx @covennetwork/arb doctor
```

The package ships a compiled CLI; there is no build step on your side.

## Quick start on a server

Run it on a machine close to your RPC endpoint: whether a send lands in the next block is most of the result.

```sh
npm i -g @covennetwork/arb
export ARC_RPC_URL=https://your-endpoint,https://rpc.blockdaemon.mainnet.arc.io
coven-arb doctor                                   # endpoints, contract, gas, cache
coven-arb run --dry-run --log dry.jsonl            # an hour or two, no key needed
export COVEN_PRIVATE_KEY=0x...                     # a fresh key holding ~1 USDC for gas
coven-arb run --max-loss 0.5 --log trades.jsonl
```

To keep it running after you log out, start it inside `tmux` or `screen`, or as a systemd service. The first start replays about three hours of market events to find pools, which takes several minutes on public endpoints; later starts read the cache and take seconds.

## Commands

```sh
coven-arb run      [--dry-run] [--min-profit <usdc>] [--tip <gwei>] [--max-loss <usdc>] [--ws <url|off>] [--log <file>]
coven-arb scan     [--min-profit <usdc>] [--json]
coven-arb index    [--from <block>]
coven-arb doctor
```

- **`run`** is the live bot. It needs a signer (see [Environment](#environment)) unless you pass `--dry-run`, which does everything except sign and send. Ctrl-C stops it cleanly: it waits for pending transactions and prints the session's profit and gas.
- **`scan`** is one read-only pass over the current market. It prints every route that is profitable on-chain right now and whether it clears the floor after gas.
- **`index`** is optional. It records every pool ever created, newest first, so a token's dormant venues are known before they first trade. It is resumable (Ctrl-C is safe) and needs an endpoint that serves historical logs; on the public endpoints a full index takes about two hours.
- **`doctor`** checks each endpoint's latency and log support, the `CovenProbe` contract and its current fee, the gas price and what a trade costs, the signer's balance, and the pool cache. It exits non-zero if anything fails.

There is no flag to choose the contract: the CLI always uses the deployed `CovenProbe`. There is no `--tokens` flag either, since the bot finds its own markets.

## Flags

| Flag | Applies to | Default | Description |
| --- | --- | --- | --- |
| `--rpc <url,...>` | all | `$ARC_RPC_URL`, else the public Arc endpoints | Comma-separated. Requests are spread across all endpoints, a rate-limited one is skipped, and transactions are broadcast to every one. |
| `--min-profit <usdc>` | `run`, `scan` | `0` | Smallest profit worth sending, after `CovenProbe`'s fee and gas. The contract enforces it. |
| `--tip <gwei>` | `run`, `scan` | `0` | Priority fee per gas. See [Why no bidding](#why-no-bidding). |
| `--max-loss <usdc>` | `run` | — | Stop once gas spent exceeds profit by this much. |
| `--ws <url\|off>` | `run` | `$ARC_WS_URL`, else the first `--rpc` as `wss://` | Websocket for pushed market events. Polling stays on behind it. Needs Node 22+; on older versions the bot polls only. |
| `--dry-run` | `run` | off | Report what it would send without signing anything. |
| `--log <file>` | `run` | — | Append every opportunity, send, outcome and status line as JSON lines. |
| `--json` | `scan` | off | Print routes as JSON. |
| `--from <block>` | `index` | first DEX block | Oldest block to index. |
| `--help`, `-h` | — | — | Print usage and exit. |

## Environment

| Variable | Used by | Description |
| --- | --- | --- |
| `COVEN_PRIVATE_KEY` | `run`, `doctor` | Raw private key (`0x`-prefixed or bare). |
| `COVEN_KEYSTORE` / `COVEN_KEYSTORE_PASSWORD` | `run`, `doctor` | An encrypted v3 keystore, as written by geth, `cast wallet` or MetaMask, and its password. |
| `ARC_RPC_URL` | all | Default endpoints when `--rpc` is not passed. Comma-separated. |
| `ARC_WS_URL` | `run` | Default websocket when `--ws` is not passed. |
| `COVEN_ARB_CACHE` | all | Directory for the pool cache. Default `~/.cache/coven-arb`. |

The signer only pays gas. `CovenProbe` settles each route inside one transaction, so no trading capital is needed. A trade costs 0.004 to 0.014 USDC in gas depending on its legs, and a send whose gap has already gone about 0.0013. Each send needs about 0.02 USDC free up front, since the node checks gas limit × max fee before accepting it. Keep at least 0.1 USDC on the signer; below what a send needs, the bot logs `NOT SENT` and waits instead of failing silently.

## No private-key flag

There is no `--private-key` flag, on purpose. It lands in shell history and in screenshots when people paste logs. Provide the key out of band instead:

```sh
export COVEN_KEYSTORE=~/.keys/arb.json COVEN_KEYSTORE_PASSWORD=...
coven-arb run --log trades.jsonl
```

## How a trade is found

1. **Discovery.** At startup the bot replays about three hours of swap and liquidity events to find every pool that is actually trading. A v3-style pool is rebuilt from its own getters and kept if a known factory created it: Uniswap v3, Synthra V3 or a Slipstream-style CL clone. A v4 pool only reveals its key in its `Initialize` event, usually older than a public endpoint will serve, so the key is recovered from a transaction that swapped the pool. For each token found, it also checks the token's other venues against USDC, EURC and native USDC. Hooks that keep a per-pool fee inventory are noted. Everything is cached, so later starts take seconds.
2. **Routes.** Every `USDC → X → USDC` and `USDC → X → Y → USDC` loop through distinct pools, where either end can be ERC-20 or native USDC. For each fair-launch hook pool, a payout route: buy the hook's fee inventory at the pool price and sell it back.
3. **Screen.** Market events arrive over a websocket subscription as they happen, with an `eth_getLogs` poll behind it so no block is ever missed. Swap events carry the pool's new price and liquidity, so state stays exact. Cycles touched by new events, and all of them every 30 seconds, are priced from spot prices and LP fees.
4. **Simulate.** Every candidate goes through `CovenProbe` in one round of calls against the latest block. The contract checks, sizes and trades each route, so the profit it reports is exact after every tick, hook and fee, and after its own cut.
5. **Send.** A route whose profit beats its gas plus `--min-profit` is sent alone, signed locally and broadcast to every endpoint, at `--tip`. That cost goes along as the contract's profit floor: if someone else takes the gap first, the contract skips the trade and the send costs about 60k gas. A payout route also requires the hook to still hold at least half the inventory the bot saw.
6. **Back off.** After a miss, every pool the route used sits out for 30 seconds, doubling with each consecutive miss up to 30 minutes, since many cycles share the same contested pools. Hook payout routes are exempt: their gate already makes a miss cheap.

## Why no bidding

Arc orders transactions by priority fee per gas, so a higher bid lands first. Measured over a week of Arc arbitrage in October 2026, bots that bid won contested races but paid a median 81% of what they won in fees. Bots that sent at zero priority fee, and only when their contract found a profit, kept most of theirs. The default is therefore `--tip 0`. A small tip can still help land in the very next block; try it only once your log shows sends landing a block late.

Three things decide whether a run makes money:

- **Latency.** In a 20-hour simulation, sends landing in the block right after a gap appeared netted $4.00; landing one block later, they lost $0.59. Run the bot near your endpoint. `doctor` prints per-endpoint latency, and every `sent` line reports the milliseconds from the block to the broadcast.
- **Hook payouts.** On Arc the largest repeatable source has been fair-launch hooks that sell their collected fees to the next swapper. Other bots harvest them too; whoever lands first after a payout grows takes it.
- **Opportunity size.** Most price gaps at a given moment are dust, below gas. Real ones follow large swaps on pools that share a token with another venue.

Before putting a key in, run `coven-arb run --dry-run --log dry.jsonl` for an hour or two on the endpoint you will actually use, and count how often a send clears the floor.

## The log

With `--log`, every event is one JSON line:

| `type` | Written when |
| --- | --- |
| `opportunity` | A dry run finds a route that clears the floor. |
| `below_floor` | A route is profitable on-chain but not after gas and `--min-profit`. |
| `low_balance` | A send was skipped because the signer cannot cover it up front. |
| `sent` | A transaction is broadcast, with `reactionMs` from the block it was decided on. |
| `outcome` | It lands as `won` (profit paid), `missed` (the gap was gone; only the check's gas was spent) or `reverted`, or is `dropped`. With the expected and realized profit, the protocol fee, the gas paid, and the block it was decided on and landed in. |
| `status` | Once a minute: block, pools, cycles, hook pools, simulations, sends and running profit. |
| `error` | Anything that went wrong, with where it happened. |

`landedBlock` minus `seenBlock` is the number that matters most: it says how often your sends make the next block.

## Upgrading from 0.4

- The bot trades through `CovenProbe` instead of the deprecated `CovenArb`. Nothing to approve or migrate: neither contract holds your funds.
- `--bid` is gone; use `--tip <gwei>`, default 0. `--max-loss` is new.
- `--min-profit` now defaults to 0, since every send carries its own gas cost as the on-chain floor.
- Native-USDC pools, Synthra V3 and Slipstream-style pools, and fair-launch hook payouts are traded.
- The `outbid` and `competitor` log events are gone; `outcome` has a new `missed` status.
- Library: `evaluate`, `priorityFeeFor` and `CompetitorBook` are removed. Use `cycleCandidates`, `price` and `simulate`. The `CovenArb` helpers are still exported, marked deprecated.

## Limits

- **Fee-on-transfer tokens** paid into a v3-style pool fail the pool's balance check. Such routes simulate at no profit and are never sent.
- **Some v4 pools cannot be recovered.** For 10 to 20% of the v4 pools seen trading, the key cannot be rebuilt from one transaction. `index` finds them from their `Initialize` event.
- **Routes of up to three legs** are enumerated; the contract itself takes up to four.
