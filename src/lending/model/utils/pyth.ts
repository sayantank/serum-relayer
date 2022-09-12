import { parsePriceData } from '@pythnetwork/client';
import { Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { findWhere } from 'underscore';
import { Asset, Config, OracleAsset, Reserve } from './helpers';

interface TokenOracelData {
  symbol: string;
  reserveAddress: string;
  mintAddress: string;
  decimals: BigNumber;
  price: BigNumber;
}

const NULL_ORACLE = 'nu11111111111111111111111111111111111111111';

async function getTokenOracleData(
  connection: Connection,
  config: Config,
  oracles: OracleAsset[],
  reserve: Reserve,
): Promise<TokenOracelData> {
  let price: any;
  const oracle = findWhere(oracles, { asset: reserve.asset })!;

  if (oracle.priceAddress && oracle.priceAddress !== NULL_ORACLE) {
    const pricePublicKey = new PublicKey(oracle.priceAddress);
    const result = await connection.getAccountInfo(pricePublicKey);
    price = parsePriceData(result!.data).price;
  }

  const assetConfig: Asset = findWhere(config.assets, { symbol: oracle.asset })!;
  return {
    symbol: oracle.asset,
    reserveAddress: reserve.address,
    mintAddress: assetConfig.mintAddress,
    decimals: new BigNumber(10 ** assetConfig.decimals),
    price: new BigNumber(price!),
  };
}

export async function getTokensOracleData(
  connection: Connection,
  config: Config,
  reserves: any
): Promise<TokenOracelData[]> {
  const promises: any = [];
  const oracles = config.oracles.assets;
  reserves.forEach((reserve: any) => { promises.push(getTokenOracleData(connection, config, oracles, reserve)); });
  const results = await Promise.all(promises);
  return results;
}