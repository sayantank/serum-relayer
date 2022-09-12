import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { findWhere } from "underscore";
import { refreshReserveInstruction } from "../instructions";
import { OBLIGATION_SIZE, parseObligation, parseReserve, RESERVE_SIZE } from "../state";

export interface Config {
    programID: string;
    assets: Asset[];
    oracles: Oracles;
    markets: Market[];
}
export interface Asset {
    name: string;
    symbol: string;
    decimals: number;
    mintAddress: string;
}
export interface Oracles {
    pythProgramID: string;
    assets: OracleAsset[];
}
export interface OracleAsset {
    asset: string;
    priceAddress: string;
}
export interface Market {
    name: string;
    address: string;
    reserves: Reserve[];
}
export interface Reserve {
    asset: string;
    address: string;
    collateralMintAddress: string;
    collateralSupplyAddress: string;
    liquidityAddress: string;
    liquidityFeeReceiverAddress: string;
    userSupplyCap?: number;
}

export const refreshReserves = async (instructions: TransactionInstruction[], reserves: PublicKey[], config: Config) => {
    for (const reserve in reserves) {
        const reserveConfig = findWhere(config.markets[0].reserves, { "address": reserves[reserve].toString() });
        const oracleConfig = findWhere(config.oracles.assets, { asset: reserveConfig.asset });
        instructions.push()
        instructions.push(refreshReserveInstruction(
            reserves[reserve],
            new PublicKey(config.programID),
            new PublicKey(oracleConfig.priceAddress),
        ))
    }
}

export async function getReserves(connection: Connection, config: Config, lendingMarket: any) {
    const resp = await connection.getProgramAccounts(new PublicKey(config.programID), {
        commitment: connection.commitment,
        filters: [
            {
                memcmp: {
                    offset: 10,
                    bytes: lendingMarket,
                },
            },
            { dataSize: RESERVE_SIZE, },
        ],
        encoding: 'base64',
    });

    return resp.map((account) => parseReserve(account.pubkey, account.account));
}

export async function getObligations(connection: Connection, config: Config, lendingMarket: any) {
    const resp = await connection.getProgramAccounts(new PublicKey(config.programID), {
        commitment: connection.commitment,
        filters: [
            {
                memcmp: {
                    offset: 10,
                    bytes: lendingMarket,
                },
            },
            { dataSize: OBLIGATION_SIZE, },
        ],
        encoding: 'base64',
    });

    return resp.map((account) => parseObligation(account.pubkey, account.account));
}

export function pushIfNotExists(array: any[], item: any) {
    if (array.indexOf(item) === -1) {
        array.push(item);
    }
}