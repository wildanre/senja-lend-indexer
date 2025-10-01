import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";
import { LendingPoolRouterAbi } from "./abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "./abis/PositionAbi";

// Helper contract address - sesuaikan dengan deployment sebenarnya
export const HELPER_CONTRACT_ADDRESS = process.env.HELPER_CONTRACT_ADDRESS || "0xad15249b77d9Bf9a02401b8122FC763fD7391329";

// Import dynamic discovery (akan digunakan saat runtime)
// Tidak bisa digunakan langsung di config karena async, tapi akan digunakan dalam handlers

// Konfigurasi database berdasarkan environment
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
    kaia: {
      id: 8453,
      rpc: [
        "https://base-mainnet.g.alchemy.com/v2/_wCzLF-DIaJBtb1jRS1FD6U0cE7OA5XP",
        "https://base-mainnet.g.alchemy.com/v2/MyhHgv4SpAdOcDQzsGQTZ",
      ],
      maxRequestsPerSecond: 10,
      pollingInterval: 5000, // 5 seconds instead of default 2 seconds
    },
  },
  contracts: {
    // Factory contract untuk membuat pools secara dinamis
    LendingPoolFactory: {
      chain: "kaia",
      abi: LendingPoolFactoryAbi,
      address: "0x5a28316959551dA618F84070FfF70B390270185C",
      startBlock: 35929846,
      includeTransactionReceipts: true,
    },
    // Dynamic pool addresses menggunakan factory pattern - pools akan ditemukan otomatis
    LendingPool: {
      chain: "kaia",
      abi: LendingPoolAbi,
      address: factory({
        address: "0x5a28316959551dA618F84070FfF70B390270185C",
        event: parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)"),
        parameter: "lendingPool",
      }),
      startBlock: 35929846,
      includeTransactionReceipts: true,
    },
  },
});