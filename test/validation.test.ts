import fs from 'fs';
import { Market } from '@bonfida/dex-v4';
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { assert } from 'chai';
import BN from 'bn.js';

const MARKET_ADDRESS = new PublicKey('29jz1E8YgfaCS3zmrPttauS4CJS8rZLLL7gdTWFSjWUS');
const BASE_MINT = new PublicKey('3JawYu5tJvG1FiVxtFt27P7Mz4QqoYmzFBvQuJHPnTKs');
const QUOTE_MINT = new PublicKey('EsJBwWW18Am9uG4G38yE6jtAQqd78Ym5QF8tgHVtCuJj');

describe('validation', () => {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    let market: Market;
    let owner: Keypair;

    before(async () => {
        const fileBuffer = fs.readFileSync('./keys/octane.json');
        const secretKey: number[] = JSON.parse(fileBuffer.toString());
        owner = Keypair.fromSecretKey(Uint8Array.from(secretKey));

        market = await Market.load(connection, MARKET_ADDRESS);
    });

    it('decode', async () => {
        console.log(owner.publicKey.toBase58());
        console.log(market);
    });
});
