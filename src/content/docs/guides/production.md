---
title: Going to production
description: What to change before real users arrive.
---

## Use your own RPC

The default Arc endpoint is public and rate-limits heavy use. Point the SDK at your own:

```ts
import { createCoven } from '@covennetwork/sdk'
import { http } from 'viem'

export const coven = createCoven({
  arcTransport: http('https://your-arc-endpoint'),
  chainTransports: { 8453: http('https://your-base-endpoint') },
})
```

`arcTransport` covers quoting, discovery and swapping. `chainTransports` covers the source chains you bridge from. Both take any viem transport, so a fallback across two providers works:

```ts
import { fallback, http } from 'viem'

arcTransport: fallback([http('https://primary'), http('https://backup')])
```

## Use your own bundler

Gasless deposits default to Pimlico's public bundler. Supply your own for real traffic:

```ts
createCoven({ bundlerUrls: { 8453: 'https://api.pimlico.io/v2/8453/rpc?apikey=...' } })
```

Keys in browser code are visible, so restrict them to your domain in the provider's dashboard.

## Keep discovery modest

Each browser watching new pairs polls once a second and reads details for what it finds. That is fine for a normal number of users on a dedicated RPC. If you need a long history or you are serving many visitors, have a backend poll once and publish a snapshot, then let browsers watch the tip for freshness.

## Handle the errors people will actually hit

`NO_ROUTE`, `INSUFFICIENT_BALANCE` and `WRONG_CHAIN` are ordinary conditions, not bugs. `PAUSED` means Coven's guardian has paused swaps. See [errors](/reference/errors/) for the full list and suggested messages.

## Watch the contracts

Coven's router emits `Swapped` and `Bridged`, and configuration changes emit their own events. Worth watching:

- `PlatformFeeUpdated` and `FeeRecipientUpdated`, for changes to Coven's fee.
- `Paused` and `Unpaused`.
- `HookAllowedUpdated` and `HookTemplateAdded`, which change which v4 pools are routable.

## Before you launch

- Do a small real swap and a small real bridge with your own money.
- Check that your interface leaves USDC behind for gas.
- Confirm lookalike warnings appear in your token picker.
- Pin the SDK version and read the changelog before upgrading.
- Remember the contracts are unaudited, and say so where users can see it.
