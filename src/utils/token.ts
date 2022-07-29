import { PublicKey } from '@solana/web3.js';
import config from '../../config.json';
import { TokenConfig } from '../core/types';

// Define a lookup table of allowed token mint public keys to their config values
export const tokens = config.tokens.reduce<Record<string, TokenConfig>>(function (tokens, token) {
    tokens[token.mint] = {
        symbol: token.symbol,
        mint: new PublicKey(token.mint),
        account: new PublicKey(token.account),
        decimals: token.decimals,
        api: {
            type: token.api.type,
            url: token.api.url,
        },
    };
    return tokens;
}, {});
