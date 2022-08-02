import { VercelRequest, VercelResponse } from '@vercel/node';
import { connection } from '../core';
import { calculateCost } from '../core/calculateCost';
import { ORDER_LEN, USER_ACCOUNT_HEADER_LEN } from '../core/consts';
import { cors, rateLimit } from '../middleware';
import { tokens } from '../utils/token';
import config from '../../config.json';
import { RelayInstructionConfig, relayInstructionNames } from '../core/types';
import { ACCOUNT_SIZE } from '@solana/spl-token';

export default async function (request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') return response.status(405).send('Method not allowed');

    await cors(request, response);
    await rateLimit(request, response);

    console.log(request.body);

    const mint = request.body?.mint;
    if (!mint) return response.status(400).send({ error: 'mint missing' });

    const token = tokens[mint];
    if (!token) return response.status(400).send({ error: 'mint not supported' });

    const instructions: RelayInstructionConfig[] = request.body?.instructions;
    if (!instructions) return response.status(400).send({ error: 'instructions missing' });

    let costLamports = config.lamportsPerInstruction; // for transfer instruction

    for (const instruction of instructions) {
        if (!relayInstructionNames.includes(instruction.type))
            return response.status(400).send({ error: 'invalid instruction type' });

        if (instruction.type === 'initializeAccount') {
            const maxOrders = instruction.args.maxOrders;
            const space = USER_ACCOUNT_HEADER_LEN + maxOrders * ORDER_LEN;
            const rent = await connection.getMinimumBalanceForRentExemption(space, 'confirmed');
            costLamports += rent;
        }

        if (instruction.type === 'createATA') {
            const rent = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE, 'confirmed');
            costLamports += rent;
        }

        costLamports += config.lamportsPerInstruction;
    }

    const costInfo = await calculateCost(tokens[mint], costLamports);

    return response.status(200).send({ ...costInfo, expectedTokenAtomics: costInfo.expectedTokenAtomics.toString() });
}
