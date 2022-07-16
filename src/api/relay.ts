import { sendAndConfirmRawTransaction, Transaction } from '@solana/web3.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import base58 from 'bs58';
import { cache, connection, ENV_SECRET_KEYPAIR, sha256, simulateRawTransaction, validateTransaction } from '../core';
import { validateInstructions } from '../core/validateInstructions';
import { validateTransfer } from '../core/validateTransfer';
import { cors, rateLimit } from '../middleware';

// Endpoint to pay for transactions with an SPL token transfer
export default async function (request: VercelRequest, response: VercelResponse) {
    await cors(request, response);
    await rateLimit(request, response);

    // Deserialize a base58 wire-encoded transaction from the request

    const serialized = request.body?.transaction;
    if (typeof serialized !== 'string') throw new Error('invalid transaction');
    let transaction = Transaction.from(Buffer.from(serialized, 'base64'));

    // Prevent simple duplicate transactions using a hash of the message
    let key = `transaction/${base58.encode(sha256(transaction.serializeMessage()))}`;
    if (await cache.get(key)) throw new Error('duplicate transaction');
    await cache.set(key, true);

    // Check that the transaction is basically valid, sign it, and serialize it, verifying the signatures
    transaction = await validateTransaction(transaction);

    const costLamports = await validateInstructions(transaction);

    const { instruction: transfer } = await validateTransfer(transaction.instructions[0], transaction.signatures, {
        expectedAmountInLamports: costLamports,
    });

    // Add the fee payer signature
    transaction.partialSign(ENV_SECRET_KEYPAIR);

    // Serialize the transaction, verifying the signatures
    const rawTransaction = transaction.serialize();
    const signature = base58.encode(transaction.signature!);

    /*
       An attacker could make multiple signing requests before the transaction is confirmed. If the source token account
       has the minimum fee balance, validation and simulation of all these requests may succeed. All but the first
       confirmed transaction will fail because the account will be empty afterward. To prevent this race condition,
       simulation abuse, or similar attacks, we implement a simple lockout for the source token account until the
       transaction succeeds or fails.
     */
    key = `transfer/${transfer.keys.source.pubkey.toBase58()}`;
    if (await cache.get(key)) throw new Error('duplicate transfer');
    await cache.set(key, true);

    try {
        const blockHeight = await connection.getBlockHeight('finalized');

        // Simulate, send, and confirm the transaction
        await simulateRawTransaction(rawTransaction);
        await sendAndConfirmRawTransaction(connection, rawTransaction, {
            signature,
            blockhash: transaction.recentBlockhash!, // we know it exists because of validateTransaction
            lastValidBlockHeight: blockHeight + 300, // TODO: correct???
        });
    } catch (e) {
        console.error(e);
        return response.status(400).send(e);
    } finally {
        await cache.del(key);
    }

    // Respond with the confirmed transaction signature
    return response.status(200).send({ signature });
}
