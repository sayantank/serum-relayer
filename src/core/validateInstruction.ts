import { Transaction } from '@solana/web3.js';
import { decodeDexInstruction } from '../dex/decodeDexInstruction';
import { DexInstruction } from '../dex/types';

export async function validateInstruction(transaction: Transaction, expectedInstruction: DexInstruction) {
    const [first] = transaction.instructions;
    if (!first) throw new Error('missing instructions');

    const instruction = decodeDexInstruction(first);
    if (instruction.tag.toNumber() !== expectedInstruction)
        throw new Error(
            `expected instruction: ${expectedInstruction}, actual instruction: ${instruction.tag.toNumber()}`
        );

    return instruction;
}
