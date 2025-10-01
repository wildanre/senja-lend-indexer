import { parseAbiItem } from "viem";
import { LendingPoolRouterAbi } from "../../abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "../../abis/PositionAbi";

/**
 * Dynamic contract registrar untuk Position dan Router contracts
 * Karena mereka tidak dapat diregistrasi sebagai factory pattern seperti pools,
 * mereka akan diregistrasi secara runtime ketika ditemukan
 */

export interface DynamicContractConfig {
  address: string;
  type: 'position' | 'router';
  poolAddress?: string;
  startBlock?: bigint;
}

export const POSITION_ABI = PositionAbi;
export const ROUTER_ABI = LendingPoolRouterAbi;

// Event signatures untuk Position contract
export const POSITION_EVENTS = [
  parseAbiItem("event WithdrawCollateral(address indexed user, address token, uint256 amount)"),
  parseAbiItem("event SwapToken(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"),
  parseAbiItem("event SwapTokenByPosition(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"),
];

// Event signatures untuk Router contract  
export const ROUTER_EVENTS = [
  parseAbiItem("event EmergencyPositionReset(address indexed user, address indexed position, uint256 timestamp)"),
  parseAbiItem("event PositionLiquidated(address indexed user, address indexed position, address indexed liquidator, uint256 timestamp)"),
];

/**
 * Register dynamic contract untuk monitoring
 * Akan dipanggil dari handlers ketika Position atau Router address ditemukan
 */
export async function registerDynamicContract(
  context: any,
  config: DynamicContractConfig
): Promise<void> {
  console.log(`📝 Registering dynamic ${config.type} contract: ${config.address}`);
  
  try {
    // Simpan ke database registry untuk tracking
    await context.db.insert(context.db.DynamicContractRegistry).values({
      id: config.address,
      contractType: config.type,
      poolAddress: config.poolAddress || "",
      registeredAt: BigInt(Date.now()),
      isActive: true,
    }).onConflictDoUpdate({
      target: ["id"],
      update: {
        isActive: true,
        poolAddress: config.poolAddress || "",
      }
    });
    
    console.log(`✅ Successfully registered ${config.type} contract: ${config.address}`);
  } catch (error) {
    console.error(`❌ Failed to register ${config.type} contract ${config.address}:`, error);
  }
}

/**
 * Get all registered dynamic contracts by type
 */
export async function getRegisteredContracts(
  context: any,
  type: 'position' | 'router'
): Promise<string[]> {
  try {
    const contracts = await context.db.findMany(context.db.DynamicContractRegistry, {
      where: {
        contractType: type,
        isActive: true,
      }
    });
    
    return contracts.map((c: any) => c.id);
  } catch (error) {
    console.error(`Failed to get registered ${type} contracts:`, error);
    return [];
  }
}