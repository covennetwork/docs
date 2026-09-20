---
title: Errors
description: What the SDK throws, and what to show a user.
---

Problems the SDK detects itself throw `CovenError`, which carries a `code`. Errors from the wallet, RPC or contracts come through from viem unchanged.

```ts
import { CovenError } from '@covennetwork/sdk'

try {
  await coven.swap({ wallet, tokenIn, tokenOut, amountIn })
} catch (error) {
  if (error instanceof CovenError && error.code === 'NO_ROUTE') {
    show('No route for that amount. Try a smaller trade.')
  }
}
```

| Code | Cause | Suggested message |
| --- | --- | --- |
| `NO_ROUTE` | No pool fills the amount within the price impact limit | No route for that amount. Try a smaller trade. |
| `INSUFFICIENT_BALANCE` | Balance is below the amount | Not enough to cover this. |
| `WRONG_CHAIN` | Wallet is on another chain | Switch your wallet to Arc. |
| `NO_ACCOUNT` | The wallet client has no account | Connect a wallet. |
| `PAUSED` | Coven's guardian paused swaps | Swaps are paused right now. |
| `UNSUPPORTED_CHAIN` | That chain is not supported by CCTP here | That chain is not supported. |
| `GASLESS_UNSUPPORTED` | Circle Paymaster is not on that chain, or the account cannot sign | This wallet cannot pay gas in USDC here. |
| `INVALID_ARGUMENT` | A parameter is out of range, or a transaction reverted | Something about this request was invalid. |
| `API_ERROR` | CoinGecko or Circle's API failed | Could not reach a service. Try again. |
| `TIMEOUT` | A transfer was not delivered in the wait window | Still in transit. Check again shortly. |
| `NOT_DEPLOYED` | The SDK has no contract addresses, which should not happen in a published release | Please update the SDK. |

## Errors from elsewhere

- **User rejected the request.** viem throws `UserRejectedRequestError`. Treat it as a cancellation, not a failure.
- **Simulation reverted.** `swap` simulates before asking for a signature, so a token that blocks selling fails here. The message usually names the contract error.
- **Rate limits.** A public RPC under load returns HTTP 429. Use your own endpoint in production.

## Timeouts while bridging

`waitForDelivery` throws `TIMEOUT` after 45 minutes by default. The transfer is not lost. Circle keeps working on it, and `status` still reports where it is.
