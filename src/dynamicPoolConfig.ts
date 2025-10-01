export interface DynamicPoolConfig {
  address: string;
  collateralToken: string;
  borrowToken: string;
  ltv: bigint;
  created: bigint;
  routerAddress?: string; // Optional router address
}

export interface DynamicRouterConfig {
  address: string;
  poolAddress: string;
  discoveredAt: bigint;
  isActive: boolean;
}

export interface DynamicPositionConfig {
  address: string;
  user: string;
  pool: string;
  router?: string;
  createdAt: bigint;
  lastActivity: bigint;
  isActive: boolean;
}

// Registry untuk menyimpan pool addresses yang dideteksi
export const dynamicPools: Map<string, DynamicPoolConfig> = new Map();

// Registry untuk menyimpan router addresses yang dideteksi  
export const dynamicRouters: Map<string, DynamicRouterConfig> = new Map();

// Registry untuk menyimpan position addresses yang dideteksi
export const dynamicPositions: Map<string, DynamicPositionConfig> = new Map();

// Pool-Router mapping untuk quick lookup
export const poolToRouter: Map<string, string> = new Map();

// User-Pool-Position mapping
export const userPoolPosition: Map<string, Map<string, string>> = new Map();

// Function untuk menambah pool baru ke registry
export function addDynamicPool(config: DynamicPoolConfig) {
  dynamicPools.set(config.address, config);
  console.log(`📝 Added pool ${config.address} to dynamic registry`);
  
  // Jika ada router, tambahkan ke pool-router mapping
  if (config.routerAddress) {
    poolToRouter.set(config.address, config.routerAddress);
    console.log(`🔗 Mapped pool ${config.address} -> router ${config.routerAddress}`);
  }
}

// Function untuk menambah router baru ke registry
export function addDynamicRouter(config: DynamicRouterConfig) {
  dynamicRouters.set(config.address, config);
  poolToRouter.set(config.poolAddress, config.address);
  console.log(`🤖 Added router ${config.address} for pool ${config.poolAddress} to dynamic registry`);
}

// Function untuk menambah position baru ke registry
export function addDynamicPosition(config: DynamicPositionConfig) {
  dynamicPositions.set(config.address, config);
  
  // Update user-pool-position mapping
  if (!userPoolPosition.has(config.user)) {
    userPoolPosition.set(config.user, new Map());
  }
  userPoolPosition.get(config.user)!.set(config.pool, config.address);
  
  console.log(`📍 Added position ${config.address} for user ${config.user} in pool ${config.pool} to dynamic registry`);
}

// Function untuk mendapatkan semua pool addresses
export function getAllPoolAddresses(): string[] {
  return Array.from(dynamicPools.keys());
}

// Function untuk mendapatkan semua router addresses  
export function getAllRouterAddresses(): string[] {
  return Array.from(dynamicRouters.keys());
}

// Function untuk mendapatkan semua position addresses
export function getAllPositionAddresses(): string[] {
  return Array.from(dynamicPositions.keys());
}

// Function untuk mendapatkan config pool
export function getPoolConfig(address: string): DynamicPoolConfig | undefined {
  return dynamicPools.get(address);
}

// Function untuk mendapatkan config router
export function getRouterConfig(address: string): DynamicRouterConfig | undefined {
  return dynamicRouters.get(address);
}

// Function untuk mendapatkan config position
export function getPositionConfig(address: string): DynamicPositionConfig | undefined {
  return dynamicPositions.get(address);
}

// Function untuk mendapatkan router dari pool address
export function getRouterForPool(poolAddress: string): string | undefined {
  return poolToRouter.get(poolAddress);
}

// Function untuk mendapatkan position address dari user dan pool
export function getPositionForUserPool(userAddress: string, poolAddress: string): string | undefined {
  return userPoolPosition.get(userAddress)?.get(poolAddress);
}

// Function untuk mendapatkan semua positions untuk user
export function getPositionsForUser(userAddress: string): Map<string, string> | undefined {
  return userPoolPosition.get(userAddress);
}

// Function untuk update position activity
export function updatePositionActivity(positionAddress: string, timestamp: bigint) {
  const config = dynamicPositions.get(positionAddress);
  if (config) {
    config.lastActivity = timestamp;
    dynamicPositions.set(positionAddress, config);
    console.log(`⏰ Updated last activity for position ${positionAddress}`);
  }
}

// Function untuk deactivate position
export function deactivatePosition(positionAddress: string) {
  const config = dynamicPositions.get(positionAddress);
  if (config) {
    config.isActive = false;
    dynamicPositions.set(positionAddress, config);
    console.log(`❌ Deactivated position ${positionAddress}`);
  }
}

// Function untuk mendapatkan summary registry
export function getRegistrySummary() {
  return {
    totalPools: dynamicPools.size,
    totalRouters: dynamicRouters.size,
    totalPositions: dynamicPositions.size,
    activePositions: Array.from(dynamicPositions.values()).filter(p => p.isActive).length,
    poolRouterMappings: poolToRouter.size,
    uniqueUsers: userPoolPosition.size,
  };
}

// Function untuk export registry data (untuk debugging)
export function exportRegistryData() {
  return {
    pools: Object.fromEntries(dynamicPools),
    routers: Object.fromEntries(dynamicRouters),
    positions: Object.fromEntries(dynamicPositions),
    poolToRouter: Object.fromEntries(poolToRouter),
    userPoolPosition: Object.fromEntries(
      Array.from(userPoolPosition.entries()).map(([user, pools]) => [
        user,
        Object.fromEntries(pools)
      ])
    ),
  };
}
