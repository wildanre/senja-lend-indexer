import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";
import { LendingPoolRouterAbi } from "./abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "./abis/PositionAbi";
import { loadPositionAddressesFromChain } from "./src/helpers/positionAddressLoader";

// export const HELPER_CONTRACT_ADDRESS = "0xad15249b77d9Bf9a02401b8122FC763fD7391329";
export const FACTORY_ADDRESS = "0x42C5dFc5899160e9c4e2E139AfFe7472dDf4D86E";
export const START_BLOCK = 37135186;

// base
// export const HELPER_CONTRACT_ADDRESS = "0x3870bFD5820994a560E3F1D9c98c7740D9E007B8";
// export const FACTORY_ADDRESS = "0xa971CD2714fbCc9A942b09BC391a724Df9338206";
// export const START_BLOCK = 198845191;


export const CHAIN_CONFIG = {
  id: 8453,
  rpc: [
    "https://api.zan.top/base-mainnet",
  ],
};


export const LENDING_POOL_CREATED_EVENT = parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)");


export const CREATE_POSITION_EVENT = parseAbiItem("event CreatePosition(address user, address positionAddress)");

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
  
  return {
    kind: "pglite" as const,
  };
};

export default createConfig({
  database: getDatabaseConfig(),
  chains: {
    base: CHAIN_CONFIG,
  },
  contracts: {
    LendingPoolFactory: {
      chain: "base",
      abi: LendingPoolFactoryAbi,
      address: FACTORY_ADDRESS,
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },

    LendingPool: {
      chain: "base",
      abi: LendingPoolAbi,
      address: factory({
        address: FACTORY_ADDRESS,
        event: LENDING_POOL_CREATED_EVENT,
        parameter: "lendingPool",
      }),
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },
    Position: {
      chain: "base", 
      abi: PositionAbi,
      address: [],
      startBlock: START_BLOCK,
      includeTransactionReceipts: true,
    },
  },
});