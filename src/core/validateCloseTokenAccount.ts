import { decodeCloseAccountInstruction, decodeInstruction, isCloseAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TransactionInstruction } from "@solana/web3.js";
import { ENV_FEE_PAYER } from "./env";

export async function validateCloseTokenAccount(instruction: TransactionInstruction) {
	const decodedIx = decodeInstruction(instruction); // seems redundant, not sure if it's needed
	if (!isCloseAccountInstruction(decodedIx))
		throw new Error('invalid instruction');

	let account, destination, authority, programId;
	try {
		({
			keys: {
				account, destination, authority
			},
			programId
		} = decodeCloseAccountInstruction(instruction));
	} catch {
		throw new Error('invalid close token account instruction');
	}

	if (!account || !destination || !authority) throw new Error("invalid instruction keys");

	if (destination.pubkey.equals(ENV_FEE_PAYER)) throw new Error("desitnation cannot be the relayer");

	if (authority.pubkey.equals(ENV_FEE_PAYER)) throw new Error("authority cannot be the relayer");

	if (!programId.equals(TOKEN_PROGRAM_ID)) throw new Error('invalid token program id');

	return {
		programId,
		keys: {
			account, destination, authority
		}
	}
}