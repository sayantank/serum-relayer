import { u8 } from "@solana/buffer-layout";
import { TransactionInstruction } from "@solana/web3.js";
import { LENDING_PROGRAM_ID } from "./consts";
import { LendingInstruction } from "./instruction";

const WHITELISTED_IXS = [
  LendingInstruction.DepositReserveLiquidityAndObligationCollateral,
  LendingInstruction.WithdrawObligationCollateralAndRedeemReserveLiquidity,
  LendingInstruction.RefreshObligation,
  LendingInstruction.RefreshReserve,
  LendingInstruction.InitObligation,
]

export function decodeLendingInstruction(instruction: TransactionInstruction, programId = LENDING_PROGRAM_ID) {
  if (!instruction.programId.equals(programId)) throw new Error("invalid program id");

  const type = u8().decode(instruction.data);
  if (WHITELISTED_IXS.indexOf(type) === -1) { throw new Error("invalid instruction type") }
}