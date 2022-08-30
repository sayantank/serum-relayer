import { ACCOUNT_SIZE, ASSOCIATED_TOKEN_PROGRAM_ID, decodeInstruction, isCloseAccountInstruction, isInitializeAccountInstruction, isTransferCheckedInstruction, isTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SystemProgram, Transaction } from '@solana/web3.js';
import config from '../../config.json';
import { DEX_ID } from '../dex/consts';
import { decodeDexInstruction } from '../dex/decodeDexInstruction';
import { initializeAccountInstruction } from '../dex/dex-v4/js/src/raw_instructions';
import { ROUTER_ID } from '../router/consts';
import { decodeRouterInstruction } from '../router/decodeRouterInstructions';
import { connection } from './connection';
import { ORDER_LEN, USER_ACCOUNT_HEADER_LEN } from './consts';
import { ENV_FEE_PAYER } from './env';
import { validateATA } from './validateATA';
import { validateCloseTokenAccount } from './validateCloseTokenAccount';
import { validateCreateTokenAccount } from './validateCreateTokenAccount';
import { validateInitTokenAccount } from './validateInitTokenAccount';
import { validateTransfer } from './validateTransfer';

export async function validateInstructions(transaction: Transaction): Promise<number> {
    let costLamports = 0;
    const [transferIx, ...restIxs] = transaction.instructions;

    if (transferIx.programId.toBase58() != TOKEN_PROGRAM_ID.toBase58())
        throw new Error('token transfer instruction missing');
    else
        costLamports += config.lamportsPerInstruction;

    for (const key of transferIx.keys) {
        if ((key.isWritable || key.isSigner) && key.pubkey.equals(ENV_FEE_PAYER)) throw new Error('invalid account');
    }

    for (const ix of restIxs) {
        switch (ix.programId.toBase58()) {
            case SystemProgram.programId.toBase58(): {
                const rent = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE, 'confirmed');
                await validateCreateTokenAccount(ix, { expectedAmountInLamports: rent });
                costLamports += rent;
                break;
            }
            case TOKEN_PROGRAM_ID.toBase58(): {
                const decodedIx = decodeInstruction(ix);

                if (isTransferInstruction(decodedIx) || isTransferCheckedInstruction(decodedIx))
                    await validateTransfer(ix, transaction.signatures);

                else if (isInitializeAccountInstruction(decodedIx))
                    await validateInitTokenAccount(ix);

                else if (isCloseAccountInstruction(decodedIx))
                    await validateCloseTokenAccount(ix);

                break;
            }
            case ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(): {
                await validateATA(ix);
                const rent = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE, 'confirmed');
                costLamports += rent;
                break;
            }
            case DEX_ID.toBase58(): {
                const decodedIx = decodeDexInstruction(ix);
                if (decodedIx instanceof initializeAccountInstruction) {
                    ix.keys.forEach((key, i) => {
                        if (i === ix.keys.length - 1) {
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
                } else {
                    ix.keys.forEach((key) => {
                        if ((key.isWritable || key.isSigner) && key.pubkey.equals(ENV_FEE_PAYER)) {
                            throw new Error('fee relayer can only be used as fee payer');
                        }
                    });
                }
                break;
            }
            case ROUTER_ID.toBase58(): {
                decodeRouterInstruction(ix);
                ix.keys.forEach((key) => {
                    if ((key.isWritable || key.isSigner) && key.pubkey.equals(ENV_FEE_PAYER)) {
                        throw new Error('fee relayer can only be used as fee payer');
                    }
                });
                break;
            }
            default: {
                throw new Error(`unknown program id ${ix.programId.toString()}`);
            }
        }

        costLamports += config.lamportsPerInstruction;
    }

    return costLamports;
}
