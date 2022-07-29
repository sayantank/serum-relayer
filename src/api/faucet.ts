import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { clusterApiUrl, PublicKey } from '@solana/web3.js';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { connection, ENV_SECRET_KEYPAIR } from '../core';
import { cors, rateLimit } from '../middleware';
import { tokens } from '../utils/token';

export default async function (request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') return response.status(405).send('Method not allowed');

    if (connection.rpcEndpoint !== clusterApiUrl('devnet')) {
        return response.status(405).send('Method not allowed');
    }

    await cors(request, response);
    await rateLimit(request, response);

    const mint = request.body?.mint;
    if (!mint) return response.status(400).send({ error: 'mint missing' });

    const token = tokens[mint];
    if (!token) return response.status(400).send({ error: 'mint not supported' });

    const amount = BigInt(request.body?.amount);
    if (!amount) return response.status(400).send({ error: 'amount missing' });

    const receiver = request.body?.receiver;
    if (!receiver) return response.status(400).send({ error: 'receiver missing' });

    try {
        const receiverATA = await getOrCreateAssociatedTokenAccount(
            connection,
            ENV_SECRET_KEYPAIR,
            token.mint,
            new PublicKey(receiver),
            true,
            'confirmed'
        );

        const mintTx = await mintTo(
            connection,
            ENV_SECRET_KEYPAIR,
            token.mint,
            receiverATA.address,
            ENV_SECRET_KEYPAIR,
            amount
        );

        return response.send({ signature: mintTx });
    } catch (e) {
        if (e instanceof Error) {
            return response.status(400).send({ error: e.message });
        }
    }
}
