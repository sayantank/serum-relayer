import { PublicKey } from '@solana/web3.js';

export enum DexInstruction {
    CreateMarker = 0,
    NewOrder = 1,
    Swap = 2,
    CancelOrder = 3,
    ConsumeEvents = 4,
    Settle = 5,
    InitializeAccount = 6,
    SweepFees = 7,
    CloseAccount = 8,
    CloseMarket = 9,
    UpdateRoyalties = 10,
}

export type DecodedDexInstruction = {
    programID: PublicKey;
    type: DexInstruction;
};
