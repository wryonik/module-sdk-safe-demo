import AccountFactoryAbi from "./abis/AccountFactory.json";
import LaunchpadAbi from "./abis/AccountFactory.json";
import {
  Address,
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  slice,
  stringToBytes,
} from "viem";
import { getPublicClient } from "./clients";
import {
  ACCOUNT_FACTORY_ADDRESS,
  LAUNCHPAD_ADDRESS,
  SAFE_SINGLETON_ADDRESS,
} from "./contracts";

type InitialModule = {
  module: Address;
  initData: Hex;
};

export const createAccount = async ({ salt }: any) => {
  const saltNonce = keccak256(stringToBytes(salt));

  const initialValidators = getInitialValidators();
  return await getAccount({
    salt: saltNonce,
    initialValidators,
  });
};

function getInitialValidators() {
  const initialValidators: InitialModule[] = [
    {
      module: "0x503b54Ed1E62365F0c9e4caF1479623b08acbe77",
      initData: "0x",
    },
  ];

  return initialValidators;
}

async function getInitializationData(
  initialValidators: InitialModule[]
): Promise<Hex> {
  const publicClient = getPublicClient();
  const initializer = (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: LaunchpadAbi,
    functionName: "getInitCode",
    args: [
      ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
      1,
      initialValidators,
      ,
      [],
      [],
      [],
    ],
  })) as Hex;
  return initializer;
}

export async function getAccountAddress(
  salt: Hex,
  initializationData: Hex
): Promise<Address> {
  const publicClient = getPublicClient();

  const creationCode = (await publicClient.readContract({
    address: ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactoryAbi,
    functionName: "proxyCreationCode",
  })) as Hex;

  return (await publicClient.readContract({
    address: LAUNCHPAD_ADDRESS,
    abi: LaunchpadAbi,
    functionName: "predictSafeAddress",
    args: [
      SAFE_SINGLETON_ADDRESS,
      ACCOUNT_FACTORY_ADDRESS,
      creationCode,
      salt,
      initializationData,
    ],
  })) as Address;
}
export async function getAccount({ salt, initialValidators }: any) {
  const initializationData = await getInitializationData(initialValidators);
  const address = await getAccountAddress(salt, initializationData);
  const initCode = encodePacked(
    ["address", "bytes"],
    [
      ACCOUNT_FACTORY_ADDRESS,
      encodeFunctionData({
        abi: AccountFactoryAbi,
        functionName: "createProxyWithNonce",
        args: [SAFE_SINGLETON_ADDRESS, initializationData, salt],
      }),
    ]
  );

  return {
    address,
    initCode,
  };
}
