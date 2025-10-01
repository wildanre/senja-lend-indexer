import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";
import { LendingPoolRouterAbi } from "./abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "./abis/PositionAbi";
import { loadPositionAddressesFromChain } from "./src/helpers/positionAddressLoader";

// ========== EXPORTED CONSTANTS FOR REUSABILITY ==========
export const HELPER_CONTRACT_ADDRESS = "0x03e7669B2e85CB7C61Af39307D79390B79c3aB7B";
export const FACTORY_ADDRESS = "0xa971CD2714fbCc9A942b09BC391a724Df9338206";
export const START_BLOCK = 196049435;

// Chain configuration
export const CHAIN_CONFIG = {
  id: 8453,
  rpc: [
    "https://rpc.ankr.com/kaia",
    "https://1rpc.io/klay",
  ],
  maxRequestsPerSecond: 10,
};

// Event signature untuk LendingPoolCreated
export const LENDING_POOL_CREATED_EVENT = parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)");

// Event signature untuk CreatePosition
export const CREATE_POSITION_EVENT = parseAbiItem("event CreatePosition(address user, address positionAddress)");

const getDatabaseConfig = () => {
  // Ambil connection string dari environment variable
  const connectionString = process.env.DATABASE_URL;
  
  // Untuk Railway/production, pastikan gunakan direct connection
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT ) {
    
    return {
      kind: "postgres" as const,
      connectionString: connectionString,
      schema: process.env.DATABASE_SCHEMA || "public",
      // Tambahkan konfigurasi pool untuk write access
      poolConfig: {
        max: 10,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
    };
  }
  
  // local development using pglite
  return {
    kind: "pglite" as const,
  };
};

export default createConfig({
  database: getDatabaseConfig(),
  chains: {
    kaia: CHAIN_CONFIG,
  },
  contracts: {
    // Factory contract untuk membuat pools secara dinamis
    LendingPoolFactory: {
      chain: "kaia",
      abi: LendingPoolFactoryAbi,
      address: FACTORY_ADDRESS,
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },
    // Dynamic pool addresses menggunakan factory pattern - pools akan ditemukan otomatis
    LendingPool: {
      chain: "kaia",
      abi: LendingPoolAbi,
      address: factory({
        address: FACTORY_ADDRESS,
        event: LENDING_POOL_CREATED_EVENT,
        parameter: "lendingPool",
      }),
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },
    // Position contracts - akan di-discover secara dinamis via CreatePosition event
    // Note: Ponder tidak support nested factory, jadi Position akan di-track via helper
    Position: {
      chain: "kaia", 
      abi: PositionAbi,
      address: [], // Akan di-populate oleh positionHelpers
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },
  },
});