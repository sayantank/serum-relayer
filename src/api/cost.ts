import { VercelRequest, VercelResponse } from '@vercel/node';
import { connection } from '../core';
import { calculateCost } from '../core/calculateCost';
import { ORDER_LEN, USER_ACCOUNT_HEADER_LEN } from '../core/consts';
import { cors, rateLimit } from '../middleware';
import { tokens } from '../utils/token';
import config from '../../config.json';

const instructionNames = ['createMarket', 'newOrder', 'initializeAccount'] as const;
type InstructionType = typeof instructionNames[number];

type InstructionConfig = {
    type: InstructionType;
    args: any;
};

export default async function (request: VercelRequest, response: VercelResponse) {
    await cors(request, response);
    await rateLimit(request, response);

    // const serialized = request.body?.transaction;
    // if (typeof serialized !== 'string') throw new Error('invalid transaction');
    // let transaction = Transaction.from(Buffer.from(serialized, 'base64'));

    // transaction = await validateTransaction(transaction);

    const mint = request.body?.mint;
    if (!mint) return response.status(400).send({ error: 'mint missing' });

    const token = tokens[mint];
    if (!token) return response.status(400).send({ error: 'mint not supported' });

    const instructions: InstructionConfig[] = request.body?.instructions;
    if (!instructions) return response.status(400).send({ error: 'instructions missing' });

    let costLamports = config.lamportsPerInstruction; // for transfer instruction

    for (const instruction of instructions) {
        if (!instructionNames.includes(instruction.type))
            return response.status(400).send({ error: 'invalid instruction type' });

        if (instruction.type === 'initializeAccount') {
            const maxOrders = instruction.args.maxOrders;
            const space = USER_ACCOUNT_HEADER_LEN + maxOrders * ORDER_LEN;
            const rent = await connection.getMinimumBalanceForRentExemption(space, 'confirmed');
            costLamports += rent;
        }

        costLamports += config.lamportsPerInstruction;
    }

    const costInfo = await calculateCost(tokens[mint], costLamports);

    return response.status(200).send({ ...costInfo, expectedTokenAtomics: costInfo.expectedTokenAtomics.toString() });
}
