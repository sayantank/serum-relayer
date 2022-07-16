import {
    DecodedTransferCheckedInstruction,
    DecodedTransferInstruction,
    decodeInstruction,
    getAccount,
    isTransferCheckedInstruction,
    isTransferInstruction,
} from '@solana/spl-token';
import { SignaturePubkeyPair, TransactionInstruction } from '@solana/web3.js';
import { connection } from './connection';
import { CostInfo } from './types';
import { calculateCost } from './calculateCost';
import { tokens } from '../utils/token';

// Check that a transaction contains a valid transfer to Octane's token account
export async function validateTransfer(
    first: TransactionInstruction,
    signatures: SignaturePubkeyPair[],
    relayerCheck?: {
        expectedAmountInLamports: number;
    }
): Promise<{ instruction: DecodedTransferInstruction | DecodedTransferCheckedInstruction; costInfo?: CostInfo }> {
    // Decode the first instruction and make sure it's a valid SPL Token `Transfer` or `TransferChecked` instruction
    const instruction = decodeInstruction(first);
    if (!(isTransferInstruction(instruction) || isTransferCheckedInstruction(instruction)))
        throw new Error('invalid instruction');

    const {
        keys: { source, destination, owner },
        data: { amount },
    } = instruction;

    // Check that the source account exists, has the correct owner, is not frozen, and has enough funds
    const account = await getAccount(connection, source.pubkey, 'confirmed');
    if (!account.owner.equals(owner.pubkey)) throw new Error('source invalid owner');
    if (account.isFrozen) throw new Error('source frozen');
    if (account.amount < amount) throw new Error('source insufficient balance');

    let costInfo: CostInfo | undefined;
    if (relayerCheck) {
        const token = tokens[account.mint.toBase58()];
        if (!token) throw new Error('invalid token');

        costInfo = await calculateCost(token, relayerCheck.expectedAmountInLamports);

        if (amount < BigInt(costInfo.expectedTokenAtomics.toString())) {
            throw new Error('insufficient amount');
        }

        if (!destination.pubkey.equals(token.account)) throw new Error('invalid destination');

        // If the instruction is a `TransferChecked` instruction, check that the mint and decimals are valid
        if (isTransferCheckedInstruction(instruction)) {
            const {
                keys: { mint },
                data: { decimals },
            } = instruction;

            if (decimals !== token.decimals) throw new Error('invalid decimals');

            if (!mint.pubkey.equals(token.mint)) throw new Error('invalid mint');
            if (mint.isWritable) throw new Error('mint is writable');
            if (mint.isSigner) throw new Error('mint is signer');
        }
    }

    // TODO: Not sure if needed
    // Check that the instruction is going to pay the fee
    // if (amount < token.fee) throw new Error('invalid amount');

    // Check that the instruction has a valid source account
    if (!source.isWritable) throw new Error('source not writable');
    if (source.isSigner) throw new Error('source is signer');

    if (!destination.isWritable) throw new Error('destination not writable');
    if (destination.isSigner) throw new Error('destination is signer');

    // This check also prevents users from transferring FROM the relayer account
    // It also assumes that there HAS TO be anothe signature apart from the relayer, which is true since the first transfer ix requires the same.
    // Check that the owner of the source account is valid and has signed
    if (!owner.pubkey.equals(signatures[1].publicKey)) throw new Error('owner missing signature');

    // NOTE: owner can be writable if transaction has dex instructions which require it to be writable
    // if (owner.isWritable) throw new Error('owner is writable');

    if (!owner.isSigner) throw new Error('owner not signer');

    return { instruction, costInfo };
}
