import { Market, OrderType, Side } from '@bonfida/dex-v4';
import { SelfTradeBehavior } from '@bonfida/dex-v4/dist/state';
import { AnchorProvider, Idl, Program, Wallet } from '@project-serum/anchor';
import {
    Account, ACCOUNT_SIZE, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createInitializeAccountInstruction, createTransferCheckedInstruction, createTransferInstruction,
    // createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount,
    mintTo,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import assert from 'assert';
import axios, { AxiosError } from 'axios';
import { BN } from 'bn.js';
import fs from 'fs';

import { DEX_ID } from '../src/dex/consts';
import { Router as IDL_ROUTER } from '../src/router/idl-router';
import {
    BTC_ACCOUNT,
    BTC_DECIMALS,
    BTC_MARKET_ADDRESS,
    BTC_MINT,
    ETH_MARKET_ADDRESS,
    ETH_MINT,
    getCostTransferIx,
    getDexInitializeAccountIx,
    getSerializedTransaction,
    sendRelayRequest, USDC_ACCOUNT,
    USDC_DEV_MINT,
    WRAPPED_SOL_MINT
} from './utils';

describe('validation', () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    let btcMarket: Market;
    let ethMarket: Market;

    let relayer: Keypair;

    const alice = Keypair.generate();
    const bob = Keypair.generate();

    let aliceBtcATA: Account;
    let aliceEthATA: Account;
    let aliceUsdcATA: Account;

    before(async () => {
        const airdropSig = await connection.requestAirdrop(alice.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSig, 'confirmed');

        const fileBuffer = fs.readFileSync('./keys/relayer.json');
        const secretKey: number[] = JSON.parse(fileBuffer.toString());
        relayer = Keypair.fromSecretKey(Uint8Array.from(secretKey));

        btcMarket = await Market.load(connection, BTC_MARKET_ADDRESS, DEX_ID);
        ethMarket = await Market.load(connection, ETH_MARKET_ADDRESS, DEX_ID);
        // solMarket = await Market.load(connection, SOL_MARKET_ADDRESS, DEX_ID);

        aliceBtcATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            BTC_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );
        aliceEthATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            ETH_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );
        aliceUsdcATA = await getOrCreateAssociatedTokenAccount(
            connection,
            alice,
            USDC_DEV_MINT,
            alice.publicKey,
            false,
            'confirmed'
        );

        await mintTo(connection, alice, BTC_MINT, aliceBtcATA.address, relayer, BigInt('100000000000000')); // 100k
        await mintTo(connection, alice, ETH_MINT, aliceEthATA.address, relayer, BigInt('100000000000000')); // 100k
        await mintTo(connection, alice, USDC_DEV_MINT, aliceUsdcATA.address, relayer, BigInt('100000000000000')); // 100k

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
            BTC_MINT
        );

        const bobATA = await getAssociatedTokenAddress(BTC_MINT, bob.publicKey);
        const ataIx = await createAssociatedTokenAccountInstruction(
            relayer.publicKey,
            bobATA,
            bob.publicKey,
            BTC_MINT
        );

        const bobTransferIx = await createTransferInstruction(
            aliceBtcATA.address,
            bobATA,
            alice.publicKey,
            1_000_000_000
        );

        const accountIx = await getDexInitializeAccountIx(alice, btcMarket, relayer);

        const newOrderIx = await btcMarket.makePlaceOrderTransaction(
            Side.Bid,
            10,
            100,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            aliceUsdcATA.address,
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
            BTC_MINT
        );

        const drainIx = await createTransferCheckedInstruction(
            BTC_ACCOUNT,
            BTC_MINT,
            aliceBtcATA.address,
            relayer.publicKey,
            10_000_000_000,
            BTC_DECIMALS
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
            BTC_MINT
        );

        const newOrderIx = await btcMarket.makePlaceOrderTransaction(
            Side.Bid,
            10,
            1000,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            USDC_ACCOUNT,
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
            BTC_MINT
        );

        const ownerATA = await getAssociatedTokenAddress(BTC_MINT, relayer.publicKey);
        const ataIx = await createAssociatedTokenAccountInstruction(
            relayer.publicKey,
            ownerATA,
            relayer.publicKey,
            BTC_MINT
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

    it('cant drain the relayer because ix not whitelisted', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'transfer',
                },
            ],
            alice,
            BTC_MINT
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

    it('can create account of token account size', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'createTokenAccount',
                },
            ],
            alice,
            BTC_MINT
        )

        const tokenAccount = Keypair.generate();
        const createAccountIx = SystemProgram.createAccount({
            fromPubkey: relayer.publicKey,
            newAccountPubkey: tokenAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
            space: ACCOUNT_SIZE,
            programId: TOKEN_PROGRAM_ID
        });

        const { serializedTransaction } = await getSerializedTransaction(
            connection,
            relayer,
            alice,
            [transferIx, createAccountIx],
            { signer: tokenAccount }
        );

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data));
    });

    it('cant create account of non token account size', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'createTokenAccount',
                },
            ],
            alice,
            BTC_MINT
        )

        const FAULTY_SIZE = ACCOUNT_SIZE + 1;
        const tokenAccount = Keypair.generate();
        const createAccountIx = SystemProgram.createAccount({
            fromPubkey: relayer.publicKey,
            newAccountPubkey: tokenAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(FAULTY_SIZE),
            space: FAULTY_SIZE,
            programId: TOKEN_PROGRAM_ID
        });

        const { serializedTransaction } = await getSerializedTransaction(
            connection,
            relayer,
            alice,
            [transferIx, createAccountIx],
            { signer: tokenAccount }
        );

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data), true);
    });

    it('can create a wrapped SOL token account and close it', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'createTokenAccount',
                },
                {
                    type: 'initTokenAccount',
                },
                {
                    type: 'closeTokenAccount',
                }
            ],
            alice,
            BTC_MINT
        )

        const tokenAccount = Keypair.generate();
        const createAccountIx = SystemProgram.createAccount({
            fromPubkey: relayer.publicKey,
            newAccountPubkey: tokenAccount.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE),
            space: ACCOUNT_SIZE,
            programId: TOKEN_PROGRAM_ID
        });

        const initAccountIx = createInitializeAccountInstruction(
            tokenAccount.publicKey,
            new PublicKey(WRAPPED_SOL_MINT),
            alice.publicKey
        );

        const closeAccountIx = createCloseAccountInstruction(
            tokenAccount.publicKey,
            alice.publicKey,
            alice.publicKey
        );

        const { serializedTransaction } = await getSerializedTransaction(
            connection,
            relayer,
            alice,
            [transferIx, createAccountIx, initAccountIx, closeAccountIx],
            { signer: tokenAccount }
        );

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data));
    });

    it('can swap from eth to btc via usdc', async () => {
        const transferIx = await getCostTransferIx(
            [
                {
                    type: 'swapExactTokensForTokens',
                }
            ],
            alice,
            BTC_MINT
        )

        const routerAddress = new PublicKey(IDL_ROUTER.metadata.address);

        const wallet = new Wallet(alice);
        const provider = new AnchorProvider(connection, wallet, { commitment: 'processed' });
        const program = new Program(IDL_ROUTER as Idl, routerAddress, provider);

        const [ethMarketSigner] = await PublicKey.findProgramAddress([ethMarket.address.toBuffer()], ethMarket.programId);
        const [btcMarketSigner] = await PublicKey.findProgramAddress([btcMarket.address.toBuffer()], btcMarket.programId);

        const swapIdlIx = program.methods.swapExactTokensForTokens(
            new BN(1e9),
            new BN(1e4),
            new BN(2 ** 32),
            0)
            .accounts({
                from: {
                    market: ethMarket.address,
                    orderbook: ethMarket.orderbookAddress,
                    eventQueue: ethMarket.eventQueueAddress,
                    bids: ethMarket.bidsAddress,
                    asks: ethMarket.asksAddress,
                    baseVault: ethMarket.baseVault,
                    quoteVault: ethMarket.quoteVault,
                    marketSigner: ethMarketSigner
                },
                to: {
                    market: btcMarket.address,
                    orderbook: btcMarket.orderbookAddress,
                    eventQueue: btcMarket.eventQueueAddress,
                    bids: btcMarket.bidsAddress,
                    asks: btcMarket.asksAddress,
                    baseVault: btcMarket.baseVault,
                    quoteVault: btcMarket.quoteVault,
                    marketSigner: btcMarketSigner
                },
                inputTokenAccount: aliceEthATA.address,
                intermediateTokenAccount: aliceUsdcATA.address,
                outputTokenAccount: aliceBtcATA.address,
                userOwner: alice.publicKey,
                splTokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                dexProgram: new PublicKey(DEX_ID)
            });

        const swapIx = await swapIdlIx.instruction();

        const { serializedTransaction } = await getSerializedTransaction(
            connection,
            relayer,
            alice,
            [transferIx, swapIx]
        );

        await sendRelayRequest(serializedTransaction, ({ data }) => console.log(data));
    });
});
