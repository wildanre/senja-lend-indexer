import { createPublicClient, http, type Address } from "viem";
import { LendingPoolAbi as PositionAbi } from "../../abis/PositionAbi";

interface PositionHelperContext {
  client: any;
  network: any;
}

interface PositionData {
  lpAddress: string;
  owner: string;
  counter: bigint;
  totalCollateral: bigint;
  totalBorrow: bigint;
  healthFactor: bigint;
  isActive: boolean;
}

interface PositionBalances {
  collateralBalance: bigint;
  borrowBalance: bigint;
  collateralToken: string;
  borrowToken: string;
}

export async function getPositionDetails(
  positionAddress: string,
  context: PositionHelperContext
): Promise<{
  lpAddress: string;
  owner: string;
  counter: bigint;
}> {
  try {
    const [lpAddress, owner, counter] = await Promise.all([
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'lpAddress',
      }),
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'owner',
      }),
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'counter',
      }),
    ]);

    return {
      lpAddress: lpAddress as string,
      owner: owner as string,
      counter: counter as bigint,
    };
  } catch (error) {
    console.error("Error getting position details:", error);
    throw error;
  }
}

/**
 * Get comprehensive position data including balances and health metrics
 */
export async function getFullPositionData(
  positionAddress: string,
  context: PositionHelperContext
): Promise<PositionData> {
  try {
    const [lpAddress, owner, counter] = await Promise.all([
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'lpAddress',
      }),
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'owner',
      }),
      context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'counter',
      }),
    ]);

    // Get additional position metrics if available
    let totalCollateral = 0n;
    let totalBorrow = 0n;
    let healthFactor = 0n;
    let isActive = true;

    try {
      // Try to get position metrics from the contract
      totalCollateral = await context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'totalCollateral',
      }) as bigint;
    } catch (e) {
      console.warn(`Could not get totalCollateral for position ${positionAddress}`);
    }

    try {
      totalBorrow = await context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'totalBorrow',
      }) as bigint;
    } catch (e) {
      console.warn(`Could not get totalBorrow for position ${positionAddress}`);
    }

    try {
      healthFactor = await context.client.readContract({
        address: positionAddress as `0x${string}`,
        abi: PositionAbi,
        functionName: 'healthFactor',
      }) as bigint;
    } catch (e) {
      console.warn(`Could not get healthFactor for position ${positionAddress}`);
    }

    return {
      lpAddress: lpAddress as string,
      owner: owner as string,
      counter: counter as bigint,
      totalCollateral,
      totalBorrow,
      healthFactor,
      isActive,
    };
  } catch (error) {
    console.error("Error getting full position data:", error);
    throw error;
  }
}

/**
 * Get position token balances for collateral and borrow tokens
 */
export async function getPositionBalances(positionAddress: Address, poolAddress: Address, context: any) {
  const { client } = context;
  
  // Get pool info to know which tokens are collateral/borrow
  const poolData = await client.readContract({
    address: poolAddress,
    abi: [
      {
        name: "getTokens",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
          { name: "collateralToken", type: "address" },
          { name: "borrowToken", type: "address" }
        ]
      }
    ],
    functionName: "getTokens"
  });

  // Get position balances for both tokens
  const collateralBalance = await client.readContract({
    address: positionAddress,
    abi: PositionAbi,
    functionName: "getTokenBalance",
    args: [poolData[0]]
  });

  const borrowBalance = await client.readContract({
    address: positionAddress,
    abi: PositionAbi,
    functionName: "getTokenBalance", 
    args: [poolData[1]]
  });

  return {
    collateralBalance,
    borrowBalance,
    collateralToken: poolData[0],
    borrowToken: poolData[1]
  };
}

export async function getTokenValue(
  positionAddress: string,
  tokenAddress: string,
  context: PositionHelperContext
): Promise<bigint> {
  try {
    const value = await context.client.readContract({
      address: positionAddress as `0x${string}`,
      abi: PositionAbi,
      functionName: 'tokenValue',
      args: [tokenAddress as `0x${string}`],
    });
    
    return value as bigint;
  } catch (error) {
    console.error("Error getting token value:", error);
    throw error;
  }
}

export async function calculateExpectedAmount(
  positionAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  context: PositionHelperContext
): Promise<bigint> {
  try {
    const expectedAmount = await context.client.readContract({
      address: positionAddress as `0x${string}`,
      abi: PositionAbi,
      functionName: '_calculateExpectedAmountWithPriceFeeds',
      args: [
        tokenIn as `0x${string}`,
        tokenOut as `0x${string}`,
        amountIn,
      ],
    });

    return expectedAmount as bigint;
  } catch (error) {
    console.error("Error calculating expected amount:", error);
    throw error;
  }
}