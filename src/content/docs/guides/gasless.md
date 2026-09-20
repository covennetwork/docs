---
title: Gasless deposits
description: Let users bring USDC to Arc without holding the source chain's gas token.
---

Someone holding USDC on Base but no ETH cannot pay for the transfer that brings it to Arc. Circle Paymaster solves this by accepting USDC for gas, and Coven wires it up.

Seven chains support it: Ethereum, Base, Arbitrum, OP Mainnet, Polygon, Avalanche and Unichain. Linea, Sonic and World Chain do not.

```ts
coven.bridge.chains().filter((c) => c.gasless)
```

## What it needs

The account has to be a smart account. For a local key, the SDK builds an EIP-7702 account at the same address:

```ts
import { privateKeyToAccount } from 'viem/accounts'

const account = await coven.bridge.gaslessAccount({
  owner: privateKeyToAccount(key),
  sourceChainId: 8453,
})

const { hash, userOperationHash } = await coven.bridge.toArcGasless({
  account,
  sourceChainId: 8453,
  amount: 50_000_000n,
})
```

Any viem `SmartAccount` can be passed instead, which covers embedded wallets and account-abstraction providers.

Most browser extension wallets will not sign the 7702 authorization on a site's behalf, so this path suits embedded and smart wallets. For everyone else, fall back to [`toArc`](/guides/bridging/#into-arc), where the user pays gas normally.

## How it works

The user signs one permit allowing Circle's paymaster to take USDC for gas, capped by `maxGasUsdc`, which defaults to 5 USDC. The approval, the burn and the delegation travel together as a single user operation. Circle charges only the gas actually used, plus a 10% surcharge on Arbitrum and Base.

The balance must cover the amount being bridged plus gas, and the SDK checks this before building anything.

## Bundlers

User operations go to Pimlico's public bundler, which needs no API key. Its rate limits are not published, so anything with real traffic should use its own:

```ts
createCoven({ bundlerUrls: { 8453: 'https://api.pimlico.io/v2/8453/rpc?apikey=...' } })
```

A key in that URL is visible to anyone using your site, so restrict it to your domain in the provider's dashboard.

## After it lands

Nothing else is different. The USDC arrives on Arc at the same address and pays for gas there, so the user can swap immediately. Track it with [`waitForDelivery`](/guides/bridging/#tracking-it), passing the transaction hash the call returned.
