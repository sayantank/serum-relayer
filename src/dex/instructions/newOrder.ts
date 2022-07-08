import { DEX_ID } from '@bonfida/dex-v4';
import { TransactionInstruction } from '@solana/web3.js';
import { newOrderInstruction } from '../raw_instruction';
import { deserialize } from 'borsh';

// export interface DecodedNewOrderInstruction {
//     programId: PublicKey;
//     keys: {
//         mint: AccountMeta;
//         rent: AccountMeta;
//     };
//     data: {
//         instruction: DexInstruction.NewOrder;
//         decimals: number;
//         mintAuthority: PublicKey;
//         freezeAuthority: PublicKey | null;
//     };
// }

export function decodeNewOrderInstruction(instruction: TransactionInstruction, programId = DEX_ID) {
    if (!instruction.programId.equals(programId)) throw new Error('invalid program id');

    const decodedIx = deserialize(newOrderInstruction.schema, newOrderInstruction, instruction.data);

    return decodedIx;
}
