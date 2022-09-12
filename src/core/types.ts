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
        symbol: string;
    };
}

export interface CostInfo {
    expectedSOL: number;
    expectedTokens: number;
    expectedTokenAtomics: BN;
}

export const relayInstructionNames = [
    'createTokenAccount',
    'createObligationAccount',
    'transfer',
    'createATA',
    'initTokenAccount',
    'closeTokenAccount',
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
    'swapExactTokensForTokens',
    'depositReserveLiquidityAndObligationCollateral',
    'withdrawObligationCollateralAndRedeemReserveLiquidity',
    'refreshObligation',
    'refreshReserve',
    'initObligation',
] as const;
export type RelayInstructionType = typeof relayInstructionNames[number];

export type RelayInstructionConfig = {
    type: RelayInstructionType;
    args?: any;
};
