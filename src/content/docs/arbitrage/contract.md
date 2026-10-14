---
title: The arbitrage contract
description: How CovenProbe checks, sizes and settles a route, what protects it, and the deprecated CovenArb.
---

`CovenProbe` is a sibling of the retail router, deployed separately and with the opposite security posture: anyone can call it, and it holds nothing.

| | |
| --- | --- |
| Address | `0x179606809c8611BebFAC04357f0B4E0Fb8b6479E` |
| Fee | 10% of realized profit |
| Deployed | 14 October 2026, block 25,952,143 |

`@covennetwork/arb` exports it as `COVEN_PROBE` and uses it by default.

`CovenProbe` has not had an external security review yet. It was tested on a fork of Arc mainnet, including replays of 45 real arbitrages from October 2026. Keep the signer's balance small.

## Execution

`probe(routes, maxFeeBps)` takes a list of routes and returns each one's profit. Per route:

1. **Gate.** An optional view call that must return at least a minimum, for example a fair-launch hook's `poolFees(key)`. If it does not, the route returns 0 for the price of that call.
2. **Check.** The contract reads each pool's price (v4 through the PoolManager, v3-style pools through `slot0()`) and multiplies the fee-adjusted rates around the cycle. No gap: the route returns 0 without swapping.
3. **Size.** A two-leg route's first swap carries a price limit at the point where both pools' fee-adjusted prices meet, computed from each pool's in-range liquidity. Longer routes trade the input the caller passes.
4. **Trade.** A self-call opens a PoolManager unlock and runs the legs. A v4 leg swaps on the PoolManager, which records deltas without moving tokens. A v3-style leg syncs its output currency, swaps with the PoolManager as recipient and settles, so the output lands as a credit; the input is taken from the PoolManager inside the pool's swap callback. Each later leg spends whatever the contract is owed in its input currency, which also covers hook payouts.
5. **Settle.** ERC-20 and native USDC are one balance on Arc. A route that starts in one and ends in the other is squared by taking one and settling the other. The profit must reach the route's `minProfit` after the fee. If it does not, or anything in the trade fails, the self-call reverts alone and the route returns 0.
6. **Pay.** The fee is minted to the fee recipient as an ERC-6909 claim inside the PoolManager, and the rest is taken to the caller as USDC. The payout is therefore a transfer from the PoolManager, not from `CovenProbe`.

Pools are accepted from any v3-style DEX with Uniswap v3's `swap` signature: Uniswap v3, Synthra V3 (whose callback is `synthraV3SwapCallback`) and Slipstream-style CL clones. v4 pools can have any hook.

## What protects it

- **No inventory.** Every token is borrowed from the PoolManager and repaid in the same unlock. The contract holds nothing between transactions, so there is nothing in it to steal.
- **The swap callbacks** pay only the pool being called at that moment, recorded in transient storage before the swap, and only the leg's input token, taken from the PoolManager. A fake pool can make the trade lose, and then the whole route reverts at settlement.
- **The unlock callback** accepts calls only from the PoolManager, and the self-call only from the contract itself. `probe` is guarded against reentry.
- **Native USDC** is accepted only from the PoolManager.

## Fees and bounds

The fee is taken off the measured profit before the caller is paid, as an ERC-6909 claim minted inside the PoolManager rather than a transfer, so a blocklisted or reverting fee recipient cannot kill a profitable trade. The deployment keeps 10% of realized profit, and the owner can change that within a 20% cap.

Every call names the highest fee it will accept in `maxFeeBps`, and the whole call reverts if the contract's fee is above it. A fee raised after you signed cannot reprice a transaction still in the mempool. The CLI pins it to the fee the contract charges when the bot starts.

Redeeming the accrued claims means calling the PoolManager inside an unlock, so the fee recipient has to be an address that can do that.

## CovenArb (deprecated)

`CovenArb`, at `0xFFAEFEA08cD27e9f0CA6A7e7ce3047e924cb663e`, is the previous arbitrage contract. It executes a fixed list of legs priced by the caller off-chain, trades canonical Uniswap v3 and v4 pools only, and reverts when a plan no longer pays, so a late send costs a full trade's gas. It was covered by [the September 2026 security assessment](/reference/security-review/) and keeps 10% of realized profit.

It is deprecated as of `@covennetwork/arb` 0.5.0: the bot no longer trades through it. It holds no funds and still works for anyone who calls it directly. The arb package still exports its helpers (`COVEN_ARB`, `buildPlan`, `probe`, `readArbConfig`) for 0.4 users; they will be removed in a later release.
