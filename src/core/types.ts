import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface TokenConfig {
    mint: PublicKey;
    account: PublicKey;
    decimals: number;
    fee: bigint;
    api: {
        type: string;
        url: string;
    };
}

export interface CostInfo {
    expectedSOL: number;
    expectedTokens: number;
    expectedTokenAtomics: BN;
}
