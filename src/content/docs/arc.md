---
title: Arc
description: The chain Coven runs on, and the things that make it different.
---

Arc is Circle's Layer 1 blockchain, built around USDC. Coven runs on Arc mainnet, chain ID 5042.

## Gas is USDC

There is no separate gas token. Transactions are paid for in USDC, which means a wallet holding only USDC can trade, bridge and approve without acquiring anything else first.

Two consequences worth designing around:

- Spending your entire USDC balance leaves nothing for the next transaction. Coven's `swap` does not reserve gas for you, so a "max" button in your interface should hold a little back. The Coven app keeps 0.5 USDC.
- USDC arriving from another chain immediately covers gas, so a new user can bridge in and trade without a faucet or a swap for gas.

## Two ways to see USDC

Arc's USDC exists as the chain's native balance and as an ERC-20 at `0x3600000000000000000000000000000000000000`. Both are the same money. The ERC-20 view reports 6 decimals, matching USDC everywhere else, while the native view uses 18. Coven uses the ERC-20 interface everywhere, so amounts are always in 6 decimals.

## Fast blocks and final results

Blocks arrive about every half second, and a block that lands is final. There are no reorganizations to design around, so a confirmed swap stays confirmed, and a newly created pool never disappears.

This is also why new pairs show up so quickly. Coven polls for new pools once a second and typically reports one within a second or two of its creation.

## What runs there

Uniswap v3 and v4 are both deployed on Arc, along with Circle's CCTP contracts for moving USDC to other chains. Trading is busy: thousands of new pools are created every hour, most of them launchpad tokens paired with USDC.

## Connecting

| Setting | Value |
| --- | --- |
| Chain ID | 5042 |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| Gas token | USDC |

The public RPC rate-limits heavy use. Anything serving real traffic should use its own endpoint, which the SDK accepts through [`arcTransport`](/reference/sdk/#configuration).
