import fs from 'fs';
import { initializeAccount, Market, OrderType, Side } from '@bonfida/dex-v4';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import axios, { AxiosError } from 'axios';
import { SelfTradeBehavior } from '@bonfida/dex-v4/dist/state';
import { Account, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import assert from 'assert';

const MARKET_ADDRESS = new PublicKey('29jz1E8YgfaCS3zmrPttauS4CJS8rZLLL7gdTWFSjWUS');

const BASE_MINT = new PublicKey('3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs');
const QUOTE_MINT = new PublicKey('EsJBwWW18Am9uG4G38yE6jtAQqd78Ym5QF8tgHVtCuJj');

// Owner accounts
const BASE_ACCOUNT = new PublicKey('45uE47VJMvoxcbUZkmdn7xDMomqzkZySxGMBniJDv942');
const QUOTE_ACCOUNT = new PublicKey('EsgW2983rM3DF82dohCwKPT7CVFJadvnaWxP8mFF7DvQ');

describe('validation', () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    let market: Market;
    let owner: Keypair;

    const alice = Keypair.generate();
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
        await mintTo(
            connection,
            owner,
            QUOTE_MINT,
            aliceQuoteATA.address,
            owner,
            BigInt('100000000000000'),
            undefined,
            {
                commitment: 'confirmed',
            }
        );

        const userIx = await initializeAccount(market.address, alice.publicKey);
        const tx = new Transaction().add(userIx);

        const sig = await connection.sendTransaction(tx, [alice]);
        await connection.confirmTransaction(sig, 'confirmed');
    });

    it('decode', async () => {
        console.log(`owner: ${owner.publicKey.toBase58()}`);
        console.log(`alice: ${alice.publicKey.toBase58()}`);

        const ix = await market.makePlaceOrderTransaction(
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
        tx.add(ix);
        tx.sign(alice);

        const serialized = tx.serialize({
            requireAllSignatures: false,
        });

        try {
            const { data } = await axios.post('http://localhost:3000/api/dex', {
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
