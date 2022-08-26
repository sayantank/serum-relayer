export const Router = {
  "version": "0.1.0",
  "name": "serum_router",
  "instructions": [
    {
      "name": "swapExactTokensForTokens",
      "accounts": [
        {
          "name": "from",
          "accounts": [
            {
              "name": "market",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "orderbook",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "eventQueue",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "bids",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "asks",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "baseVault",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "quoteVault",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "marketSigner",
              "isMut": false,
              "isSigner": false
            }
          ]
        },
        {
          "name": "to",
          "accounts": [
            {
              "name": "market",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "orderbook",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "eventQueue",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "bids",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "asks",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "baseVault",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "quoteVault",
              "isMut": true,
              "isSigner": false
            },
            {
              "name": "marketSigner",
              "isMut": false,
              "isSigner": false
            }
          ]
        },
        {
          "name": "inputTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "intermediateTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "outputTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userOwner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "splTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "dexProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "amountOutMin",
          "type": "u64"
        },
        {
          "name": "matchLimit",
          "type": "u64"
        },
        {
          "name": "hasDiscountTokenAccount",
          "type": "u8"
        }
      ]
    }
  ],
  "metadata": {
    "address": "DthR1weAAyUJ2hnTFNafvJP1eSkTvNTNhYw8YsSUMSTA"
  }
}