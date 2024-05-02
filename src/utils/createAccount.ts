import AccountFactory from "./abis/AccountFactory.json";
import Launchpad from "./abis/Launchpad.json";
import {
  Address,
  Hex,
  encodeFunctionData,
  encodePacked,
  zeroAddress,
} from "viem";
import { getPublicClient } from "./clients";
import {
  ACCOUNT_FACTORY_ADDRESS,
  LAUNCHPAD_ADDRESS,
  SAFE_7579_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
} from "./contracts";
import { Execution, encodeUserOpCallData } from "./userop";

type ModuleInit = {
  module: Address;
  initData: Hex;
};

type RegistryConfig = {
  attesters: Address[];
  threshold: number;
};

type SafeConfig = {
  owners: Address[];
  threshold: number;
};

// create a new account
// todo: add client side logic instead of rpc calls
export async function createAccount({
  salt,
  validators,
  executors,
  fallbacks,
  hooks,
  safeConfig,
  registryConfig,
  initialExecution,
}: {
  salt: Hex;
  validators: ModuleInit[];
  executors: ModuleInit[];
  fallbacks: ModuleInit[];
  hooks: ModuleInit[];
  safeConfig: SafeConfig;
  registryConfig: RegistryConfig;
  initialExecution: Execution;
}): Promise<{
  address: Address;
  initCode: Hex;
  callData: Hex;
}> {
  const initData = {
    singleton: SAFE_SINGLETON_ADDRESS,
    owners: safeConfig.owners,
    threshold: safeConfig.threshold,
    setupTo: LAUNCHPAD_ADDRESS,
    setupData: encodeFunctionData({
      abi: Launchpad.abi,
      functionName: "initSafe7579",
      args: [
        SAFE_7579_ADDRESS,
        executors,
        fallbacks,
        hooks,
        registryConfig.attesters,
        registryConfig.threshold,
      ],
    }),
    safe7579: SAFE_7579_ADDRESS,
    validators: validators,
    callData: encodeUserOpCallData({
      executions: [initialExecution],
    }),
  };

  const publicClient = getPublicClient();

  const initHash = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: Launchpad.abi,
    functionName: "hash",
    args: [initData],
  })) as Hex;

  const factoryInitializer = encodeFunctionData({
    abi: Launchpad.abi,
    functionName: "preValidationSetup",
    args: [initHash, zeroAddress, ""],
  });

  const initCode = encodePacked(
    ["address", "bytes"],
    [
      ACCOUNT_FACTORY_ADDRESS,
      encodeFunctionData({
        abi: AccountFactory.abi,
        functionName: "createProxyWithNonce",
        args: [LAUNCHPAD_ADDRESS, factoryInitializer, salt],
      }),
    ]
  );

  const callData = encodeFunctionData({
    abi: Launchpad.abi,
    functionName: "setupSafe",
    args: [initData],
  });

  const safeProxyCreationCode = (await publicClient.readContract({
    address: ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactory.abi,
    functionName: "proxyCreationCode",
    args: [],
  })) as Hex;

  const address = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: Launchpad.abi,
    functionName: "predictSafeAddress",
    args: [
      LAUNCHPAD_ADDRESS,
      ACCOUNT_FACTORY_ADDRESS,
      safeProxyCreationCode,
      salt,
      factoryInitializer,
    ],
  })) as Address;

  return {
    address,
    initCode,
    callData,
  };
}
