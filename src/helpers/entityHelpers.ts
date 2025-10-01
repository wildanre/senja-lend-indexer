import * as schema from "../../ponder.schema";
import { 
  addDynamicPool, 
  addDynamicRouter, 
  addDynamicPosition,
  updatePositionActivity 
} from '../dynamicPoolConfig';
import { 
  getRouter, 
  getLendingPoolMetrics, 
  getHealthFactor, 
  getCollateralBalance,
  getMaxBorrowAmount 
} from "./contractHelpers";
import { getPositionDetails, getTokenValue } from "./positionHelpers";

/**
 * Helper function untuk membuat event ID unik
 * Mirip dengan createEventID di subgraph
 */
export function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

/**
 * Helper function untuk membuat ID unik dari dua parameter
 */
export function createCompositeID(param1: string, param2: string): string {
  return `${param1}-${param2}`;
}

/**
 * Get or create User entity
 * Mirip dengan getOrCreateUser di subgraph
 */
export async function getOrCreateUser(
  context: any, 
  userAddress: string
): Promise<any> {
  // Cek apakah user sudah ada
  let user = await context.db.find(schema.User, { id: userAddress });
  
  if (!user) {
    // Buat user baru jika belum ada
    await context.db.insert(schema.User).values({
      id: userAddress,
      address: userAddress,
      totalDeposited: 0n,
      totalWithdrawn: 0n,
      totalBorrowed: 0n,
      totalRepaid: 0n,
      totalSwapped: 0n,
    });
    
    user = await context.db.find(schema.User, { id: userAddress });
    console.log(`👤 Created new user: ${userAddress}`);
  }
  
  return user;
}

/**
 * Get or create LendingPoolFactory entity
 * Mirip dengan getOrCreateFactory di subgraph
 */
export async function getOrCreateFactory(
  context: any,
  factoryAddress: string
): Promise<any> {
  let factory = await context.db.find(schema.LendingPoolFactory, { id: factoryAddress });
  
  if (!factory) {
    await context.db.insert(schema.LendingPoolFactory).values({
      id: factoryAddress,
      address: factoryAddress,
      totalPoolsCreated: 0n,
      created: 0n,
    });
    
    factory = await context.db.find(schema.LendingPoolFactory, { id: factoryAddress });
    console.log(`🏭 Created new factory: ${factoryAddress}`);
  }
  
  return factory;
}

/**
 * Get or create LendingPool entity
 * Mirip dengan getOrCreatePool di subgraph
 */
export async function getOrCreatePool(
  context: any, 
  poolAddress: string,
  factoryAddress?: string,
  token0Address?: string,
  token1Address?: string,
  helperContractAddress?: string
): Promise<string> {
  let pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  
  if (!pool) {
    // TEMP: Skip helper contract router discovery to prevent hanging
    let routerAddress = "0x0000000000000000000000000000000000000000";
    console.log(`🔄 Skipping router discovery for pool ${poolAddress} (helper contract disabled)`);
    
    /* COMMENTED OUT: Helper contract call causing sync to hang
    if (helperContractAddress) {
      try {
        routerAddress = await getRouter(poolAddress, helperContractAddress, context);
        console.log(`🔍 Discovered router ${routerAddress} for pool ${poolAddress}`);
      } catch (error) {
        console.warn(`⚠️ Could not get router for pool ${poolAddress}:`, error);
      }
    }
    */

    await context.db.insert(schema.LendingPool).values({
      id: poolAddress,
      address: poolAddress,
      factory: factoryAddress || "0x0000000000000000000000000000000000000000",
      token0: token0Address || "0x0000000000000000000000000000000000000000",
      token1: token1Address || "0x0000000000000000000000000000000000000000",
      router: routerAddress,
      totalDeposits: 0n,
      totalWithdrawals: 0n,
      totalBorrows: 0n,
      totalRepays: 0n,
      totalSwaps: 0n,
      totalSupplyAssets: 0n,
      totalSupplyShares: 0n,
      totalLiquidity: 0n,
      totalBorrowAssets: 0n,
      totalBorrowShares: 0n,
      utilizationRate: 0,
      supplyAPY: 0,
      borrowAPY: 0,
      supplyRate: 0,
      borrowRate: 0,
      lastAccrued: BigInt(Math.floor(Date.now() / 1000)), // Use seconds, not milliseconds
      created: BigInt(Math.floor(Date.now() / 1000)), // Use seconds, not milliseconds
    });

    // Register router in dynamic registry if discovered
    if (routerAddress !== "0x0000000000000000000000000000000000000000") {
      await registerPoolRouter(context, poolAddress, routerAddress);
    }

    console.log(`✅ Created pool ${poolAddress} with router ${routerAddress}`);
  }
  
  return poolAddress;
}

/**
 * Get or create PoolRouter mapping
 */
export async function getOrCreatePoolRouter(
  context: any,
  poolAddress: string,
  routerAddress: string,
  discoveredAt: bigint,
  blockNumber: bigint
): Promise<any> {
  let poolRouter = await context.db.find(schema.PoolRouter, { id: poolAddress });
  
  if (!poolRouter) {
    await context.db.insert(schema.PoolRouter).values({
      id: poolAddress,
      poolAddress: poolAddress,
      routerAddress: routerAddress,
      isActive: true,
      discoveredAt: discoveredAt,
      blockNumber: blockNumber,
    });
    
    // Add to dynamic registry
    addDynamicRouter({
      address: routerAddress,
      poolAddress: poolAddress,
      discoveredAt: discoveredAt,
      isActive: true,
    });
    
    poolRouter = await context.db.find(schema.PoolRouter, { id: poolAddress });
    console.log(`🔗 Created pool-router mapping: ${poolAddress} -> ${routerAddress}`);
  }
  
  return poolRouter;
}

/**
 * Get or create UserPosition mapping
 * Mirip dengan getOrCreateUserPosition di subgraph
 */
export async function getOrCreateUserPosition(
  context: any,
  userId: string,
  poolId: string,
  positionAddress: string,
  timestamp: bigint
): Promise<string> {
  const positionId = `${userId}-${poolId}`;
  let userPosition = await context.db.find(schema.UserPosition, { id: positionId });
  
  if (!userPosition) {
    // Get position details from contract
    let lpAddress = poolId;
    let owner = userId;
    let counter = 0n;

    try {
      const positionDetails = await getPositionDetails(positionAddress, context);
      lpAddress = positionDetails.lpAddress;
      owner = positionDetails.owner;
      counter = positionDetails.counter;
    } catch (error) {
      console.warn(`⚠️ Could not get position details for ${positionAddress}:`, error);
    }

    await context.db.insert(schema.UserPosition).values({
      id: positionId,
      user: userId,
      pool: poolId,
      positionAddress: positionAddress,
      lpAddress: lpAddress,
      owner: owner,
      counter: counter,
      isActive: true,
      createdAt: timestamp,
      lastUpdated: timestamp,
    });

    console.log(`✅ Created user position ${positionId} with address ${positionAddress}`);
  }
  
  return positionId;
}

/**
 * Update User totals (untuk tracking seperti di subgraph)
 */
export async function updateUserTotals(
  context: any,
  userAddress: string,
  updates: {
    totalDeposited?: bigint;
    totalWithdrawn?: bigint;
    totalBorrowed?: bigint;
    totalRepaid?: bigint;
    totalSwapped?: bigint;
  }
): Promise<void> {
  const user = await getOrCreateUser(context, userAddress);
  
  if (user) {
    const updateData: any = {};
    
    if (updates.totalDeposited !== undefined) {
      updateData.totalDeposited = user.totalDeposited + updates.totalDeposited;
    }
    if (updates.totalWithdrawn !== undefined) {
      updateData.totalWithdrawn = user.totalWithdrawn + updates.totalWithdrawn;
    }
    if (updates.totalBorrowed !== undefined) {
      updateData.totalBorrowed = user.totalBorrowed + updates.totalBorrowed;
    }
    if (updates.totalRepaid !== undefined) {
      updateData.totalRepaid = user.totalRepaid + updates.totalRepaid;
    }
    if (updates.totalSwapped !== undefined) {
      updateData.totalSwapped = user.totalSwapped + updates.totalSwapped;
    }
    
    if (Object.keys(updateData).length > 0) {
      await context.db.update(schema.User, { id: userAddress }).set(updateData);
      console.log(`📊 Updated user totals for ${userAddress}`);
    }
  }
}

/**
 * Update Pool totals
 */
export async function updatePoolTotals(
  context: any,
  poolAddress: string,
  updates: {
    totalDeposits?: bigint;
    totalWithdrawals?: bigint;
    totalBorrows?: bigint;
    totalRepays?: bigint;
    totalSwaps?: bigint;
  }
): Promise<void> {
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  
  if (pool) {
    const updateData: any = {};
    
    if (updates.totalDeposits !== undefined) {
      updateData.totalDeposits = pool.totalDeposits + updates.totalDeposits;
    }
    if (updates.totalWithdrawals !== undefined) {
      updateData.totalWithdrawals = pool.totalWithdrawals + updates.totalWithdrawals;
    }
    if (updates.totalBorrows !== undefined) {
      updateData.totalBorrows = pool.totalBorrows + updates.totalBorrows;
    }
    if (updates.totalRepays !== undefined) {
      updateData.totalRepays = pool.totalRepays + updates.totalRepays;
    }
    if (updates.totalSwaps !== undefined) {
      updateData.totalSwaps = pool.totalSwaps + updates.totalSwaps;
    }
    
    if (Object.keys(updateData).length > 0) {
      await context.db.update(schema.LendingPool, { id: poolAddress }).set(updateData);
      console.log(`📊 Updated pool totals for ${poolAddress}`);
    }
  }
}

/**
 * Update position activity timestamp
 */
export async function updatePositionActivityTimestamp(
  context: any,
  positionAddress: string,
  timestamp: bigint
): Promise<void> {
  // Update in database
  await context.db.update(schema.PositionRegistry, { id: positionAddress })
    .set({ lastActivity: timestamp });
    
  // Update in dynamic registry
  updatePositionActivity(positionAddress, timestamp);
  
  console.log(`⏰ Updated position activity: ${positionAddress}`);
}

/**
 * Enhanced pool metrics update using helper contract
 */
export async function updatePoolAPY(
  context: any,
  poolAddress: string,
  timestamp: bigint,
  blockNumber: bigint,
  helperContractAddress?: string
) {
  if (!helperContractAddress) {
    console.warn("⚠️ No helper contract address provided for APY calculation");
    return;
  }

  try {
    const metrics = await getLendingPoolMetrics(poolAddress, helperContractAddress, context);
    
    // Update pool with real metrics from helper contract
    await context.db.update(schema.LendingPool, { id: poolAddress }).set({
      totalSupplyAssets: metrics.totalSupplyAssets,
      totalBorrowAssets: metrics.totalBorrowAssets,
      utilizationRate: metrics.utilizationRate,
      supplyAPY: metrics.supplyAPY,
      borrowAPY: metrics.borrowAPY,
      totalLiquidity: metrics.totalSupplyAssets - metrics.totalBorrowAssets,
      lastAccrued: timestamp,
    });

    // Create APY snapshot
    const snapshotId = `${poolAddress}-${timestamp}`;
    await context.db.insert(schema.PoolAPYSnapshot).values({
      id: snapshotId,
      pool: poolAddress,
      supplyAPY: metrics.supplyAPY,
      borrowAPY: metrics.borrowAPY,
      utilizationRate: metrics.utilizationRate,
      totalSupplyAssets: metrics.totalSupplyAssets,
      totalBorrowAssets: metrics.totalBorrowAssets,
      timestamp: timestamp,
      blockNumber: blockNumber,
    });

    console.log(`📊 Updated pool APY for ${poolAddress}: Supply ${metrics.supplyAPY}wei, Borrow ${metrics.borrowAPY}wei, Utilization ${metrics.utilizationRate}wei`);
  } catch (error) {
    console.error(`❌ Error updating pool APY for ${poolAddress}:`, error);
  }
}

/**
 * Enhanced user health tracking
 */
export async function updateUserHealth(
  context: any,
  userAddress: string,
  poolAddress: string,
  helperContractAddress?: string
) {
  if (!helperContractAddress) return;

  try {
    const [healthFactor, collateralBalance, maxBorrowAmount] = await Promise.all([
      getHealthFactor(poolAddress, userAddress, helperContractAddress, context),
      getCollateralBalance(poolAddress, userAddress, helperContractAddress, context),
      getMaxBorrowAmount(poolAddress, userAddress, helperContractAddress, context),
    ]);

    // Update user position with health metrics
    const positionId = `${userAddress}-${poolAddress}`;
    await context.db.update("UserPosition", { id: positionId }).set({
      healthFactor: healthFactor,
      collateralBalance: collateralBalance,
      maxBorrowAmount: maxBorrowAmount,
      lastUpdated: BigInt(Date.now()),
    });

    console.log(`💊 Updated user health for ${userAddress}: HF ${healthFactor}, Collateral ${collateralBalance}`);
  } catch (error) {
    console.error(`❌ Error updating user health:`, error);
  }
}

// Register pool-router mapping in dynamic registry
async function registerPoolRouter(
  context: any,
  poolAddress: string,
  routerAddress: string
) {
  try {
    await context.db.insert(schema.PoolRouter).values({
      id: `${poolAddress}-${routerAddress}`,
      pool: poolAddress,
      router: routerAddress,
      isActive: true,
      createdAt: BigInt(Date.now()),
      lastUpdated: BigInt(Date.now()),
    });

    console.log(`🔗 Registered pool-router mapping: ${poolAddress} -> ${routerAddress}`);
  } catch (error) {
    console.error(`❌ Error registering pool-router:`, error);
  }
}