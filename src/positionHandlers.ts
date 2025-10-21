import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";


ponder.on("Position:SwapTokenByPosition", async ({ event, context }) => {
  const { user, tokenIn, tokenOut, amountIn, amountOut } = event.args;

  console.log(`🔄 SwapTokenByPosition: ${user} swapped ${amountIn} ${tokenIn} → ${amountOut} ${tokenOut}`);

  // Insert data swap dengan format yang sesuai schema
  try {
    await context.db.insert(schema.PositionSwapTokenByPosition).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      user: user,
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      amountIn: amountIn,
      amountOut: amountOut,
      positionAddress: event.log.address,
      pool: "",
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } catch (error) {
    console.error("❌ Error inserting SwapTokenByPosition:", error);
  }
});

ponder.on("Position:SwapToken", async ({ event, context }) => {
  const { user, token, amount } = event.args;

  console.log(`🔄 SwapToken: ${user} swapped ${amount} of ${token}`);

  try {
    await context.db.insert(schema.PositionSwapToken).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      user: user,
      token: token,
      amount: amount,
      positionAddress: event.log.address,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      txHash: event.transaction.hash,
      logIndex: event.log.logIndex,
    });
  } catch (error) {
    console.error("❌ Error inserting SwapToken:", error);
  }
});

ponder.on("Position:WithdrawCollateral", async ({ event, context }) => {
  const { user, amount } = event.args;

  console.log(`💸 Position WithdrawCollateral: ${user} withdrew ${amount} collateral`);

  try {
    await context.db.insert(schema.PositionWithdrawCollateral).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      user: user,
      amount: amount,
      positionAddress: event.log.address,
      pool: "", // Akan diupdate via CreatePosition tracking
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } catch (error) {
    console.error("❌ Error inserting PositionWithdrawCollateral:", error);
  }
});

ponder.on("Position:Liquidate", async ({ event, context }) => {
  const { user } = event.args;

  console.log(`⚠️ Position Liquidation: ${user} got liquidated`);

  try {
    await context.db.insert(schema.Liquidate).values({
      id: `${event.transaction.hash}-${event.log.logIndex}`,
      user: user,
      positionAddress: event.log.address,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      txHash: event.transaction.hash,
      logIndex: event.log.logIndex,
    });
  } catch (error) {
    console.error("❌ Error inserting Liquidate:", error);
  }
});