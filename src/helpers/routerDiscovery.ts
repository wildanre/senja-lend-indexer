import { createPublicClient, http } from "viem";
import { helperAbi } from "../../abis/helperAbi";
import { LendingPoolFactoryAbi } from "../../abis/LendingPoolFactoryAbi";
import { 
  HELPER_CONTRACT_ADDRESS, 
  FACTORY_ADDRESS, 
  START_BLOCK,
  CHAIN_CONFIG,
  LENDING_POOL_CREATED_EVENT
} from "../../ponder.config";

// Export untuk reuse di file lain
export { CHAIN_CONFIG };

/**
 * Create configured client using settings from ponder config
 */
export function createConfiguredClient() {
  return createPublicClient({
    transport: http(CHAIN_CONFIG.rpc[0]) 
  });
}

// Default client instance
const client = createConfiguredClient();

/**
 * Discovers all router addresses dynamically using helper contract
 * Menggunakan konfigurasi dari ponder.config.ts untuk consistency
 * 
 * @param customClient - Optional custom viem client, defaults to configured client
 * @param fromBlock - Optional custom start block, defaults to START_BLOCK from config
 */
export async function discoverAllRouterAddresses(
  customClient?: ReturnType<typeof createConfiguredClient>,
  fromBlock?: bigint
): Promise<string[]> {
  const activeClient = customClient || client;
  const startBlock = fromBlock || BigInt(START_BLOCK);
  
  try {
    console.log("🔍 Starting dynamic router discovery...");
    console.log(`📍 Using factory: ${FACTORY_ADDRESS}`);
    console.log(`📍 Using helper: ${HELPER_CONTRACT_ADDRESS}`);
    console.log(`📍 Starting from block: ${startBlock}`);
    
    // 1. Get all LendingPoolCreated events from factory
    const poolEvents = await activeClient.getLogs({
      address: FACTORY_ADDRESS as `0x${string}`,
      event: LENDING_POOL_CREATED_EVENT,
      fromBlock: startBlock,
      toBlock: 'latest',
    });

    console.log(`📝 Found ${poolEvents.length} pools from factory events`);

    // 2. For each pool, query its router using helper contract
    const routerAddresses: string[] = [];
    const uniqueRouters = new Set<string>();

    for (const event of poolEvents) {
      if (event.args?.lendingPool) {
        try {
          const routerAddress = await activeClient.readContract({
            address: HELPER_CONTRACT_ADDRESS as `0x${string}`,
            abi: helperAbi,
            functionName: 'getRouter',
            args: [event.args.lendingPool],
          });

          if (routerAddress && routerAddress !== "0x0000000000000000000000000000000000000000") {
            const routerStr = routerAddress as string;
            if (!uniqueRouters.has(routerStr)) {
              uniqueRouters.add(routerStr);
              routerAddresses.push(routerStr);
              console.log(`🤖 Discovered router: ${routerStr} for pool: ${event.args.lendingPool}`);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to get router for pool ${event.args.lendingPool}:`, error);
        }
      }
    }

    console.log(`✅ Dynamic discovery complete. Found ${routerAddresses.length} unique routers`);
    return routerAddresses;

  } catch (error) {
    console.error("❌ Router discovery failed:", error);
    return [];
  }
}

/**
 * Discovers router address for specific pool
 * Menggunakan HELPER_CONTRACT_ADDRESS dari ponder config
 * 
 * @param poolAddress - Address of the lending pool
 * @param customClient - Optional custom viem client, defaults to configured client
 */
export async function discoverRouterForPool(
  poolAddress: string,
  customClient?: ReturnType<typeof createConfiguredClient>
): Promise<string | null> {
  const activeClient = customClient || client;
  
  try {
    const routerAddress = await activeClient.readContract({
      address: HELPER_CONTRACT_ADDRESS as `0x${string}`,
      abi: helperAbi,
      functionName: 'getRouter',
      args: [poolAddress as `0x${string}`],
    });

    return routerAddress as string;
  } catch (error) {
    console.error(`Failed to discover router for pool ${poolAddress}:`, error);
    return null;
  }
}