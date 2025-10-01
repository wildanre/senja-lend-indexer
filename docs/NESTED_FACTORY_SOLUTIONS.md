# 🏗️ Solusi Nested Factory Pattern untuk Ponder

## Masalah: Ponder Factory Limitation

Ponder hanya mendukung **single-layer factory pattern**:
```
✅ Factory → LendingPool (SUPPORTED)
❌ Factory → LendingPool → Position (NOT SUPPORTED)
❌ Factory → LendingPool → Router (NOT SUPPORTED)
```

## 🎯 Solusi yang Tersedia

### Solusi 1: Event-Driven Manual Tracking ⭐ (RECOMMENDED)

Karena Ponder tidak bisa auto-discover nested contracts, kita track secara manual via events:

```typescript
// 1. LendingPool creates Position via CreatePosition event
// 2. Handler detects new Position address  
// 3. Manually track Position events via RPC calls
// 4. Store Position data dalam database normal

ponder.on("LendingPool:CreatePosition", async ({ event, context }) => {
  const positionAddress = event.args.positionAddress;
  
  // Store position info untuk manual tracking
  await context.db.insert(schema.DynamicRegistry).values({
    id: `position-${positionAddress}`,
    address: positionAddress,
    relatedAddress: event.log.address, // parent pool
    entityType: "position",
    // ...
  });
  
  // Start manual tracking untuk position ini
  startManualPositionTracking(positionAddress);
});
```

### Solusi 2: Multiple Factory Configs

Buat separate factory untuk setiap level:

```typescript
// ponder.config.ts
contracts: {
  // Level 1: LendingPool from Factory
  LendingPool: {
    address: factory({
      address: "0x5a28...", // Factory address
      event: parseAbiItem("event LendingPoolCreated(...)"),
      parameter: "lendingPool",
    }),
  },
  
  // Level 2: Position contracts (static list for now)
  Position: {
    address: [
      // Manually maintained list of Position addresses
      // Updated via script atau manual discovery
    ],
  },
}
```

### Solusi 3: Hybrid Pattern (Best of Both)

Kombinasi factory + manual tracking:

```typescript
// 1. Use factory untuk LendingPool (auto-discovery)
// 2. Use manual tracking untuk Position/Router
// 3. Periodic script untuk discover new contracts
// 4. Update config secara programmatic
```

## 🛠️ Implementation Strategy

### Step 1: Simplify Factory Config

```typescript
// Focus pada 1 layer factory saja
contracts: {
  LendingPoolFactory: {
    // Factory contract
  },
  LendingPool: {
    // Auto-discovered pools
    address: factory({ ... }),
  },
  // Remove Position & Router dari factory
}
```

### Step 2: Manual Contract Discovery

```typescript
// Script untuk discover Position/Router addresses
const discoverNestedContracts = async () => {
  // 1. Query all LendingPool addresses
  const pools = await getLendingPools();
  
  // 2. Check CreatePosition events dari each pool
  for (const pool of pools) {
    const positions = await getPositionsForPool(pool);
    // 3. Add to tracking system
  }
}
```

### Step 3: Event Aggregation

```typescript
// Aggregate Position/Router events ke pool level
ponder.on("LendingPool:CreatePosition", async ({ event }) => {
  // Track position creation
  // Store untuk manual polling later
});

// Separate service untuk poll Position events
// dan aggregate ke LendingPool data
```

## 🎯 Recommended Approach untuk Project Anda

### Option A: Simplify Architecture (Fastest)
```typescript
// 1. Only track LendingPool events via factory
// 2. Skip Position/Router dynamic tracking
// 3. Focus pada pool-level metrics
// 4. Manual dashboard untuk position details
```

### Option B: Manual Discovery Script (Most Flexible)
```typescript
// 1. Keep LendingPool factory
// 2. Build script untuk discover Position/Router
// 3. Update Ponder config dengan discovered addresses
// 4. Restart Ponder when new contracts found
```

### Option C: Hybrid Real-time (Most Complex)
```typescript
// 1. LendingPool via factory (real-time)
// 2. Position/Router via manual RPC polling
// 3. Store nested events dalam custom tables
// 4. Aggregate data untuk queries
```

## 🚀 Quick Implementation

Untuk implementasi cepat, saya recommend **Option A** dulu:

1. **Disable Position/Router factory** di config
2. **Focus pada LendingPool events** yang important
3. **Manual tracking** untuk Position yang critical
4. **Upgrade later** when needed

Mau saya implement Option A dulu untuk fix current issue dan stabilkan system?