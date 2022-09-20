import { Market, OrderType, Side } from '@bonfida/dex-v4';
import { SelfTradeBehavior } from '@bonfida/dex-v4/dist/state';
import {
    Account, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, createTransferInstruction,
    // createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount,
    mintTo
} from '@solana/spl-token';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import fs from 'fs';

import assert from 'assert';
import axios, { AxiosError } from 'axios';
import {
    BASE_ACCOUNT,
    BASE_DECIMALS,
    BASE_MINT,
    getCostTransferIx,
    getDexInitializeAccountIx,
    getSerializedTransaction,
    MARKET_ADDRESS,
    QUOTE_ACCOUNT,
    QUOTE_MINT,
    sendRelayRequest,
    USDC_DEV_MINT
} from './utils';

describe('validation', () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    let market: Market;
    let relayer: Keypair;

    const alice = Keypair.generate();
    const bob = Keypair.generate();

    let aliceQuoteATA: Account;
    let aliceBaseATA: Account;
    let alicePayATA: Account;

    before(async () => {
        const airdropSig = await connection.requestAirdrop(alice.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig, 'confirmed');

        const fileBuffer = fs.readFileSync('./keys/relayer.json');
        const secretKey: number[] = JSON.parse(fileBuffer.toString());
        relayer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

        market = await Market.load(connection, MARKET_ADDRESS);

        aliceBaseATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            BASE_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );
        aliceQuoteATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            QUOTE_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );
        alicePayATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            USDC_DEV_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );

        await mintTo(connection, alice, BASE_MINT, aliceBaseATA.address, relayer, BigInt('100000000000000')); // 100k
        await mintTo(connection, alice, QUOTE_MINT, aliceQuoteATA.address, relayer, BigInt('100000000000000')); // 100k
        await mintTo(connection, alice, USDC_DEV_MINT, alicePayATA.address, relayer, BigInt('5000000000')); // 5

        console.log(`relayer: ${relayer.publicKey.toBase58()}`);
        console.log(`alice: ${alice.publicKey.toBase58()}`);
        console.log(`bob: ${bob.publicKey.toBase58()}`);
    });

    it('happy path', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'createATA',
                },
                {
                    type: 'transfer',
                },
                {
                    type: 'initializeAccount',
                    args: {
                        maxOrders: 10,
                    },
                },
                {
                    type: 'newOrder',
                },
            ],
            alice,
            USDC_DEV_MINT
        );

        const bobATA = await getAssociatedTokenAddress(BASE_MINT, bob.publicKey);
        const ataIx = await createAssociatedTokenAccountInstruction(
            relayer.publicKey,
            bobATA,
            bob.publicKey,
            BASE_MINT
        );

        const bobTransferIx = await createTransferInstruction(
            aliceBaseATA.address,
            bobATA,
            alice.publicKey,
            1_000_000_000
        );

        const accountIx = await getDexInitializeAccountIx(alice, market, relayer);

        const newOrderIx = await market.makePlaceOrderTransaction(
            Side.Bid,
            10,
            100,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            aliceQuoteATA.address,
            alice.publicKey
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, relayer, alice, [
            transferIx,
            ataIx,
            bobTransferIx,
            accountIx,
            newOrderIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data));
    });

    it('cant drain relayer', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'transfer',
                },
            ],
            alice,
            USDC_DEV_MINT
        );

        const drainIx = await createTransferCheckedInstruction(
            BASE_ACCOUNT,
            BASE_MINT,
            aliceBaseATA.address,
            relayer.publicKey,
            10_000_000_000,
            BASE_DECIMALS
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, relayer, alice, [
            transferIx,
            drainIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });

    it('cant place order as relayer', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'newOrder',
                },
            ],
            alice,
            USDC_DEV_MINT
        );

        const newOrderIx = await market.makePlaceOrderTransaction(
            Side.Bid,
            10,
            1000,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            QUOTE_ACCOUNT,
            relayer.publicKey
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, relayer, alice, [
            transferIx,
            newOrderIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });

    it('cant create ata for relayer', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'createATA',
                },
            ],
            alice,
            USDC_DEV_MINT
        );

        const ownerATA = await getAssociatedTokenAddress(BASE_MINT, relayer.publicKey);
        const ataIx = await createAssociatedTokenAccountInstruction(
            relayer.publicKey,
            ownerATA,
            relayer.publicKey,
            BASE_MINT
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, relayer, alice, [
            transferIx,
            ataIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });

    it('can mint from faucet', async () => {
        const gary = Keypair.generate();

        try {
            const { data } = await axios.post('http://localhost:3000/api/faucet', {
                mint: USDC_DEV_MINT.toString(),
                receiver: gary.publicKey.toString(),
                amount: 1_000_000_000,
            });
            console.log('faucet sig: ', data);
            assert(true);
        } catch (e) {
            if (e instanceof AxiosError) {
                console.error(e.response?.data);
            } else {
                console.error(e);
            }
            assert(false, 'Failed to get tokens.');
        }
    });

    it('cant drain the relayer because of unknown program id', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'transfer',
                },
            ],
            alice,
            USDC_DEV_MINT
        );

        const drainIx = SystemProgram.transfer({
            fromPubkey: relayer.publicKey,
            toPubkey: alice.publicKey,
            lamports: 2_000_000_000,
        })

        const { serializedTransaction } = await getSerializedTransaction(connection, relayer, alice, [
            transferIx,
            drainIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });
});
