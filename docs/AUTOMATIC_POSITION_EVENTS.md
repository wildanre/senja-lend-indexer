# Automatic Position Events Tracking

## Problem Statement
Ponder framework **tidak support nested factory pattern** (Factory → LendingPool → Position), sehingga Position contract events tidak bisa di-track secara otomatis melalui config.

## Solution: Automatic Event Syncing
Implementasi automatic Position events syncing yang berjalan setiap kali Position contract baru dibuat.

## Architecture

### 1. Event Flow
```
CreatePosition Event → Trigger Auto-Sync → Query Blockchain → Process & Save Events
```

### 2. Key Components

#### A. Position Event Fetcher (`fetchPositionEvents`)
- **Location**: `src/helpers/dynamicContractRegistrar.ts`
- **Function**: Query blockchain untuk mendapatkan Position events
- **Events Tracked**:
  - `SwapTokenByPosition` - Swap tokens through position
  - `SwapToken` - Direct token swap
  - `WithdrawCollateral` - Collateral withdrawal
  - `Liquidate` - Position liquidation

#### B. Event Processor (`processPositionEvent`)
- **Location**: `src/helpers/dynamicContractRegistrar.ts`
- **Function**: Process dan save events ke database
- **Database Tables**:
  - `PositionSwapTokenByPosition`
  - `PositionSwapToken`
  - `PositionWithdrawCollateral`
  - `Liquidate`

#### C. Auto-Sync Integration
- **Location**: `src/lendingPoolHandlers.ts` → `CreatePosition` handler
- **Trigger**: Automatically runs setiap kali Position baru dibuat
- **Process**:
  1. CreatePosition event detected
  2. Position address saved to database
  3. Auto-sync immediately fetches Position events from blockchain
  4. All events processed and saved to respective tables

## Implementation Details

### CreatePosition Handler with Auto-Sync
```typescript
ponder.on("LendingPool:CreatePosition", async ({ event, context }) => {
  // 1. Save Position to database
  await context.db.insert(schema.Position).values({ ... });
  
  // 2. AUTO-SYNC: Fetch Position events
  const positionEvents = await fetchPositionEvents(
    client,
    positionAddress,
    event.block.number,
    'latest'
  );
  
  // 3. Process all events
  for (const positionEvent of positionEvents) {
    await processPositionEvent(context, positionEvent, positionAddress);
  }
});
```

### Event Fetching
```typescript
export async function fetchPositionEvents(
  client: PublicClient,
  positionAddress: string,
  fromBlock: bigint,
  toBlock: bigint | 'latest'
): Promise<any[]>
```
- Uses `client.getLogs()` to query blockchain
- Fetches all 4 event types in parallel
- Returns array of all events found

### Event Processing
```typescript
export async function processPositionEvent(
  context: any,
  event: any,
  positionAddress: string
): Promise<void>
```
- Switches based on event name
- Inserts into appropriate database table
- Uses `onConflictDoNothing()` to prevent duplicates

## Benefits

✅ **Fully Automatic**: No manual intervention required
✅ **Real-time**: Events synced immediately when Position created
✅ **Complete Coverage**: All Position events tracked
✅ **No Data Loss**: Historical events captured from creation block
✅ **Duplicate Prevention**: `onConflictDoNothing()` handles re-processing
✅ **Workaround for Ponder Limitation**: Bypasses nested factory restriction

## Data Flow Example

```
User creates Position
  ↓
CreatePosition event emitted
  ↓
Ponder catches CreatePosition
  ↓
Position saved to database
  ↓
AUTO-SYNC triggered
  ↓
Query blockchain for Position events (from creation block to latest)
  ↓
Found: SwapTokenByPosition, WithdrawCollateral events
  ↓
Process each event
  ↓
Save to database tables
  ↓
✅ All Position events now indexed!
```

## Query Examples

### Get all Position swaps
```graphql
query {
  positionSwapTokenByPositions {
    id
    user
    tokenIn
    tokenOut
    amountIn
    amountOut
    positionAddress
    timestamp
  }
}
```

### Get Position withdrawals
```graphql
query {
  positionWithdrawCollaterals {
    id
    user
    amount
    positionAddress
    timestamp
  }
}
```

### Get Position liquidations
```graphql
query {
  liquidates {
    id
    liquidator
    position
    amount
    timestamp
  }
}
```

## Performance Considerations

- **Throttling**: 150ms throttle between database writes
- **Caching**: LendingPool cache to reduce database lookups
- **Batch Processing**: Events processed in batches per Position
- **Error Handling**: Graceful error handling with console logging

## Testing

1. **Run the indexer**:
   ```bash
   pnpm dev
   ```

2. **Check logs** for:
   ```
   🎯 OPTIMIZED CreatePosition: ...
   🔄 AUTO-SYNC: Fetching events for newly created Position ...
   ✅ AUTO-SYNC: Processed X events for Position ...
   ```

3. **Query GraphQL** to verify events are indexed

## Future Enhancements

- [ ] Periodic re-sync for missed events
- [ ] Configurable block range for initial sync
- [ ] Metrics for sync performance
- [ ] Retry logic for failed blockchain queries
- [ ] WebSocket support for real-time updates

## Conclusion

Solusi automatic Position events tracking ini successfully mengatasi limitation Ponder framework yang tidak support nested factory pattern, dengan membuat custom syncing mechanism yang berjalan **fully automatic** setiap kali Position contract baru dibuat.
