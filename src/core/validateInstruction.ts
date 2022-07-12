import { Transaction } from '@solana/web3.js';
import { decodeDexInstruction } from '../dex/decodeDexInstruction';

export async function validateInstruction(transaction: Transaction) {
    const [first] = transaction.instructions;
    if (!first) throw new Error('missing instructions');

    const instruction = decodeDexInstruction(first);

    return instruction;
}
