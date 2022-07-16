/* eslint-disable @typescript-eslint/no-explicit-any */
import { DEX_ID, Market } from '@bonfida/dex-v4';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import assert from 'assert';
import axios, { AxiosError, AxiosResponse } from 'axios';
import BN from 'bn.js';

import { RelayInstructionConfig } from '../src/core/types';
import { initializeAccountInstruction } from '../src/dex/dex-v4/js/src/raw_instructions';

export const MARKET_ADDRESS = new PublicKey('29jz1E8YgfaCS3zmrPttauS4CJS8rZLLL7gdTWFSjWUS');

export const BASE_MINT = new PublicKey('3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs');
export const QUOTE_MINT = new PublicKey('EsJBwWW18Am9uG4G38yE6jtAQqd78Ym5QF8tgHVtCuJj');

// Owner accounts
export const BASE_ACCOUNT = new PublicKey('45uE47VJMvoxcbUZkmdn7xDMomqzkZySxGMBniJDv942');
export const QUOTE_ACCOUNT = new PublicKey('EsgW2983rM3DF82dohCwKPT7CVFJadvnaWxP8mFF7DvQ');

export const BASE_DECIMALS = 9;

export const getCostTransferIx = async (instructions: RelayInstructionConfig[], payer: Keypair, mint: PublicKey) => {
    const payerATA = await getAssociatedTokenAddress(mint, payer.publicKey);
    let transferIx: TransactionInstruction;
    try {
        const { data: costInfo } = await axios.post('http://localhost:3000/api/cost', {
            mint: '3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs',
            instructions: [
                {
                    type: 'initializeAccount',
                    args: {
                        maxOrders: 10,
                    },
                },
                {
                    type: 'createATA',
                },
                {
                    type: 'transfer',
                },
                {
                    type: 'newOrder',
                },
            ],
        });
        transferIx = createTransferInstruction(
            payerATA,
            BASE_ACCOUNT,
            payer.publicKey,
            Number(costInfo.expectedTokenAtomics)
        );
    } catch (e) {
        if (e instanceof AxiosError) {
            console.error(e.response?.data);
        } else {
            console.error(e);
        }
        assert(false, 'Failed to get cost.');
    }

    return transferIx;
};

export const getDexInitializeAccountIx = async (owner: Keypair, market: Market, relayer: Keypair) => {
    const [payerAccount] = await PublicKey.findProgramAddress(
        [market.address.toBuffer(), owner.publicKey.toBuffer()],
        DEX_ID
    );

    const accountIx = new initializeAccountInstruction({
        market: market.address.toBuffer(),
        maxOrders: new BN(10),
    }).getInstruction(DEX_ID, SystemProgram.programId, payerAccount, owner.publicKey, relayer.publicKey);

    return accountIx;
};

export const getSerializedTransaction = async (
    connection: Connection,
    relayer: Keypair,
    sender: Keypair,
    instructions: TransactionInstruction[]
) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({
        feePayer: relayer.publicKey,
        blockhash,
        lastValidBlockHeight,
    });
    tx.add(...instructions);
    tx.partialSign(sender);

    const serialized = tx.serialize({
        requireAllSignatures: false,
    });

    return { transaction: tx, serializedTransaction: serialized };
};

export const sendRelayRequest = async (
    serializedTransaction: Buffer,
    callback: (response: AxiosResponse<any, any>) => void,
    shouldFail = false
) => {
    try {
        const response = await axios.post('http://localhost:3000/api/relay', {
            transaction: serializedTransaction.toString('base64'),
        });
        callback(response);
        assert(true);
    } catch (e) {
        if (e instanceof AxiosError) {
            console.error(e.response?.data);
        } else {
            console.error(e);
        }
        assert(shouldFail);
    }
};
