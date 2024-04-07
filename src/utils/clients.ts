import { createClient, http, createPublicClient } from "viem";
import { sepolia } from "viem/chains";
import { pimlicoBundlerActions } from "permissionless/actions/pimlico";
import { ENTRYPOINT_ADDRESS_V07, bundlerActions } from "permissionless";

export const getBundlerClient = () =>
  createClient({
    transport: http(
      `https://api.pimlico.io/v1/sepolia/rpc?apikey=YOUR_API_KEY_HERE`
    ),
    chain: sepolia,
  })
    .extend(bundlerActions(ENTRYPOINT_ADDRESS_V07))
    .extend(pimlicoBundlerActions(ENTRYPOINT_ADDRESS_V07));

export const getPublicClient = () => {
  return createPublicClient({
    transport: http("https://rpc.ankr.com/eth_sepolia"),
    chain: sepolia,
  });
};
