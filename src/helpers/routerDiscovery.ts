import { createPublicClient, http } from "viem";
import { helperAbi } from "../../abis/helperAbi";
import { LendingPoolFactoryAbi } from "../../abis/LendingPoolFactoryAbi";

const client = createPublicClient({
  transport: http('https://1rpc.io/base')
});

const HELPER_CONTRACT_ADDRESS = "0xad15249b77d9Bf9a02401b8122FC763fD7391329";
const FACTORY_ADDRESS = "0x5a28316959551dA618F84070FfF70B390270185C";
const START_BLOCK = 35950604n;

/**
 * Discovers all router addresses dynamically using helper contract
 * Mirip dengan logic di frontend hooks tapi untuk indexer
 */
export async function discoverAllRouterAddresses(): Promise<string[]> {
  try {
    console.log("🔍 Starting dynamic router discovery...");
    
    // 1. Get all LendingPoolCreated events from factory
    const poolEvents = await client.getLogs({
      address: FACTORY_ADDRESS as `0x${string}`,
      event: {
        type: 'event',
        name: 'LendingPoolCreated',
        inputs: [
          { name: 'collateralToken', type: 'address', indexed: true },
          { name: 'borrowToken', type: 'address', indexed: true },
          { name: 'lendingPool', type: 'address', indexed: true },
          { name: 'ltv', type: 'uint256', indexed: false },
        ],
      },
      fromBlock: START_BLOCK,
      toBlock: 'latest',
    });

    console.log(`📝 Found ${poolEvents.length} pools from factory events`);

    // 2. For each pool, query its router using helper contract
    const routerAddresses: string[] = [];
    const uniqueRouters = new Set<string>();

    for (const event of poolEvents) {
      if (event.args?.lendingPool) {
        try {
          const routerAddress = await client.readContract({
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
 * Discovers router address for specific pool (mirip useReadRouterAddress hook)
 */
export async function discoverRouterForPool(poolAddress: string): Promise<string | null> {
  try {
    const routerAddress = await client.readContract({
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