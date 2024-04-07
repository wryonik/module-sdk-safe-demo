"use client";

import { getBundlerClient } from "@/utils/clients";
import { createAccount } from "@/utils/createAccount";
import { createAndSignUserOp, submitUserOpToBundler } from "@/utils/userop";
import { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const generateRandomString = function () {
  return Math.random().toString(20).substr(2, 6);
};

export default function Home() {
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

    const actions = [
      {
        to: "0xF7C012789aac54B5E33EA5b88064ca1F1172De05",
        value: "1",
        data: "0x",
      },
    ];

    const chosenValidator = {
      address: "0x503b54Ed1E62365F0c9e4caF1479623b08acbe77",
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
      actions,
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
