import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";
import { LendingPoolRouterAbi } from "./abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "./abis/PositionAbi";

const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT ) {
    
    return {
      kind: "postgres" as const,
      connectionString: connectionString,
      schema: process.env.DATABASE_SCHEMA || "public",
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
    : {
      id: ,
      rpc: "",
    },
  },
  contracts: {
    // Factory contract
    LendingPoolFactory: {
      chain: "",
      abi: LendingPoolFactoryAbi,
      address: "",
      startBlock: 195725118,
      includeTransactionReceipts: true,
    },
    // Dynamic pool
    LendingPool: {
      chain: "",
      abi: LendingPoolAbi,
      address: factory({
        address: "0xa971CD2714fbCc9A942b09BC391a724Df9338206",
        event: parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)"),
        parameter: "lendingPool",
      }),
      startBlock: ,
      includeTransactionReceipts: true,
    },
    // Dynamic Position addresses - menggunakan multiple pool addresses sebagai factories
    Position: {
      chain: "", 
      abi: PositionAbi,
      address: factory({
        // Multiple factories: semua pool addresses yang ada bisa menjadi factory untuk Position
        address: [
          "", // Pool address 1
          "", // Pool address 2
          // Pool addresses baru akan ditambahkan secara manual di sini setelah ditemukan
        ],
        event: parseAbiItem("event CreatePosition(address user, address positionAddress)"),
        parameter: "positionAddress",
      }),
      startBlock: ,
      includeTransactionReceipts: true,
    },
    // LendingPoolRouter - router addresses yang ditemukan dari pools
    LendingPoolRouter: {
      chain: "",
      abi: LendingPoolRouterAbi,
      address: [

      ],
      startBlock: ,
      includeTransactionReceipts: true,
    },
  },
});