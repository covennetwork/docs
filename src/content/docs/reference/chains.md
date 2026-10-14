---
title: Chains
description: Where USDC can come from and go to, and where gas can be paid in USDC.
---

The [kit](/guides/kit/) connects wallets on every EVM mainnet viem ships, more than 390 chains, with Arc as the default; swaps and balances work wherever the wallet is. This page covers the chains USDC can move between.

Coven bridges USDC between Arc and ten chains, in both directions, using Circle's CCTP with the Forwarding Service.

| Chain | Chain ID | CCTP domain | Gasless deposits |
| --- | --- | --- | --- |
| Ethereum | 1 | 0 | Yes |
| Avalanche | 43114 | 1 | Yes |
| OP Mainnet | 10 | 2 | Yes |
| Arbitrum One | 42161 | 3 | Yes |
| Base | 8453 | 6 | Yes |
| Polygon | 137 | 7 | Yes |
| Unichain | 130 | 10 | Yes |
| Linea | 59144 | 11 | No |
| Sonic | 146 | 13 | No |
| World Chain | 480 | 14 | No |

Arc itself is domain 26.

```ts
coven.bridge.chains()
// [{ chainId, name, domain, usdc, gasless }, ...]
```

"Gasless deposits" means Circle Paymaster runs there, so a user with USDC and no native token can still pay for the transfer into Arc. See [gasless deposits](/guides/gasless/).

## How long transfers take

Fast transfers settle in seconds to a few minutes and pay a small Circle fee. Standard transfers wait for full finality on the source chain, which is quick on most chains and around fifteen minutes on Ethereum, and pay no Circle transfer fee. Both pay the forwarding fee, roughly two cents, for delivery on the far side.

## Swapping and bridging together

Leaving Arc, a swap into USDC and the bridge happen in one transaction. Arriving, the USDC lands on Arc where it also pays for gas, so a swap right after costs nothing extra to set up.

## Paying with USDC from another chain

In the [kit](/guides/kit/) and the [widget](/guides/widget/), USDC on any chain above can pay for an Arc token directly. The wallet is asked to switch to that chain to send, and to Arc to buy, in that order. Only the USDC that arrived is spent on the swap.
