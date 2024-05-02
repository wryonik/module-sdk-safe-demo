"use client";

import { getBundlerClient } from "@/utils/clients";
import { VALIDATOR_ADDRESS } from "@/utils/contracts";
import { createAccount } from "@/utils/createAccount";
import { getEth } from "@/utils/faucet";
import { generateRandomString } from "@/utils/misc";
import { createAndSignUserOp, submitUserOpToBundler } from "@/utils/userop";
import { chosenValidator } from "@/utils/validator";
import { Address, Hex, keccak256, stringToBytes } from "viem";

export default function Home() {
  const sendEth = async () => {
    // get the salt from local storage or generate a new one
    // this salt is used as an identifier for the account
    let salt = localStorage.getItem("salt");
    if (!salt) {
      salt = generateRandomString();
      localStorage.setItem("salt", salt);
    }
    const saltNonce = keccak256(stringToBytes(salt));

    // create a new account
    const activeAccount = await createAccount({
      salt: saltNonce,
      validators: [{ module: VALIDATOR_ADDRESS, initData: "0x" }],
      executors: [],
      fallbacks: [],
      hooks: [],
      safeConfig: {
        owners: ["0x503b54Ed1E62365F0c9e4caF1479623b08acbe77"],
        threshold: 1,
      },
      registryConfig: {
        attesters: [],
        threshold: 0,
      },
      initialExecution: {
        target: "0xF7C012789aac54B5E33EA5b88064ca1F1172De05" as Address,
        value: "1",
        callData: "0x" as Hex,
      },
    });

    // get some eth from the faucet
    await getEth(activeAccount.address);

    // create and sign a user operation
    const userOp = await createAndSignUserOp({
      activeAccount,
      callData: activeAccount.callData,
      chosenValidator,
    });

    // submit the user operation to the bundler
    const hash = (await submitUserOpToBundler(userOp)) as Hex;

    // wait for the user operation to be processed
    const receipt = await getBundlerClient().waitForUserOperationReceipt({
      hash,
    });

    // log the receipt
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
