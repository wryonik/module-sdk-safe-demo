import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { VALIDATOR_ADDRESS } from "./contracts";

// mock validator
export const chosenValidator = {
  address: VALIDATOR_ADDRESS,
  mockSignature:
    "0xe8b94748580ca0b4993c9a1b86b5be851bfc076ff5ce3a1ff65bf16392acfcb800f9b4f1aef1555c7fce5599fffb17e7c635502154a0333ba21f3ae491839af51c",
  signMessageAsync: async (message: Hex, activeAccount: any) => {
    const signer = privateKeyToAccount(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    );
    const signature = await signer.signMessage({
      message: { raw: message },
    });
    return signature;
  },
};
