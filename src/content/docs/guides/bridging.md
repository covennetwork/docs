---
title: Bridging USDC
description: Move USDC between Arc and ten other chains with Circle's CCTP.
---

Coven bridges USDC through Circle's CCTP with the Forwarding Service, so Circle delivers the funds on the far side. The recipient needs no gas on the destination chain.

Ten chains are supported in both directions: Ethereum, Base, Arbitrum, OP Mainnet, Polygon, Avalanche, Unichain, Linea, Sonic and World Chain.

```ts
coven.bridge.chains()
```

## Out of Arc

Send USDC, or swap any token into USDC and send the proceeds, in one transaction:

```ts
const preview = await coven.bridge.quoteFromArc({
  tokenIn: someToken,
  amountIn: 10n ** 18n,
  destinationChainId: 8453, // Base
})

const { hash } = await coven.bridge.fromArc({
  wallet: walletClient,
  tokenIn: someToken,
  amountIn: 10n ** 18n,
  destinationChainId: 8453,
})
```

When `tokenIn` is USDC, the SDK burns it directly through CCTP and no platform fee applies. For any other token, the swap and the burn happen inside Coven's router in a single transaction, and the entire swap output is bridged, leaving nothing stranded on Arc.

`preview.minReceived` is what arrives if the swap fills at the quoted price, after Circle's maximum fee. The swap itself can still come in lower, down to your slippage limit.

## Into Arc

```ts
const { hash } = await coven.bridge.toArc({
  wallet: baseWalletClient, // a wallet on the source chain
  sourceChainId: 8453,
  amount: 50_000_000n,
})
```

This approves and burns USDC on the source chain, where the user pays gas in that chain's native token. If they have USDC but no ETH, use [gasless deposits](/guides/gasless/) instead.

The USDC arrives at the same address on Arc, where it also pays for gas, so the user can trade straight away.

`speed` is `'fast'` by default, which costs a few hundredths of a percent and settles in seconds to minutes. `'standard'` has no Circle fee and waits for full finality on the source chain, which on Ethereum takes around fifteen minutes.

## Tracking it

```ts
const status = await coven.bridge.status({ sourceChainId: 8453, hash })

await coven.bridge.waitForDelivery({
  sourceChainId: 8453,
  hash,
  onStatus: (s) => console.log(s.state),
})
```

States run `pending`, then `attested`, then `delivered`. Once delivered, `forwardTxHash` is the transaction that minted the USDC on the destination chain. For transfers leaving Arc, pass `sourceChainId: 5042`.

`waitForDelivery` gives up after 45 minutes by default and throws `TIMEOUT`. The transfer is not lost when that happens; Circle continues, and the status call still works.

## Fees

Two fees come out of a transfer, both quoted before you sign:

- Circle's forwarding fee, a fixed amount around two cents, which pays for delivery on the destination chain.
- Circle's transfer fee, charged only on fast transfers, currently a fraction of a basis point.

Coven's platform fee applies to the swap portion, if there is one, and never to a plain USDC bridge.
