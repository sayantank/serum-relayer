import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface TokenConfig {
    symbol: string;
    mint: PublicKey;
    account: PublicKey;
    decimals: number;
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
export type RelayInstructionType = typeof relayInstructionNames[number];

export type RelayInstructionConfig = {
    type: RelayInstructionType;
    args?: any;
};
