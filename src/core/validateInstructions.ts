import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import config from '../../config.json';
import { ENV_FEE_PAYER } from './env';
import { decodeDexInstruction } from '../dex/decodeDexInstruction';
import { initializeAccountInstruction } from '../dex/dex-v4/js/src/raw_instructions';
import { connection } from './connection';
import { Transaction } from '@solana/web3.js';
import { ORDER_LEN, USER_ACCOUNT_HEADER_LEN } from './consts';

export async function validateInstructions(transaction: Transaction): Promise<number> {
    let costLamports = 0;
    const [transferIx, ...dexIxs] = transaction.instructions;

    if (transferIx.programId.toBase58() != TOKEN_PROGRAM_ID.toBase58()) {
        throw new Error('token transfer instruction missing');
    } else {
        costLamports += config.lamportsPerInstruction;
    }

    for (const key of transferIx.keys) {
        if ((key.isWritable || key.isSigner) && key.pubkey.equals(ENV_FEE_PAYER)) throw new Error('invalid account');
    }

    for (const dexIx of dexIxs) {
        const decodedIx = decodeDexInstruction(dexIx);
        if (decodedIx instanceof initializeAccountInstruction) {
            dexIx.keys.forEach((key, i) => {
                if (i === dexIx.keys.length - 1) {
                    if (!key.pubkey.equals(ENV_FEE_PAYER)) {
                        throw new Error('fee relayer should be fee payer for user account');
                    }
                } else {
                    if ((key.isWritable || key.isSigner) && key.pubkey.equals(ENV_FEE_PAYER)) {
                        throw new Error('fee relayer can only be used as fee payer');
                    }
                }
            });

            const maxOrders = decodedIx.maxOrders;
            const space = USER_ACCOUNT_HEADER_LEN + maxOrders.toNumber() * ORDER_LEN;
            const rent = await connection.getMinimumBalanceForRentExemption(space, 'confirmed');
            costLamports += rent;
        }
        costLamports += config.lamportsPerInstruction;
    }

    return costLamports;
}
