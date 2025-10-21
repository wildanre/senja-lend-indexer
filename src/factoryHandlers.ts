import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { LendingPoolAbi } from '../abis/LendingPoolAbi';
// import { HELPER_CONTRACT_ADDRESS } from '../ponder.config';
import { getRouter } from './helpers/contractHelpers';
// import { discoverRouterForPool, createConfiguredClient } from './helpers/routerDiscovery';
import { 
  createEventID, 
  getOrCreateFactory,
  getOrCreatePool,
  getOrCreatePoolRouter,
  createCompositeID 
} from './helpers/entityHelpers';

// Setup client menggunakan konfigurasi dari ponder.config.ts
// const client = createConfiguredClient();

// Helper function untuk mendaftarkan ke dynamic registry
async function registerToDynamicRegistry(
  context: any,
  entityType: string,
  address: string,
  relatedAddress?: string,
  metadata?: any,
  timestamp?: bigint,
  blockNumber?: bigint,
  transactionHash?: string
) {
  const registryId = createCompositeID(entityType, address);
  
  await context.db.insert(schema.DynamicRegistry).values({
    id: registryId,
    entityType,
    address,
    relatedAddress: relatedAddress || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isActive: true,
    discoveredAt: timestamp || 0n,
    blockNumber: blockNumber || 0n,
    transactionHash: transactionHash || "",
  });
  
  console.log(`📝 Registered ${entityType} ${address} to dynamic registry`);
}

// Handler untuk LendingPoolCreated event dari Factory
ponder.on("LendingPoolFactory:LendingPoolCreated", async ({ event, context }) => {
  console.log(`🏭 New Lending Pool Created: ${event.args.lendingPool}`);
  
  const poolAddress = event.args.lendingPool;
  const collateralToken = event.args.collateralToken;
  const borrowToken = event.args.borrowToken;
  const ltv = event.args.ltv;
  const factoryAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  const transactionHash = event.transaction.hash;
  
  // Query router address menggunakan dynamic discovery dengan configured client
  let routerAddress: string | null = null;
  
  // TEMP: Disable helper contract calls that may cause sync hanging
  console.log(`🔄 Skipping router discovery for pool ${poolAddress} (helper contract disabled)`);
  
  /* COMMENTED OUT: Router discovery causing sync to hang
  try {
    // Gunakan dynamic discovery dengan configured client dari ponder.config.ts
    routerAddress = await discoverRouterForPool(poolAddress, client);
    console.log(`🤖 Router discovered for pool ${poolAddress}: ${routerAddress}`);
  } catch (error) {
    console.error(`❌ Failed to discover router for pool ${poolAddress}:`, error);
    
    // Fallback ke helper contract approach dengan configured client
    try {
      const contractContext = {
        client: client,
        network: "moonbeam"
      };
      
      routerAddress = await getRouter(poolAddress, HELPER_CONTRACT_ADDRESS, contractContext);
      console.log(`🔄 Fallback helper contract discovery successful: ${routerAddress}`);
    } catch (helperError) {
      console.error(`❌ Helper contract fallback failed:`, helperError);
      
      // Final fallback ke direct contract call menggunakan configured client
      try {
        routerAddress = await client.readContract({
          address: poolAddress as `0x${string}`,
          abi: LendingPoolAbi,
          functionName: 'router',
        }) as string;
        console.log(`🔄 Direct contract fallback successful: ${routerAddress}`);
      } catch (directError) {
        console.error(`❌ All router discovery methods failed for pool ${poolAddress}:`, directError);
      }
    }
  }
  */

  // Create atau update pool menggunakan helper function
  const pool = await getOrCreatePool(context, poolAddress, factoryAddress, collateralToken, borrowToken);
  
  // Update pool data dengan timestamp dari event (penting untuk menghindari timestamp conflict)
  await context.db.update(schema.LendingPool, { id: poolAddress }).set({
    created: timestamp,
    lastAccrued: timestamp, // Set lastAccrued to event timestamp to avoid negative time delta
  });

  // Register pool ke dynamic registry
  await registerToDynamicRegistry(
    context,
    "pool",
    poolAddress,
    factoryAddress,
    {
      collateralToken,
      borrowToken,
      ltv: ltv.toString(),
    },
    timestamp,
    blockNumber,
    transactionHash
  );

  // Jika router berhasil ditemukan, create pool-router mapping dan register ke dynamic registry
  if (routerAddress) {
    await getOrCreatePoolRouter(
      context,
      poolAddress,
      routerAddress,
      timestamp,
      blockNumber
    );

    // Register router ke dynamic registry
    await registerToDynamicRegistry(
      context,
      "router",
      routerAddress,
      poolAddress,
      {
        poolAddress,
        discoveredFrom: "pool_creation"
      },
      timestamp,
      blockNumber,
      transactionHash
    );
  }

  // Catat event creation menggunakan schema yang ada
  const eventId = createEventID(blockNumber, event.log.logIndex);
  
  await context.db.insert(schema.LendingPoolCreated).values({
    id: eventId,
    lendingPool: poolAddress,
    collateralToken: collateralToken,
    borrowToken: borrowToken,
    ltv: ltv,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: transactionHash,
  });

  // Update atau create factory record menggunakan helper
  const factory = await getOrCreateFactory(context, factoryAddress);
  
  await context.db.update(schema.LendingPoolFactory, { id: factoryAddress })
    .set({
      totalPoolsCreated: factory.totalPoolsCreated + 1n,
      created: timestamp,
    });

  console.log(`✅ Pool ${poolAddress} telah dicatat dengan tokens: ${collateralToken}/${borrowToken}`);
  console.log(`📊 Factory ${factoryAddress} sekarang memiliki ${factory.totalPoolsCreated + 1n} pools`);
  
  // NOTE: Di Ponder tidak ada template creation seperti subgraph, 
  // tapi pool sudah otomatis di-track melalui factory pattern di config
});
