---
title: The arbitrage CLI
description: coven-arb scan, run, simulate and doctor, and why there is no private-key flag.
---

`coven-arb` is the primary way to run the solver. Install it with `npx @covennetwork/arb`.

```sh
coven-arb scan     --tokens 0x..,0x.. --min-profit 0.50 --log runs.jsonl
coven-arb run      --arb 0x.. --min-profit 0.50 --log runs.jsonl
coven-arb simulate plan.json --arb 0x..
coven-arb doctor
```

`scan` is read-only. It prices what it would have done and writes it to the log, so you can watch for a day before risking any gas. `run` is the loop: it watches discovery, simulates each candidate, and submits the ones that clear the floor. `simulate` replays one plan against the chain. `doctor` checks the things that quietly break a bot.

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
