import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import { tokenDecimalsToAtomics } from '../utils/numerical';
import { CostInfo, TokenConfig } from './types';

// charge 50 bps more to avoid insufficient amount errors
const BUFFER = 0.005;

export async function calculateCost(token: TokenConfig, expectedAmountInLamports: number): Promise<CostInfo> {
    const expectedSOL = expectedAmountInLamports / LAMPORTS_PER_SOL * (1 + BUFFER);

    let solPrice: number;
    switch (token.api.type) {
        case 'coingecko': {
            try {
                const { data } = await axios.get(token.api.url);
                solPrice = data.solana[token.api.symbol];
            } catch (e) {
                console.error(e);
                throw new Error('could not fetch sol price');
            }
            break;
        }
        default: {
            throw new Error('unknown api type');
        }
    }

    const expectedTokens = expectedSOL * solPrice;
    const expectedTokenAtomics = tokenDecimalsToAtomics(expectedTokens, token.decimals);

    return {
        expectedSOL,
        expectedTokens,
        expectedTokenAtomics,
    };
}
