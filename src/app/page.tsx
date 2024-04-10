"use client";

import { getBundlerClient, getPublicClient } from "@/utils/clients";
import { VALIDATOR_ADDRESS } from "@/utils/contracts";
import { createAccount } from "@/utils/createAccount";
import { createAndSignUserOp, submitUserOpToBundler } from "@/utils/userop";
import {
  Address,
  Hex,
  createWalletClient,
  getAddress,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const generateRandomString = function () {
  return Math.random().toString(20).substr(2, 6);
};

export default function Home() {
  const getEth = async (account: Address) => {
    const walletClient = createWalletClient({
      transport: http("https://rpc.ankr.com/eth_sepolia"),
      chain: sepolia,
      account: privateKeyToAccount(process.env.NEXT_PUBLIC_FAUCET_KEY! as Hex),
    });
    const publicClient = getPublicClient();

    if (
      (await publicClient.getBalance({ address: account })) > parseEther("0.04")
    ) {
      console.log("already has eth");
    } else {
      const hash = await walletClient.sendTransaction({
        to: getAddress(account),
        value: parseEther("0.1"),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });
      console.log(receipt);
    }
  };
  const sendEth = async () => {
    console.log("send eth");

    let salt = localStorage.getItem("salt");
    if (!salt) {
      salt = generateRandomString();
      localStorage.setItem("salt", salt);
    }

    const activeAccount = await createAccount({
      salt,
    });

    await getEth(activeAccount.address);

    const chosenValidator = {
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

    const userOp = await createAndSignUserOp({
      activeAccount,
      callData: activeAccount.callData,
      chosenValidator,
    });

    const hash = (await submitUserOpToBundler(userOp)) as Hex;

    const receipt = await getBundlerClient().waitForUserOperationReceipt({
      hash,
    });

    console.log(receipt);
  };

  return (
    <main className="flex justify-center mt-24">
      <div>
        <button onClick={sendEth}>Send ETH</button>
      </div>
    </main>
  );
}
