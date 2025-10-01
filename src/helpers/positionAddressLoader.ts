import { createPublicClient, http, parseAbi } from "viem";
import { FACTORY_ADDRESS, START_BLOCK, CHAIN_CONFIG } from "../../ponder.config";

/**
 * Loader untuk Position addresses secara otomatis dari blockchain
 * Akan query semua CreatePosition events dari LendingPool contracts
 */

// ABI minimal untuk query events
const LENDING_POOL_ABI = parseAbi([
  "event CreatePosition(address user, address positionAddress)",
]);

const FACTORY_ABI = parseAbi([
  "event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)",
]);

/**
 * Load semua Position addresses dari blockchain
 * Ini akan:
 * 1. Query semua LendingPool addresses dari Factory
 * 2. Untuk setiap LendingPool, query semua CreatePosition events
 * 3. Return array of Position addresses
 */
export async function loadPositionAddressesFromChain(): Promise<string[]> {
  console.log("🔍 Loading Position addresses from blockchain...");
  
  try {
    const client = createPublicClient({
      chain: {
        id: CHAIN_CONFIG.id,
        name: "kaia",
        nativeCurrency: { name: "KAIA", symbol: "KAIA", decimals: 18 },
        rpcUrls: {
          default: { http: CHAIN_CONFIG.rpc },
          public: { http: CHAIN_CONFIG.rpc },
        },
      },
      transport: http(CHAIN_CONFIG.rpc[0]),
    });

    // Step 1: Get all LendingPool addresses from Factory
    console.log("📋 Step 1: Querying LendingPool addresses from Factory...");
    const poolCreatedLogs = await client.getLogs({
      address: FACTORY_ADDRESS as `0x${string}`,
      event: {
        type: 'event',
        name: 'LendingPoolCreated',
        inputs: [
          { type: 'address', name: 'collateralToken', indexed: true },
          { type: 'address', name: 'borrowToken', indexed: true },
          { type: 'address', name: 'lendingPool', indexed: true },
          { type: 'uint256', name: 'ltv', indexed: false },
        ],
      },
      fromBlock: BigInt(START_BLOCK),
      toBlock: 'latest',
    });

    const lendingPoolAddresses = poolCreatedLogs.map(log => log.args.lendingPool as string);
    console.log(`✅ Found ${lendingPoolAddresses.length} LendingPool addresses`);

    if (lendingPoolAddresses.length === 0) {
      console.log("⚠️  No LendingPools found, returning empty array");
      return [];
    }

    // Step 2: For each LendingPool, get all CreatePosition events
    console.log("📋 Step 2: Querying CreatePosition events from each LendingPool...");
    const positionAddresses: string[] = [];

    for (const poolAddress of lendingPoolAddresses) {
      try {
        const createPositionLogs = await client.getLogs({
          address: poolAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'CreatePosition',
            inputs: [
              { type: 'address', name: 'user', indexed: false },
              { type: 'address', name: 'positionAddress', indexed: false },
            ],
          },
          fromBlock: BigInt(START_BLOCK),
          toBlock: 'latest',
        });

        const positions = createPositionLogs.map(log => log.args.positionAddress as string);
        positionAddresses.push(...positions);
        console.log(`  📍 Pool ${poolAddress}: ${positions.length} positions`);
      } catch (error) {
        console.error(`❌ Error querying CreatePosition for pool ${poolAddress}:`, error);
      }
    }

    console.log(`✅ Total Position addresses found: ${positionAddresses.length}`);
    return Array.from(new Set(positionAddresses)); // Remove duplicates
  } catch (error) {
    console.error("❌ Error loading Position addresses from chain:", error);
    return [];
  }
}

/**
 * Cache untuk Position addresses
 * Akan di-update setiap kali ada CreatePosition event baru
 */
let cachedPositionAddresses: string[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getPositionAddresses(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached jika masih fresh
  if (cachedPositionAddresses.length > 0 && now - lastCacheUpdate < CACHE_TTL) {
    return cachedPositionAddresses;
  }

  // Load fresh dari blockchain
  cachedPositionAddresses = await loadPositionAddressesFromChain();
  lastCacheUpdate = now;
  
  return cachedPositionAddresses;
}

/**
 * Update cache dengan Position address baru
 */
export function addPositionToCache(positionAddress: string) {
  if (!cachedPositionAddresses.includes(positionAddress)) {
    cachedPositionAddresses.push(positionAddress);
    console.log(`✨ Added new Position to cache: ${positionAddress}`);
  }
}
