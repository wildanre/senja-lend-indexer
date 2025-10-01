import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { createEventID } from './helpers/entityHelpers';

// ========================================
// OPTIMIZED LENDING POOL HANDLERS 
// ========================================

// Sistem optimasi untuk LendingPool events:
// 1. Cache untuk mengurangi database lookups
// 2. Minimal database operations per event
// 3. Throttling untuk mengurangi load pada database
// 4. Focus pada events yang benar-benar critical

// Cache untuk position dan pool information
const lendingPoolCache = new Map<string, {
  positions: Set<string>,
  totalSupply: bigint,
  totalBorrow: bigint,
  lastActivity: number
}>();

// Rate limiting untuk database operations
let lastDbWrite = 0;
const DB_THROTTLE_MS = 150; // 150ms throttle untuk stabilitas

async function throttledDbOperation<T>(operation: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (now - lastDbWrite < DB_THROTTLE_MS) {
    await new Promise(resolve => setTimeout(resolve, DB_THROTTLE_MS));
  }
  lastDbWrite = Date.now();
  return operation();
}

// OPTIMIZED: CreatePosition - Critical event, minimal overhead
ponder.on("LendingPool:CreatePosition", async ({ event, context }) => {
  console.log("🎯 OPTIMIZED CreatePosition:", {
    user: event.args.user,
    position: event.args.positionAddress,
    pool: event.log.address
  });
  
  const userAddress = event.args.user;
  const positionAddress = event.args.positionAddress;
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  // Single database write - hanya essentials
  await throttledDbOperation(async () => {
    // Insert CreatePosition event
    await context.db.insert(schema.CreatePosition).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      positionAddress: positionAddress,
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });

    // Insert Position registry untuk tracking
    await context.db.insert(schema.Position).values({
      id: positionAddress,
      positionAddress: positionAddress,
      user: userAddress,
      lendingPool: poolAddress,
      createdAt: timestamp,
      createdAtBlock: BigInt(event.block.number),
      txHash: event.transaction.hash,
    });
  });
  
  // Update cache for future lookups
  if (!lendingPoolCache.has(poolAddress)) {
    lendingPoolCache.set(poolAddress, {
      positions: new Set(),
      totalSupply: 0n,
      totalBorrow: 0n,
      lastActivity: Date.now()
    });
  }
  
  const cached = lendingPoolCache.get(poolAddress)!;
  cached.positions.add(positionAddress);
  cached.lastActivity = Date.now();
  
  console.log(`✅ OPTIMIZED CreatePosition: ${userAddress} -> ${positionAddress} in pool ${poolAddress}`);
});

// OPTIMIZED: SupplyCollateral - Streamlined processing
ponder.on("LendingPool:SupplyCollateral", async ({ event, context }) => {
  console.log("💰 OPTIMIZED SupplyCollateral:", {
    user: event.args.user,
    amount: event.args.amount,
    pool: event.log.address
  });
  
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  // Single optimized database write
  await throttledDbOperation(async () => {
    await context.db.insert(schema.SupplyCollateral).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress, // Pool acts as asset in this context
      amount: amount,
      onBehalfOf: userAddress, // Default to self
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
  });
  
  // Update cache totals
  const cached = lendingPoolCache.get(poolAddress);
  if (cached) {
    cached.totalSupply += amount;
    cached.lastActivity = Date.now();
  }
  
  console.log(`✅ OPTIMIZED SupplyCollateral: ${amount} for ${userAddress} in pool ${poolAddress}`);
});

// OPTIMIZED: SupplyLiquidity - Core liquidity tracking
ponder.on("LendingPool:SupplyLiquidity", async ({ event, context }) => {
  console.log("🏦 OPTIMIZED SupplyLiquidity:", {
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares
  });
  
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  // Single database write untuk supply - menggunakan schema yang ada
  await throttledDbOperation(async () => {
    await context.db.insert(schema.SupplyLiquidity).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress, // Pool acts as asset in this context
      amount: amount,
      shares: shares,
      onBehalfOf: userAddress, // Default to self
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
  });
  
  // Update cache
  const cached = lendingPoolCache.get(poolAddress);
  if (cached) {
    cached.totalSupply += amount;
    cached.lastActivity = Date.now();
  }
  
  console.log(`✅ OPTIMIZED SupplyLiquidity: ${amount} (${shares} shares) from ${userAddress}`);
});

// OPTIMIZED: BorrowDebtCrosschain - Cross-chain borrow tracking
ponder.on("LendingPool:BorrowDebtCrosschain", async ({ event, context }) => {
  console.log("💳 OPTIMIZED BorrowDebtCrosschain:", {
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares,
    chainId: event.args.chainId
  });
  
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const chainId = BigInt(event.args.chainId);
  const addExecutorLzReceiveOption = BigInt(event.args.addExecutorLzReceiveOption);
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  await throttledDbOperation(async () => {
    await context.db.insert(schema.BorrowDebtCrosschain).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress,
      amount: amount,
      shares: shares,
      chainId: chainId,
      addExecutorLzReceiveOption: addExecutorLzReceiveOption,
      onBehalfOf: userAddress, // Default to user since not in event args
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
  });
  
  console.log(`✅ OPTIMIZED BorrowDebtCrosschain: ${amount} borrowed by ${userAddress} on chain ${chainId}`);
});

// OPTIMIZED: WithdrawLiquidity - Liquidity withdrawal tracking
ponder.on("LendingPool:WithdrawLiquidity", async ({ event, context }) => {
  console.log("🏦📤 OPTIMIZED WithdrawLiquidity:", {
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares
  });
  
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  await throttledDbOperation(async () => {
    await context.db.insert(schema.WithdrawLiquidity).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress,
      amount: amount,
      shares: shares,
      to: userAddress, // Default to user since not in event args
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
  });
  
  console.log(`✅ OPTIMIZED WithdrawLiquidity: ${amount} (${shares} shares) withdrawn by ${userAddress}`);
});

// OPTIMIZED: RepayByPosition - Position-based repayment tracking
ponder.on("LendingPool:RepayByPosition", async ({ event, context }) => {
  console.log("🔄 OPTIMIZED RepayByPosition:", {
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares
  });
  
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const poolAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  
  await throttledDbOperation(async () => {
    await context.db.insert(schema.RepayWithCollateralByPosition).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress,
      amount: amount,
      shares: shares,
      repayer: userAddress, // Default to user since not in event args
      timestamp: timestamp,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash,
    });
  });
  
  console.log(`✅ OPTIMIZED RepayByPosition: ${amount} (${shares} shares) repaid by ${userAddress}`);
});

// Cache cleanup untuk mencegah memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [address, info] of lendingPoolCache.entries()) {
    // Remove cache entries yang sudah tidak aktif > 10 menit
    if (now - info.lastActivity > 10 * 60 * 1000) {
      lendingPoolCache.delete(address);
    }
  }
  
  // Emergency cache clear jika terlalu besar
  if (lendingPoolCache.size > 500) {
    console.log("🧹 Emergency lending pool cache clear to prevent memory leak");
    lendingPoolCache.clear();
  }
}, 2 * 60000); // Every 2 minutes

// Helper function untuk mendapatkan cached pool data
export function getCachedPoolData(poolAddress: string) {
  return lendingPoolCache.get(poolAddress);
}

// Helper function untuk batch processing dengan throttling
export async function batchLendingPoolOperations(operations: (() => Promise<void>)[]): Promise<void> {
  console.log(`🔄 Batching ${operations.length} lending pool operations`);
  
  for (let i = 0; i < operations.length; i += 5) { // Smaller batches of 5
    const batch = operations.slice(i, i + 5);
    await Promise.all(batch.map(op => op()));
    
    // Longer delay between batches untuk stability
    if (i + 5 < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`✅ Completed batching lending pool operations`);
}

export { lendingPoolCache };