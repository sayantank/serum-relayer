import { Transaction } from '@solana/web3.js';
import config from '../../config.json';
import { connection } from './connection';
import { ENV_FEE_PAYER } from './env';

// Check that a transaction is basically valid, sign it, and serialize it, verifying the signatures
export async function validateTransaction(transaction: Transaction): Promise<Transaction> {
    // Check the fee payer and blockhash for basic validity
    if (!transaction.feePayer?.equals(ENV_FEE_PAYER)) throw new Error('invalid fee payer');
    if (!transaction.recentBlockhash) throw new Error('missing recent blockhash');

    // NOTE: transaction.lastValidBlockHeight comes to be undefined even if set from client.
    // if (!transaction.lastValidBlockHeight) throw new Error('missing last valid block height');

    // NOTE: getFeeCalculator is deprecated, using getFeeMessage instead
    const txMessage = transaction.compileMessage();
    const fee = await connection.getFeeForMessage(txMessage, 'confirmed');
    if (fee.value === undefined || fee.value === null) throw new Error('invalid message');
    if (fee.value > config.maxFee) throw new Error('fee too high');

    // const feeCalculator = await connection.getFeeCalculatorForBlockhash(transaction.recentBlockhash);
    // if (!feeCalculator.value) throw new Error('invalid message');
    // if (feeCalculator.value.lamportsPerSignature > config.lamportsPerSignature) throw new Error('fee too high');

    // Check the signatures for length, the primary signature, and secondary signature(s)
    if (!transaction.signatures.length) throw new Error('no signatures');
    if (transaction.signatures.length > config.maxSignatures) throw new Error('too many signatures');

    const [primary, ...secondary] = transaction.signatures;
    if (!primary.publicKey.equals(ENV_FEE_PAYER)) throw new Error('invalid fee payer pubkey');
    if (primary.signature) throw new Error('invalid fee payer signature');

    for (const signature of secondary) {
        if (!signature.publicKey) throw new Error('missing public key');
        if (!signature.signature) throw new Error('missing signature');
    }

    // NOTE: +1 for the transfer instruction
    if (transaction.instructions.length > config.maxDexInstructions + 1) {
        throw new Error('too many instructions');
    }

    return transaction;
}
