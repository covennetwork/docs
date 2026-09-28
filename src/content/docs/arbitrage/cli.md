---
title: The arbitrage CLI
description: Install and run coven-arb — scan, run, simulate and doctor, its flags and environment, and why there is no private-key flag.
---

`coven-arb` is the primary way to run the solver.

## Install

Requires **Node.js ≥ 18**. `viem` is a peer dependency and is installed automatically on npm 7+.

```sh
# global install (recommended for a long-running bot)
npm i -g @covennetwork/arb
coven-arb doctor

# or run without installing
npx @covennetwork/arb doctor
```

The package ships a compiled CLI; there is no build step on your side. Confirm the install with `coven-arb doctor` before anything else — it catches the three misconfigurations that cause most silent failures (see [doctor](#doctor)).

## Commands

```sh
coven-arb scan     --tokens 0x..,0x.. --min-profit 0.50 --log runs.jsonl
coven-arb run      --arb 0x.. --min-profit 0.50 --log runs.jsonl
coven-arb simulate plan.json --arb 0x..
coven-arb doctor
```

- **`scan`** is read-only. It prices what it would have done and writes it to the log, so you can watch for a day before risking any gas. It needs an explicit `--tokens` list.
- **`run`** is the loop: it watches discovery, simulates each candidate, and submits the ones that clear the floor. It needs `--arb` and a signer (see [Environment](#environment)).
- **`simulate`** replays one `plan.json` against the chain. It needs `--arb`.
- **`doctor`** checks the things that quietly break a bot.

## Flags

| Flag | Applies to | Default | Description |
| --- | --- | --- | --- |
| `--tokens <list>` | `scan` | — (required for `scan`) | Comma-separated token addresses to scan. |
| `--arb <address>` | `run`, `simulate` | — (required) | Deployed `CovenArb` contract address. |
| `--min-profit <usdc>` | `scan`, `run` | `0.50` | Net profit floor in USDC. Candidates below it are skipped. |
| `--rpc <url>` | all | `$ARC_RPC_URL` or the public Arc endpoint | Arc RPC endpoint. Use a private one for `run`. |
| `--log <file>` | all | — | Append a JSONL record of every attempt. |
| `--help`, `-h` | — | — | Print usage and exit. |

`simulate` takes the plan file as a positional argument: `coven-arb simulate plan.json --arb 0x..`.

## Environment

The signer is provided out of band, never as a flag (see below).

| Variable | Used by | Description |
| --- | --- | --- |
| `COVEN_PRIVATE_KEY` | `run`, and `doctor`/`simulate` when set | Raw private key (`0x`-prefixed or bare) for the signing account. |
| `ARC_RPC_URL` | all | Default RPC when `--rpc` is not passed. |
| `COVEN_KEYSTORE` / `COVEN_KEYSTORE_PASSWORD` | — | Reserved. Encrypted-keystore signing is **not bundled in this build**; export `COVEN_PRIVATE_KEY` from your keystore out of band instead. |

## No private-key flag

There is no `--private-key` flag, on purpose. It lands in shell history and in screenshots when people paste logs. Provide the key out of band instead:

```sh
export COVEN_PRIVATE_KEY=0x...
coven-arb run --arb 0x.. --min-profit 0.50
```

`coven-arb --help` explains this too.

## The log

Every attempt is written to the JSONL file, win or revert, with the simulated profit, the realized profit, the gas, and the revert reason. It makes a run debuggable, and it is the dataset that answers whether the strategy makes money.

## doctor

`doctor` looks like filler and is not. Most support load comes from three silent failures:

- A `maxFeePerGas` under 20 gwei. The mempool drops those transactions with no error and no receipt. `doctor` checks that the current gas price clears the floor.
- A public RPC that caps `eth_getLogs` at 1,000 blocks and rate-limits hard. Discovery needs more than that. `doctor` requests a wider range and tells you if the endpoint refuses.
- The wrong chain, or no gas buffer. `doctor` checks the chain id and the signer's USDC balance.
