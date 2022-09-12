import { SystemInstruction, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { OBLIGATION_SIZE } from "../lending/model/state";

export async function validateCreateObligationAccount(
  instruction: TransactionInstruction,
  relayerCheck?: {
    expectedAmountInLamports: number;
  }
) {
  if (!instruction.programId.equals(SystemProgram.programId))
    throw new Error('invalid system program id');

  if (instruction.keys.length !== 3) throw new Error('invalid number of keys');

  if (!instruction.data.length) throw new Error('missing instruction data');

  const [payer, newAccount, owner] = instruction.keys;

  let basePubkey, fromPubkey, lamports, newAccountPubkey, seed, space;
  try {
    ({ basePubkey, fromPubkey, lamports, newAccountPubkey, seed, space } = SystemInstruction.decodeCreateWithSeed(instruction));
  } catch {
    throw new Error('invalid create with seed token account instruction');
  }

  if (space != OBLIGATION_SIZE) throw new Error('invalid obligation size');

  if (payer.pubkey.equals(owner.pubkey)) throw new Error('cannot create obligation account for relayer');

  if (payer.pubkey.equals(basePubkey)) throw new Error('cannot create obligation account for relayer');

  if (!payer.pubkey.equals(fromPubkey)) throw new Error('payer must be the same as from');

  if (!newAccount.pubkey.equals(newAccountPubkey)) throw new Error('invalid new account');

  if (relayerCheck) {
    if (lamports != relayerCheck.expectedAmountInLamports) throw new Error('invalid lamports amount');
  }

  return {
    programId: instruction.programId,
    keys: {
      payer: payer.pubkey,
      newAccount: newAccount.pubkey,
      owner: owner.pubkey,
    },
    params: {
      basePubkey,
      fromPubkey,
      lamports,
      newAccountPubkey,
      seed,
      space,
    }
  }
}