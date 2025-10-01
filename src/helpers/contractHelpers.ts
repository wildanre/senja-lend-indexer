import { createPublicClient, http } from "viem";
import { helperAbi } from "../../abis/helperAbi";
import { LendingPoolAbi as PositionAbi } from "../../abis/PositionAbi";

interface ContractHelperContext {
  client: any;
  network: any;
}

// Helper contract functions using the Helper ABI
export async function getRouter(
  lendingPoolAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<string> {
  try {
    const router = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getRouter',
      args: [lendingPoolAddress as `0x${string}`],
    });

    return router as string;
  } catch (error) {
    console.error("Error getting router:", error);
    throw error;
  }
}

export async function getLendingPoolMetrics(
  lendingPoolAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<{
  supplyAPY: bigint;
  borrowAPY: bigint;
  utilizationRate: bigint;
  totalSupplyAssets: bigint;
  totalBorrowAssets: bigint;
}> {
  try {
    const metrics = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getLendingPoolMetrics',
      args: [lendingPoolAddress as `0x${string}`],
    });
    
    return {
      supplyAPY: metrics[0] as bigint,
      borrowAPY: metrics[1] as bigint,
      utilizationRate: metrics[2] as bigint,
      totalSupplyAssets: metrics[3] as bigint,
      totalBorrowAssets: metrics[4] as bigint,
    };
  } catch (error) {
    console.error("Error getting lending pool metrics:", error);
    throw error;
  }
}

export async function getHealthFactor(
  lendingPoolAddress: string,
  userAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<bigint> {
  try {
    const healthFactor = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getHealthFactor',
      args: [
        lendingPoolAddress as `0x${string}`,
        userAddress as `0x${string}`
      ],
    });
    
    return healthFactor as bigint;
  } catch (error) {
    console.error("Error getting health factor:", error);
    throw error;
  }
}

export async function getCollateralBalance(
  lendingPoolAddress: string,
  userAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<bigint> {
  try {
    const balance = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getCollateralBalance',
      args: [
        lendingPoolAddress as `0x${string}`,
        userAddress as `0x${string}`
      ],
    });
    
    return balance as bigint;
  } catch (error) {
    console.error("Error getting collateral balance:", error);
    throw error;
  }
}

export async function getMaxBorrowAmount(
  lendingPoolAddress: string,
  userAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<bigint> {
  try {
    const maxBorrow = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getMaxBorrowAmount',
      args: [
        lendingPoolAddress as `0x${string}`,
        userAddress as `0x${string}`
      ],
    });
    
    return maxBorrow as bigint;
  } catch (error) {
    console.error("Error getting max borrow amount:", error);
    throw error;
  }
}

export async function getExchangeRate(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  positionAddress: string,
  helperContractAddress: string,
  context: ContractHelperContext
): Promise<bigint> {
  try {
    const exchangeRate = await context.client.readContract({
      address: helperContractAddress as `0x${string}`,
      abi: helperAbi,
      functionName: 'getExchangeRate',
      args: [
        tokenIn as `0x${string}`,
        tokenOut as `0x${string}`,
        amountIn,
        positionAddress as `0x${string}`
      ],
    });
    
    return exchangeRate as bigint;
  } catch (error) {
    console.error("Error getting exchange rate:", error);
    throw error;
  }
}