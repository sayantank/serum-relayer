import { struct, u8 } from "@solana/buffer-layout";
import { u64 } from '@solana/buffer-layout-utils';
import { AccountMeta, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ROUTER_ID } from "../consts";

export interface SwapExactTokensToTokensInstructionData {
  instruciton: number;
  amountIn: number | bigint;
  amountOutMin: number | bigint;
  matchLimit: number | bigint;
  hasDiscountTokenAccount: number;
}

export const swapExactTokensToTokensInstructionData = struct<SwapExactTokensToTokensInstructionData>(
  [
    u64("instruction"),
    u64("amountIn"),
    u64("amountOutMin"),
    u64("matchLimit"),
    u8("hasDiscountTokenAccount"),
  ]
);

export interface SwapExactTokensToTokensInstruction {
  programId: PublicKey;
  keys: {
    fromMarket: AccountMeta,
    fromOrderbook: AccountMeta,
    fromEventQueue: AccountMeta,
    fromBids: AccountMeta,
    fromAsks: AccountMeta,
    fromBaseVault: AccountMeta,
    fromQuoteVault: AccountMeta,
    fromMarketSigner: AccountMeta,

    toMarket: AccountMeta,
    toOrderbook: AccountMeta,
    toEventQueue: AccountMeta,
    toBids: AccountMeta,
    toAsks: AccountMeta,
    toBaseVault: AccountMeta,
    toQuoteVault: AccountMeta,
    toMarketSigner: AccountMeta,

    inputTokenAccount: AccountMeta;
    intermediateTokenAccount: AccountMeta;
    outputTokenAccount: AccountMeta;
    userOwner: AccountMeta;
    splTokenProgram: AccountMeta;
    systemProgram: AccountMeta;
    dexProgram: AccountMeta;
  },
  data: SwapExactTokensToTokensInstructionData;
}

export function decodeSwapExactTokensToTokensInstruction(
  instruction: TransactionInstruction,
  programId = ROUTER_ID
): SwapExactTokensToTokensInstruction {
  if (!instruction.programId.equals(programId)) throw new Error('invalid program id');
  if (instruction.data.length !== swapExactTokensToTokensInstructionData.span) throw new Error('worong instruction data length');

  const {
    keys: {
      fromMarket, fromOrderbook, fromEventQueue, fromBids, fromAsks, fromBaseVault, fromQuoteVault, fromMarketSigner,
      toMarket, toOrderbook, toEventQueue, toBids, toAsks, toBaseVault, toQuoteVault, toMarketSigner,
      inputTokenAccount, intermediateTokenAccount, outputTokenAccount, userOwner, splTokenProgram, systemProgram, dexProgram
    },
    data
  } = decodeSwapExactTokensToTokensInstructionUnchecked(instruction);

  if (!fromMarket || !fromOrderbook || !fromEventQueue || !fromBids || !fromAsks || !fromBaseVault || !fromQuoteVault || !fromMarketSigner ||
    !toMarket || !toOrderbook || !toEventQueue || !toBids || !toAsks || !toBaseVault || !toQuoteVault || !toMarketSigner ||
    !inputTokenAccount || !intermediateTokenAccount || !outputTokenAccount || !userOwner || !splTokenProgram || !systemProgram || !dexProgram)
    throw new Error('invalid instruction keys');

  return {
    programId,
    keys: {
      fromMarket, fromOrderbook, fromEventQueue, fromBids, fromAsks, fromBaseVault, fromQuoteVault, fromMarketSigner,
      toMarket, toOrderbook, toEventQueue, toBids, toAsks, toBaseVault, toQuoteVault, toMarketSigner,
      inputTokenAccount, intermediateTokenAccount, outputTokenAccount, userOwner, splTokenProgram, systemProgram, dexProgram
    },
    data
  };
}

export function decodeSwapExactTokensToTokensInstructionUnchecked({
  programId,
  keys: [
    fromMarket, fromOrderbook, fromEventQueue, fromBids, fromAsks, fromBaseVault, fromQuoteVault, fromMarketSigner,
    toMarket, toOrderbook, toEventQueue, toBids, toAsks, toBaseVault, toQuoteVault, toMarketSigner,
    inputTokenAccount, intermediateTokenAccount, outputTokenAccount, userOwner, splTokenProgram, systemProgram, dexProgram
  ],
  data,
}: TransactionInstruction) {
  return {
    programId,
    keys: {
      fromMarket, fromOrderbook, fromEventQueue, fromBids, fromAsks, fromBaseVault, fromQuoteVault, fromMarketSigner,
      toMarket, toOrderbook, toEventQueue, toBids, toAsks, toBaseVault, toQuoteVault, toMarketSigner,
      inputTokenAccount, intermediateTokenAccount, outputTokenAccount, userOwner, splTokenProgram, systemProgram, dexProgram
    },
    data: swapExactTokensToTokensInstructionData.decode(data),
  };
}