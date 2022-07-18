# Serum Relayer 💧

[https://serum-relayer.vercel.app/api](https://serum-relayer.vercel.app/api)

1. [What is this?](#what-is-this)
2. [How does it work?](#how-does-it-work)
3. [How much will it cost?](#how-much-will-it-cost)

## What is this?

`serum-relayer` is a gasless transaction relayer for Serum Dex.

Transaction fees on Solana are very inexpensive, but users still need SOL to pay for them, and they often don't know (or forget) this.

`serum-relayer` allows users to relay _[dex-v4](https://github.com/bonfida/dex-v4) instructions_, _token transfer instructions_, and _associated token account instructions_, in exchange for a calculated amount of USDC.

## How does it work?

`serum-relayer` provides an API that lets users pay for certain transactions with USDC instead of native SOL.

A user creates a transaction with the first instruction for a small token transfer to `serum-relayer, along with whatever else their transaction is supposed to do.

The user partially signs the transaction, authorizing it to make the transfer, and so it can't be modified by `serum-relayer` or MITM attacks.

The user sends the serialized transaction to an `POST /relay` endpoint.

`serum-relayer` validates the transaction, signs it to pay the SOL, and broadcasts it on the Solana network.

When the transaction is confirmed, `serum-relayer` will have been paid a fee in the token for this service.

## How much will it cost?

The cost calculation for `serum-relayer` is as follows,

-   Each instruction, including the initial transfer, has a cost of `10000 lamports` worth of USDC.
-   Instructions containing account creations, will also charge the rent cost in USDC.
-   The exchange rate is calculated from a trusted source such as CoinGecko. More configuration [here](config.json).

There is also an API endpoint, `POST /cost` that would return the cost of a given set of instructions in USDC.

The request body should have a structure as shown below,

```json
{
    // The mint to pay with, should be supported by `serum-relayer`
    "mint": "3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs",

    // List of instructions, EXCLUDING the initial payment instructions
    "instructions": [
        {
            "type": "initializeAccount",
            "args": {
                "maxOrders": 10
            }
        },
        {
            "type": "createATA"
        },
        {
            "type": "transfer"
        },
        {
            "type": "newOrder"
        }
    ]
}
```

The types of instructions supported are,

```javascript
export const relayInstructionNames = [
    'transfer',
    'createATA',
    'createMarket',
    'newOrder',
    'swap',
    'cancelOrder',
    'consumeEvents',
    'settle',
    'initializeAccount',
    'sweepFees',
    'closeAccount',
    'closeMarket',
] as const;
```

The set of mints supported for paying `serum-relayer` can be found [here](config.json).
