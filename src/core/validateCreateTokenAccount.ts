import { ACCOUNT_SIZE } from "@solana/spl-token";
import { SystemInstruction, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { ENV_FEE_PAYER } from "./env";

// only allows the creation of account with ACCOUNT_SIZE
// TODO: check if the check if enough -> e.g. do we need to check the data size as well?
export async function validateCreateTokenAccount(
  instruction: TransactionInstruction,
  relayerCheck?: {
    expectedAmountInLamports: number;
  }
) {
  if (!instruction.programId.equals(SystemProgram.programId))
    throw new Error('invalid system program id');

  if (instruction.keys.length < 2)
    throw new Error(`found ${instruction.keys.length} keys, expected at least 2`);

  if (!instruction.data.length) throw new Error('missing instruction data');

  const [payer, newAccount] = instruction.keys;

  if (!payer || !newAccount) throw new Error('invalid instruction keys');

  const { lamports, space } = SystemInstruction.decodeCreateAccount(instruction);

  if (!payer.pubkey.equals(ENV_FEE_PAYER)) throw new Error('fee relayer has to pay for create token account');

  if (relayerCheck) {
    if (lamports < relayerCheck.expectedAmountInLamports) throw new Error('insufficient lamports for creating token account')
  }

  if (lamports < 0) throw new Error('invalid lamports amount');

  if (space != ACCOUNT_SIZE) throw new Error('invalid account size');

  return {
    programId: instruction.programId,
    keys: {
      payer,
      newAccount,
    },
    params: {
      lamports,
      space
    }
  }
}