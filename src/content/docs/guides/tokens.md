---
title: Tokens
description: Where the token list comes from and how lookalikes are flagged.
---

Arc is new, so the usual token lists are thin. Coven builds its list from three places and marks where each token came from.

```ts
const coven = createCoven()

await coven.tokens.loadCoinGecko()

const tokens = coven.tokens.list()
```

- **Official.** USDC, EURC and USYC are built in.
- **CoinGecko.** Their Arc list needs no API key. Entries with the wrong chain, a malformed address or absurd decimals are dropped, and logo URLs are accepted only over HTTPS.
- **Discovered.** Tokens from pools found by [the new pairs feed](/guides/new-pairs/) are added as they appear.

Anything else can be looked up by address:

```ts
const token = await coven.tokens.resolve('0x...')
```

Names, symbols and decimals come from the contract itself. A token that fails to answer is still returned, marked with `flags.metadataUnavailable`.

## Lookalikes

Any token that is not the real USDC, EURC or USYC but wears a similar symbol or name is flagged with `flags.impersonator`. CoinGecko's Arc list currently contains one: a memecoin named UpSideDownCat using the symbol "USDC".

```ts
const suspicious = coven.tokens.list().filter((t) => t.flags.impersonator)
```

Show that warning wherever a user picks a token. The check catches wrapped-looking names such as `WUSDC` and `USDC.e` as well as exact copies, and official tokens are matched by address, so they are never flagged.

A flag is not a verdict. It means the name resembles a stablecoin the user may trust, and they should check the address.

## What a token looks like

```ts
type Token = {
  address: Address
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  sources: ('official' | 'coingecko' | 'discovered' | 'custom')[]
  flags: { impersonator: boolean; metadataUnavailable: boolean }
}
```

`list()` returns official tokens first, then CoinGecko's, then anything looked up or discovered.
