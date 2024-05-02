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
import { getPublicClient } from "./clients";

// simple faucet
export const getEth = async (account: Address) => {
  const walletClient = createWalletClient({
    transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
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
