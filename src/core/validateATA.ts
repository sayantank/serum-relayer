import { struct, u8 } from '@solana/buffer-layout';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { ENV_FEE_PAYER } from './env';

export interface CreateAssociatedTokenAccountInstructionData {
    instruction: number;
}

export const createAssociatedTokenAccountInstructionData = struct<CreateAssociatedTokenAccountInstructionData>([
    u8('instruction'),
]);

export async function validateATA(instruction: TransactionInstruction) {
    if (!instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID))
        throw new Error('invalid associated token account program id');

    // NOTE: No instruction data = createATA
    // if (instruction.data.length !== createAssociatedTokenAccountInstructionData.span)
    //     throw new Error('invalid ata instruction data');

    if (instruction.data.length) throw new Error('invalid ata instruction');

    const [payer, associatedToken, owner, mint, systemProgram, tokenProgram, rent] = instruction.keys;

    if (!payer || !associatedToken || !owner || !mint || !systemProgram || !tokenProgram || !rent)
        throw new Error('invalid ata instruction keys');

    // validateTransaction already checks that fee relayer is in transaction.signatures, so no need to check again here
    if (!payer.pubkey.equals(ENV_FEE_PAYER)) throw new Error('fee relayer has to pay for ATA');

    if (owner.pubkey.equals(ENV_FEE_PAYER)) throw new Error('cannot initialize ata for relayer');

    const ownerATA = await getAssociatedTokenAddress(mint.pubkey, owner.pubkey, false);
    if (!ownerATA.equals(associatedToken.pubkey)) throw new Error('invalid ata');

    if (!systemProgram.pubkey.equals(SystemProgram.programId)) throw new Error('invalid system program id');

    if (!tokenProgram.pubkey.equals(TOKEN_PROGRAM_ID)) throw new Error('invalid token program id');

    if (!rent.pubkey.equals(SYSVAR_RENT_PUBKEY)) throw new Error('invalid rent pubkey');

    return {
        programId: instruction.programId,
        keys: {
            payer,
            associatedToken,
            owner,
            mint,
            systemProgram,
            tokenProgram,
            rent,
        },
    };
}
