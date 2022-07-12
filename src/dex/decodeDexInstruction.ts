import { DEX_ID } from '@bonfida/dex-v4';
import { u8 } from '@solana/buffer-layout';
import { TransactionInstruction } from '@solana/web3.js';
import { deserialize } from 'borsh';
import {
    cancelOrderInstruction,
    closeAccountInstruction,
    closeMarketInstruction,
    consumeEventsInstruction,
    createMarketInstruction,
    initializeAccountInstruction,
    newOrderInstruction,
    settleInstruction,
    swapInstruction,
    sweepFeesInstruction,
} from './dex-v4/js/src/raw_instructions';
import { DexInstruction } from './types';

export function decodeDexInstruction(instruction: TransactionInstruction, programId = DEX_ID) {
    if (!instruction.data.length) throw new Error('missing instruction data');
    if (!instruction.programId.equals(programId)) throw new Error('invalid program id');

    const type = u8().decode(instruction.data);

    switch (type) {
        case DexInstruction.CreateMarket: {
            return deserialize(createMarketInstruction.schema, createMarketInstruction, instruction.data);
        }
        case DexInstruction.NewOrder: {
            return deserialize(newOrderInstruction.schema, newOrderInstruction, instruction.data);
        }
        case DexInstruction.Swap: {
            return deserialize(swapInstruction.schema, swapInstruction, instruction.data);
        }
        case DexInstruction.CancelOrder: {
            return deserialize(cancelOrderInstruction.schema, cancelOrderInstruction, instruction.data);
        }
        case DexInstruction.ConsumeEvents: {
            return deserialize(consumeEventsInstruction.schema, consumeEventsInstruction, instruction.data);
        }
        case DexInstruction.Settle: {
            return deserialize(settleInstruction.schema, settleInstruction, instruction.data);
        }
        case DexInstruction.InitializeAccount: {
            return deserialize(initializeAccountInstruction.schema, initializeAccountInstruction, instruction.data);
        }
        case DexInstruction.SweepFees: {
            return deserialize(sweepFeesInstruction.schema, sweepFeesInstruction, instruction.data);
        }
        case DexInstruction.CloseAccount: {
            return deserialize(closeAccountInstruction.schema, closeAccountInstruction, instruction.data);
        }
        case DexInstruction.CloseMarket: {
            return deserialize(closeMarketInstruction.schema, closeMarketInstruction, instruction.data);
        }
        default: {
            throw new Error(`unknown instruction`);
        }
    }
}
