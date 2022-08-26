import { TransactionInstruction } from "@solana/web3.js";
import { ROUTER_ID } from "./consts";
import { decodeSwapExactTokensToTokensInstruction, SwapExactTokensToTokensInstruction } from "./instructions/swapExactTokensToTokens";


type DecodeRouterInstruction =
	| SwapExactTokensToTokensInstruction;

export function decodeRouterInstruction(instruction: TransactionInstruction, programId = ROUTER_ID): DecodeRouterInstruction {
	if (!instruction.programId.equals(programId)) throw new Error("invalid program id");
	if (!instruction.data.length) throw new Error("missing instruction data");

	return decodeSwapExactTokensToTokensInstruction(instruction, programId);
}