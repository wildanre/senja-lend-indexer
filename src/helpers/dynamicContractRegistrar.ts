import { parseAbiItem, type PublicClient } from "viem";
import { LendingPoolRouterAbi } from "../../abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "../../abis/PositionAbi";
import * as schema from "../../ponder.schema";

/**
 * AUTOMATIC Position Event Tracker
 * 
 * Karena Ponder tidak support nested factory pattern, kita akan track Position events
 * secara manual dengan query logs dari Position contracts yang sudah di-create
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
export const POSITION_EVENT_SIGNATURES = {
  WithdrawCollateral: parseAbiItem("event WithdrawCollateral(address user, uint256 amount)"),
  SwapToken: parseAbiItem("event SwapToken(address user, address token, uint256 amount)"),
  SwapTokenByPosition: parseAbiItem("event SwapTokenByPosition(address user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)"),
  Liquidate: parseAbiItem("event Liquidate(address user)"),
};

/**
 * Fetch Position events dari specific Position contract
 * Ini akan dipanggil secara berkala atau on-demand untuk sync Position events
 */
export async function fetchPositionEvents(
  client: PublicClient,
  positionAddress: string,
  fromBlock: bigint,
  toBlock: bigint | 'latest' = 'latest'
): Promise<any[]> {
  console.log(`🔍 Fetching Position events from ${positionAddress} (blocks ${fromBlock}-${toBlock})`);
  
  try {
    const events = [];
    
    // Fetch all Position event types
    for (const [eventName, eventAbi] of Object.entries(POSITION_EVENT_SIGNATURES)) {
      try {
        const logs = await client.getLogs({
          address: positionAddress as `0x${string}`,
          event: eventAbi as any,
          fromBlock,
          toBlock,
        });
        
        events.push(...logs.map(log => ({
          eventName,
          ...log,
        })));
      } catch (error) {
        console.error(`Error fetching ${eventName} events:`, error);
      }
    }
    
    console.log(`✅ Found ${events.length} Position events`);
    return events;
  } catch (error) {
    console.error(`❌ Error fetching Position events from ${positionAddress}:`, error);
    return [];
  }
}

/**
 * AUTO-SYNC: Automatically sync Position events untuk semua Position contracts
 * Yang sudah tercatat di CreatePosition
 */
export async function autoSyncPositionEvents(
  context: any,
  client: PublicClient
): Promise<void> {
  console.log("� AUTO-SYNC: Starting automatic Position events sync...");
  
  try {
    // Get all Position addresses dari database
    const positions = await context.db
      .select()
      .from(context.db.Position)
      .execute();
    
    console.log(`📍 Found ${positions.length} Position contracts to sync`);
    
    for (const position of positions) {
      const positionAddress = position.positionAddress;
      const startBlock = position.createdAtBlock;
      
      // Fetch events untuk Position ini
      const events = await fetchPositionEvents(
        client,
        positionAddress,
        startBlock,
        'latest'
      );
      
      // Process each event dan save ke database
      for (const event of events) {
        await processPositionEvent(context, event, positionAddress);
      }
    }
    
    console.log("✅ AUTO-SYNC: Position events sync completed");
  } catch (error) {
    console.error("❌ AUTO-SYNC: Error during Position events sync:", error);
  }
}

/**
 * Process individual Position event dan save ke database
 */
export async function processPositionEvent(context: any, event: any, positionAddress: string): Promise<void> {
  const eventName = event.eventName;
  const args = event.args;
  
  // Get pool address untuk Position ini dari database
  let poolAddress = "";
  try {
    const positions = await context.db
      .select()
      .from(schema.Position);
    
    const position = positions.find((p: any) => p.positionAddress === positionAddress);
    if (position) {
      poolAddress = position.lendingPool || "";
    }
  } catch (error) {
    console.error(`Error fetching pool for Position ${positionAddress}:`, error);
  }
  
  try {
    switch (eventName) {
      case 'SwapTokenByPosition':
        await context.db.insert(schema.PositionSwapTokenByPosition).values({
          id: `${event.transactionHash}-${event.logIndex}`,
          user: args.user,
          tokenIn: args.tokenIn,
          tokenOut: args.tokenOut,
          amountIn: args.amountIn,
          amountOut: args.amountOut,
          positionAddress,
          pool: poolAddress,
          timestamp: event.blockTimestamp || 0n,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }).onConflictDoNothing();
        console.log(`✅ Saved SwapTokenByPosition: ${args.user} - ${args.amountIn} → ${args.amountOut}`);
        break;
        
      case 'SwapToken':
        await context.db.insert(schema.PositionSwapToken).values({
          id: `${event.transactionHash}-${event.logIndex}`,
          user: args.user,
          token: args.token,
          amount: args.amount,
          positionAddress,
          timestamp: event.blockTimestamp || 0n,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          logIndex: Number(event.logIndex),
        }).onConflictDoNothing();
        console.log(`✅ Saved SwapToken: ${args.user} - ${args.amount}`);
        break;
        
      case 'WithdrawCollateral':
        await context.db.insert(schema.PositionWithdrawCollateral).values({
          id: `${event.transactionHash}-${event.logIndex}`,
          user: args.user,
          amount: args.amount,
          positionAddress,
          pool: poolAddress,
          timestamp: event.blockTimestamp || 0n,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        }).onConflictDoNothing();
        console.log(`✅ Saved WithdrawCollateral: ${args.user} - ${args.amount}`);
        break;
        
      case 'Liquidate':
        await context.db.insert(schema.Liquidate).values({
          id: `${event.transactionHash}-${event.logIndex}`,
          user: args.user,
          positionAddress,
          timestamp: event.blockTimestamp || 0n,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          logIndex: Number(event.logIndex),
        }).onConflictDoNothing();
        console.log(`✅ Saved Liquidate: ${args.user}`);
        break;
    }
  } catch (error) {
    console.error(`❌ Error processing ${eventName} event:`, error);
  }
}
