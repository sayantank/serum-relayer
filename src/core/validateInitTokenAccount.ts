import { decodeInitializeAccountInstruction, decodeInstruction, isInitializeAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { ENV_FEE_PAYER } from './env';

export async function validateInitTokenAccount(instruction: TransactionInstruction) {
	const decodedIx = decodeInstruction(instruction); // seems redundant, not sure if it's needed
	if (!isInitializeAccountInstruction(decodedIx))
		throw new Error('invalid initialize token account instruction');

	let account, mint, owner, rent, programId;
	try {
		({
			keys: {
				account, mint, owner, rent
			},
			programId
		} = decodeInitializeAccountInstruction(instruction));
	} catch {
		throw new Error('invalid initialize token account instruction');
	}

	if (!account || !mint || !owner || !rent) throw new Error("invalid instruction keys");

	if (owner.pubkey.equals(ENV_FEE_PAYER)) throw new Error('cannot initialize token account for relayer');

	if (!programId.equals(TOKEN_PROGRAM_ID)) throw new Error('invalid token program id');

	if (!rent.pubkey.equals(SYSVAR_RENT_PUBKEY)) throw new Error("invalid rent pubkey");

	return {
		programId,
		keys: {
			account, mint, owner, rent
		}
	}
}