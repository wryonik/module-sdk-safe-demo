import AccountFactory from "./abis/AccountFactory.json";
import Launchpad from "./abis/Launchpad.json";
import {
  Address,
  Hex,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbi,
  stringToBytes,
  zeroAddress,
} from "viem";
import { getPublicClient } from "./clients";
import {
  ACCOUNT_FACTORY_ADDRESS,
  LAUNCHPAD_ADDRESS,
  SAFE_7579_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
  VALIDATOR_ADDRESS,
} from "./contracts";
import { encodeUserOpCallData } from "./userop";

type InitialModule = {
  module: Address;
  initData: Hex;
};

export const createAccount = async ({
  salt,
  initialAction,
}: {
  salt: string;
  initialAction: {
    target: Address;
    value: string;
    callData: Hex;
  };
}): Promise<{
  address: Address;
  initCode: Hex;
  callData: Hex;
}> => {
  const saltNonce = keccak256(stringToBytes(salt));

  const initialValidators = getInitialValidators();
  return await getAccount({
    salt: saltNonce,
    initialValidators,
    initialAction,
  });
};

function getInitialValidators(): InitialModule[] {
  const initialValidators: InitialModule[] = [
    {
      module: VALIDATOR_ADDRESS,
      initData: "0x",
    },
  ];

  return initialValidators;
}

export async function getAccount({
  salt,
  initialValidators,
  initialAction,
}: {
  salt: Hex;
  initialValidators: InitialModule[];
  initialAction: {
    target: Address;
    value: string;
    callData: Hex;
  };
}): Promise<{
  address: Address;
  initCode: Hex;
  callData: Hex;
}> {
  const initData = {
    singleton: SAFE_SINGLETON_ADDRESS,
    owners: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
    threshold: BigInt(1),
    setupTo: LAUNCHPAD_ADDRESS,
    setupData: encodeFunctionData({
      abi: Launchpad.abi,
      functionName: "initSafe7579",
      args: [
        SAFE_7579_ADDRESS,
        [], // executors
        [], // fallbacks
        [], // hooks
        [], // attesters
        0, // threshold
      ],
    }),
    safe7579: SAFE_7579_ADDRESS,
    validators: initialValidators,
    callData: encodeUserOpCallData({
      actions: [initialAction],
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
