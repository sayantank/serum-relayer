import fs from 'fs';
import { Market, OrderType, Side } from '@bonfida/dex-v4';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SelfTradeBehavior } from '@bonfida/dex-v4/dist/state';
import {
    Account,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    // createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

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
} from './utils';

describe('validation', () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    let market: Market;
    let owner: Keypair;

    const alice = Keypair.generate();
    const bob = Keypair.generate();
    let aliceQuoteATA: Account;
    let aliceBaseATA: Account;

    before(async () => {
        const airdropSig = await connection.requestAirdrop(alice.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig, 'confirmed');

        const fileBuffer = fs.readFileSync('./keys/octane.json');
        const secretKey: number[] = JSON.parse(fileBuffer.toString());
        owner = Keypair.fromSecretKey(Uint8Array.from(secretKey));

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
        await mintTo(connection, alice, BASE_MINT, aliceBaseATA.address, owner, BigInt('100000000000000'));
        await mintTo(connection, alice, QUOTE_MINT, aliceQuoteATA.address, owner, BigInt('100000000000000'));

        console.log(`owner: ${owner.publicKey.toBase58()}`);
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
            BASE_MINT
        );

        const bobATA = await getAssociatedTokenAddress(BASE_MINT, bob.publicKey);
        const ataIx = await createAssociatedTokenAccountInstruction(owner.publicKey, bobATA, bob.publicKey, BASE_MINT);

        const bobTransferIx = await createTransferCheckedInstruction(
            aliceBaseATA.address,
            BASE_MINT,
            bobATA,
            alice.publicKey,
            1_000_000_000,
            BASE_DECIMALS
        );

        const accountIx = await getDexInitializeAccountIx(alice, market, owner);

        const newOrderIx = await market.makePlaceOrderTransaction(
            Side.Bid,
            10,
            100,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            aliceQuoteATA.address,
            alice.publicKey
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, owner, alice, [
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
            BASE_MINT
        );

        const drainIx = await createTransferCheckedInstruction(
            BASE_ACCOUNT,
            BASE_MINT,
            aliceBaseATA.address,
            owner.publicKey,
            10_000_000_000,
            BASE_DECIMALS
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, owner, alice, [
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
            BASE_MINT
        );

        const newOrderIx = await market.makePlaceOrderTransaction(
            Side.Bid,
            10,
            1000,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            QUOTE_ACCOUNT,
            owner.publicKey
        );

        const { serializedTransaction } = await getSerializedTransaction(connection, owner, alice, [
            transferIx,
            newOrderIx,
        ]);

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });

    it;
});
