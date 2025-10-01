export const helperAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_factory",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAPY",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "supplyAPY",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "borrowAPY",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "utilizationRate",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBorrowAPY",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "borrowAPY",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCollateralBalance",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "collateralBalance",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getExchangeRate",
    inputs: [
      {
        name: "_tokenIn",
        type: "address",
        internalType: "address",
      },
      {
        name: "_tokenOut",
        type: "address",
        internalType: "address",
      },
      {
        name: "_amountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_position",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFee",
    inputs: [
      {
        name: "_oftAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "_dstEid",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "_toAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "_tokensToSend",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHealthFactor",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLendingPoolMetrics",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "supplyAPY",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "borrowAPY",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "utilizationRate",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalSupplyAssets",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalBorrowAssets",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMaxBorrowAmount",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
      {
        name: "_user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRouter",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSupplyAPY",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "supplyAPY",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenValue",
    inputs: [
      {
        name: "_token",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTotalLiquidity",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "totalLiquidity",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUtilizationRate",
    inputs: [
      {
        name: "_lendingPool",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "utilizationRate",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setFactory",
    inputs: [
      {
        name: "_factory",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "InvalidOptionType",
    inputs: [
      {
        name: "optionType",
        type: "uint16",
        internalType: "uint16",
      },
    ],
  },
  {
    type: "error",
    name: "SafeCastOverflowedUintDowncast",
    inputs: [
      {
        name: "bits",
        type: "uint8",
        internalType: "uint8",
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
] as const;