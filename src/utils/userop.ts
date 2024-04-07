import { getBundlerClient, getPublicClient } from "./clients";
import AccountInterface from "./abis/Account.json";
import { Address, Hex, encodeFunctionData, encodeAbiParameters } from "viem";
import {
  UserOperation,
  getAccountNonce,
  getUserOperationHash,
} from "permissionless";
import { ENTRY_POINT_ADDRESS } from "./contracts";
import { EntryPoint } from "permissionless/types";
import { sepolia } from "viem/chains";

export async function createAndSignUserOp({
  actions,
  activeAccount,
  chosenValidator,
}: any) {
  const op = await createUnsignedUserOp(
    {
      actions,
    },
    activeAccount,
    chosenValidator
  );
  return await signUserOp(op, activeAccount, chosenValidator);
}

export async function createUnsignedUserOp(
  info: any,
  activeAccount: any,
  chosenValidator: any
): Promise<any> {
  const callData = await encodeUserOpCallData(info);
  const initCode = await getUserOpInitCode(activeAccount);

  const publicClient = getPublicClient();
  const currentNonce = await getAccountNonce(publicClient, {
    sender: activeAccount.address,
    entryPoint: ENTRY_POINT_ADDRESS,
    key: BigInt(chosenValidator.address),
  });

  const partialUserOp: any = {
    sender: activeAccount.address,
    // @dev mock nonce used for estimating gas
    // @dev using the latest nonce will revert during estimation
    nonce: currentNonce,
    initCode: initCode,
    callData: callData,
    paymasterAndData: "0x",
    // @dev mock signature used for estimating gas
    signature: chosenValidator.mockSignature,
  };

  const bundlerClient = getBundlerClient();
  const gasPriceResult = await bundlerClient.getUserOperationGasPrice();
  partialUserOp.maxFeePerGas = gasPriceResult.standard.maxFeePerGas;
  partialUserOp.maxPriorityFeePerGas =
    gasPriceResult.standard.maxPriorityFeePerGas;

  const gasEstimate = await bundlerClient.estimateUserOperationGas({
    userOperation: partialUserOp,
    entryPoint: ENTRY_POINT_ADDRESS,
  });
  partialUserOp.preVerificationGas = gasEstimate.preVerificationGas;
  partialUserOp.verificationGasLimit = gasEstimate.verificationGasLimit;
  partialUserOp.callGasLimit = gasEstimate.callGasLimit;

  // reset signature
  partialUserOp.signature = "";

  return {
    ...partialUserOp,
  };
}

export async function signUserOp(
  userOp: any,
  activeAccount: any,
  chosenValidator: any
): Promise<any> {
  const userOpHash = getUserOperationHash({
    userOperation: userOp,
    chainId: sepolia.id,
    entryPoint: ENTRY_POINT_ADDRESS,
  });
  const signature = await chosenValidator.signMessageAsync(
    userOpHash,
    activeAccount
  );
  userOp.signature = signature;
  return userOp;
}

export async function submitUserOpToBundler(userOp: any): Promise<string> {
  const bundlerClient = getBundlerClient();
  return await bundlerClient.sendUserOperation({
    userOperation: userOp,
    entryPoint: ENTRY_POINT_ADDRESS,
  });
}

export async function encodeUserOpCallData(
  detailsForUserOp: any
): Promise<Hex> {
  const actions = detailsForUserOp.actions;
  if (actions.length === 0) {
    throw new Error("No actions");
  } else if (actions.length === 1) {
    const { target, value, callData } = actions[0];
    return encodeFunctionData({
      functionName: "execute",
      abi: AccountInterface.abi,
      args: [target, value, callData],
    });
  } else {
    return encodeFunctionData({
      functionName: "executeBatch",
      abi: AccountInterface.abi,
      args: [actions],
    });
  }
}

async function getUserOpInitCode(account: any): Promise<Hex> {
  if ((await isContract(account)) == false) {
    return account.initCode;
  }
  return "0x";
}

async function isContract(account: any): Promise<boolean> {
  const publicClient = getPublicClient();
  const code = await publicClient.getBytecode({ address: account.address });
  return code !== undefined;
}
