import { PublicKey } from "@solana/web3.js";
import { Router as IDL_ROUTER } from "./idl-router";

export const ROUTER_ID = new PublicKey(IDL_ROUTER.metadata.address);