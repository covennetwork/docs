---
title: MCP write path and sessions
description: A bounded, session-gated write path where authority lives in a contract, not in the prompt.
---

The write path lets an agent spend, so its threat model is prompt injection, not user error. A user who sets loose limits and loses money made a choice. A user whose agent read an instruction out of a token name did not. The bounds exist so an instruction injected through attacker-controlled data cannot exceed what the user already authorized out of band. They do not restrict what the user can choose to authorize.

`CovenSession` is the contract standing between an attacker-controlled string and a balance, so review it first. It was covered by [the September 2026 security assessment](/reference/security-review/), which found and fixed a flaw in exactly that boundary.

## Authority lives in the contract

`CovenSession` holds the caps on chain: an expiry, a daily trade count, a maximum price impact and slippage, and a proceeds recipient locked to the owner. Caps on size are per input token, so a buy is bounded in USDC and a sell is bounded in the token's own units. That direction matters: valuing a sell by the USDC it returns would let an agent dump a whole balance for a few dollars after someone crushed the price, and it would count as a few dollars. Bounding the input closes that. The user's funds stay in the user's wallet, approved to the session per token. The contract pulls, swaps through `CovenRouter`, and returns the proceeds to the owner, holding nothing between transactions. Every trade must have USDC on one side, which is how a cap stays denominated in something measurable.

The session key that the server holds is a hot key. It can trade within the caps and nothing more. It cannot change a limit; there is no tool that edits limits and no tool that reveals the key. Only the owner can change a limit, in a transaction the agent cannot produce. Widening a limit takes effect after a delay, which the contract floors at an hour, so a stolen owner key cannot raise a cap and drain in the same block. Narrowing is immediate. Revocation is immediate and permanent: a revoked session is dead, and resuming means creating a new one.

## Slippage is measured against the simulation

The session enforces two floors and takes the stricter one.

The first comes from the simulation step: the realized output must be within the slippage bound of what the simulation saw. The server fills that value from the simulation handle, so the model never chooses it. A fresh quote taken in the same transaction as the swap cannot do this job, because it bounds the gap between a quote and its own execution, which is zero by construction, and someone who moves the price first would walk the trade down with it.

The second comes from a quote the contract takes itself, in the same transaction, bounded by the same slippage setting. On its own it is the weak bound just described. Its job is different: it stops a caller from supplying an expected output far below the truth and buying a worthless fill. Without it the slippage ceiling is only as honest as whoever fills in the number, which means a compromised or prompt-injected server could trade a balance away inside caps that all still read correctly. The review found the session in exactly that state and it was fixed before this deployment.

Neither floor subsumes the other. The caller can always ask for a tighter one and never a looser one.

## Sessions are created through a factory

A session is a per-user contract that the user approves tokens to, which makes a lookalike a phishing target. `CovenSessionFactory` is the trust anchor: it creates every session through CREATE2 keyed on the owner and pins the canonical router and lens, so a factory-created session always points at the real contracts. The factory is at `0xC7d8306A78e91d0C4fA0e5Ad6D1278A73767b057`, and `@covennetwork/core` exports it as `COVEN_SESSION_FACTORY`. The MCP server refuses any session the factory did not create. Verify a session with `factory.isSession(address)` before approving tokens to it.

A session belongs to whoever sent the transaction that created it, so nobody can create one in your name. `create` takes the configuration and a salt; there is no owner argument to get wrong.

Creating a session is one transaction the owner sends with their own wallet, `factory.create`, from the app. There is no per-user contract to deploy and no script to run: the factory is deployed once, and each session is a normal wallet call after that. The connected wallet has to be the intended owner, and `createSession` refuses to send if it is not. The `@covennetwork/core` package exports `createSession` and `predictSession` (the app and the MCP server both use them) for the app to wire behind a button, and `predictSession` returns the address in advance so the UI can show it before the user signs.

## Tools

- `session_status` reports the caps, the remaining allowance for the day, and the expiry.
- `swap_simulate` is mandatory and binding. It simulates the exact on-chain call and returns a handle. The result goes back into the model's context before any commit, which is the step that lets a user or a reviewing model catch an injected trade.
- `swap_execute` takes that handle plus explicit token addresses and amounts. It never accepts a symbol, because a symbol is attacker-controlled data. It refuses a handle that is stale, that was already used, or whose parameters differ from the simulation in any field. It refuses and explains rather than clamping silently, so the agent can tell the user something true.

The key comes from an environment variable or a keystore file, never a flag, and is never logged or returned by any tool. Bridging is not in the write surface: a session may swap on Arc and nothing else.
