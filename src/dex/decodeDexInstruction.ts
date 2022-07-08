import { u8 } from '@solana/buffer-layout';
import { TransactionInstruction } from '@solana/web3.js';
import { decodeNewOrderInstruction } from './instructions/newOrder';
import { DecodedDexInstruction, DexInstruction } from './types';

export function decodeDexInstruction(instruction: TransactionInstruction) {
    if (!instruction.data.length) throw new Error('missing instruction data');

    const type = u8().decode(instruction.data);

    switch (type) {
        case DexInstruction.NewOrder: {
            const decodedIx = decodeNewOrderInstruction(instruction);
            return decodedIx;
        }
        default: {
            throw new Error(`unknown instruction`);
        }
    }
}
