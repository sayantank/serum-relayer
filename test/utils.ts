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

const paymentMintSymbols = ['USDC', 'BTC', 'ETH'] as const;

type PaymentSymbols = typeof paymentMintSymbols[number];
interface PaymentMintConfig {
    mint: PublicKey;
    account: PublicKey;
}

export const PAYMENT_MINTS: Record<PaymentSymbols, PaymentMintConfig> = {
    USDC: {
        mint: new PublicKey('43zS2spaz1Doi1KDevSFKxf1KWhNDfjwbnXL5j7GDNJ8'),
        account: new PublicKey('ETtDjTrW6D8JFbWmvwUknFF24ouNXVDjNrVyHwCamHQE'),
    },
    ETH: {
        mint: new PublicKey('HypB1tUiVYLDutrreeQYAZxW7bYkgrdVq6gwgsKaeyPC'),
        account: new PublicKey('HQKnR39K3DZjKbuD2tNx6j5LUduBsnh4KvTRUimWm3xS'),
    },
    BTC: {
        mint: new PublicKey('ESspyQX2uXccWxJ4sQm5gN6AuQ7SwBCTLsHfRxHX5w85'),
        account: new PublicKey('6DtFhVdX9oMzLU6pr5S1BMkHEa7UTfFGG9GQDN8xX1CM'),
    },
};

export const BASE_MINT = new PublicKey('3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs');
export const QUOTE_MINT = new PublicKey('EsJBwWW18Am9uG4G38yE6jtAQqd78Ym5QF8tgHVtCuJj');

// Owner accounts
export const BASE_ACCOUNT = new PublicKey('45uE47VJMvoxcbUZkmdn7xDMomqzkZySxGMBniJDv942');
export const QUOTE_ACCOUNT = new PublicKey('EsgW2983rM3DF82dohCwKPT7CVFJadvnaWxP8mFF7DvQ');

export const BASE_DECIMALS = 9;

export const getCostTransferIx = async (
    instructions: RelayInstructionConfig[],
    payer: Keypair,
    paymentSymbol: PaymentSymbols
) => {
    const paymentConfig = PAYMENT_MINTS[paymentSymbol];

    const payerATA = await getAssociatedTokenAddress(paymentConfig.mint, payer.publicKey);
    let transferIx: TransactionInstruction;
    try {
        const { data: costInfo } = await axios.post('http://localhost:3000/api/cost', {
            mint: paymentConfig.mint.toString(),
            instructions: instructions,
        });
        transferIx = createTransferInstruction(
            payerATA,
            paymentConfig.account,
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
