/* eslint-disable @typescript-eslint/no-explicit-any */
import { Market } from '@bonfida/dex-v4';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import assert from 'assert';
import axios, { AxiosError, AxiosResponse } from 'axios';
import BN from 'bn.js';

import { RelayInstructionConfig } from '../src/core/types';
import { DEX_ID } from '../src/dex/consts';
import { initializeAccountInstruction } from '../src/dex/dex-v4/js/src/raw_instructions';
import { tokens } from '../src/utils/token';

export const BTC_MARKET_ADDRESS = new PublicKey('2XJ3mbLxyVUwkBx5VvuwH2La8xVXGGbpsqeeQk9tWtQB');
export const ETH_MARKET_ADDRESS = new PublicKey('Dcd1f6YNXUPamhVGfGMZ4xJBZY1kMX1MKXFRTw5375LZ');
export const SOL_MARKET_ADDRESS = new PublicKey('89LWydsqk75RBwkMmWtLJdCVpzQVxHJmjVDidHvgCftn');

export const USDC_DEV_MINT = new PublicKey('43zS2spaz1Doi1KDevSFKxf1KWhNDfjwbnXL5j7GDNJ8');

export const BTC_MINT = new PublicKey('ESspyQX2uXccWxJ4sQm5gN6AuQ7SwBCTLsHfRxHX5w85');
export const ETH_MINT = new PublicKey('HypB1tUiVYLDutrreeQYAZxW7bYkgrdVq6gwgsKaeyPC');

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Owner accounts
export const BTC_ACCOUNT = new PublicKey('6DtFhVdX9oMzLU6pr5S1BMkHEa7UTfFGG9GQDN8xX1CM');
export const ETH_ACCOUNT = new PublicKey('HQKnR39K3DZjKbuD2tNx6j5LUduBsnh4KvTRUimWm3xS');
export const USDC_ACCOUNT = new PublicKey('ETtDjTrW6D8JFbWmvwUknFF24ouNXVDjNrVyHwCamHQE');

export const BTC_DECIMALS = 9;
export const ETH_DECIMALS = 9;

export const getCostTransferIx = async (instructions: RelayInstructionConfig[], payer: Keypair, mint: PublicKey) => {
    const paymentConfig = tokens[mint.toString()];
    if (!paymentConfig) throw new Error('payment mint not supported');

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
    instructions: TransactionInstruction[],
    extra?: {
        signer: Keypair,
    }
) => {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction({
        feePayer: relayer.publicKey,
        blockhash,
        lastValidBlockHeight,
    });
    tx.add(...instructions);
    !extra
        ? tx.partialSign(sender)
        : tx.partialSign(sender, extra.signer);

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
