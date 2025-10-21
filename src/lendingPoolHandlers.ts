import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { createEventID } from './helpers/entityHelpers';
import { createPublicClient, http } from "viem";
import { fetchPositionEvents, processPositionEvent } from "./helpers/dynamicContractRegistrar";
import { CHAIN_CONFIG } from "../ponder.config";


const lendingPoolCache = new Map<string, {
  positions: Set<string>,
  totalSupply: bigint,
  totalBorrow: bigint,
  lastActivity: number
}>();

let lastDbWrite = 0;
const DB_THROTTLE_MS = 150; 

const client = createPublicClient({
  chain: {
    id: CHAIN_CONFIG.id,
    name: "moonbeam",
    nativeCurrency: { name: "MOONBEAM", symbol: "GLMR", decimals: 18 },
    rpcUrls: {
      default: { http: CHAIN_CONFIG.rpc },
      public: { http: CHAIN_CONFIG.rpc },
    },
  },
  transport: http(CHAIN_CONFIG.rpc[0]),
});

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
  
  // 🚀 AUTO-SYNC: Fetch Position events secara otomatis setelah Position dibuat
  console.log(`🔄 AUTO-SYNC: Fetching events for newly created Position ${positionAddress}...`);
  try {
    const positionEvents = await fetchPositionEvents(
      client,
      positionAddress,
      BigInt(event.block.number), // Start dari block saat ini
      'latest'
    );
    
    // Process dan save semua events yang ditemukan
    for (const positionEvent of positionEvents) {
      await processPositionEvent(context, positionEvent, positionAddress);
    }
    
    console.log(`✅ AUTO-SYNC: Processed ${positionEvents.length} events for Position ${positionAddress}`);
  } catch (error) {
    console.error(`❌ AUTO-SYNC: Error fetching Position events:`, error);
  }
  
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
      asset: poolAddress, 
      amount: amount,
      onBehalfOf: userAddress,
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
  
  await throttledDbOperation(async () => {
    await context.db.insert(schema.SupplyLiquidity).values({
      id: createEventID(BigInt(event.block.number), event.log.logIndex!),
      user: userAddress,
      pool: poolAddress,
      asset: poolAddress,
      amount: amount,
      shares: shares,
      onBehalfOf: userAddress,
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