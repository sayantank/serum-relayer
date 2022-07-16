import fs from 'fs';
import { DEX_ID, Market, OrderType, Side } from '@bonfida/dex-v4';
import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import axios, { AxiosError } from 'axios';
import { SelfTradeBehavior } from '@bonfida/dex-v4/dist/state';
import { initializeAccountInstruction } from '../src/dex/dex-v4/js/src/raw_instructions';
import {
    Account,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    createTransferInstruction,
    // createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import assert from 'assert';
import BN from 'bn.js';

const MARKET_ADDRESS = new PublicKey('29jz1E8YgfaCS3zmrPttauS4CJS8rZLLL7gdTWFSjWUS');

const BASE_MINT = new PublicKey('3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs');
const QUOTE_MINT = new PublicKey('EsJBwWW18Am9uG4G38yE6jtAQqd78Ym5QF8tgHVtCuJj');

// Owner accounts
const BASE_ACCOUNT = new PublicKey('45uE47VJMvoxcbUZkmdn7xDMomqzkZySxGMBniJDv942');
const QUOTE_ACCOUNT = new PublicKey('EsgW2983rM3DF82dohCwKPT7CVFJadvnaWxP8mFF7DvQ');

const BASE_DECIMALS = 9;

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
    });

    it('dex-v4', async () => {
        console.log(`owner: ${owner.publicKey.toBase58()}`);
        console.log(`alice: ${alice.publicKey.toBase58()}`);
        console.log(`bob: ${bob.publicKey.toBase58()}`);

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
                aliceBaseATA.address,
                BASE_ACCOUNT,
                alice.publicKey,
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

        const [aliceAccount] = await PublicKey.findProgramAddress(
            [market.address.toBuffer(), alice.publicKey.toBuffer()],
            DEX_ID
        );

        const accountIx = new initializeAccountInstruction({
            market: market.address.toBuffer(),
            maxOrders: new BN(10),
        }).getInstruction(DEX_ID, SystemProgram.programId, aliceAccount, alice.publicKey, owner.publicKey);

        const newOrderIx = await market.makePlaceOrderTransaction(
            Side.Bid,
            10,
            100,
            OrderType.Limit,
            SelfTradeBehavior.DecrementTake,
            aliceQuoteATA.address,
            alice.publicKey
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const tx = new Transaction({
            feePayer: owner.publicKey,
            blockhash,
            lastValidBlockHeight,
        });
        tx.add(transferIx, ataIx, bobTransferIx, accountIx, newOrderIx);
        tx.partialSign(alice);

        const serialized = tx.serialize({
            requireAllSignatures: false,
        });

        try {
            const { data } = await axios.post('http://localhost:3000/api/relay', {
                transaction: serialized.toString('base64'),
            });
            console.log(data);
        } catch (e) {
            if (e instanceof AxiosError) {
                console.error(e.response?.data);
            } else {
                console.error(e);
            }
            assert(false, 'Transaction failed.');
        }
    });
});
