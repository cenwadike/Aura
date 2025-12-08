export const CONTRACT_ADDRESS = "0xBFB3A037b8109fbC07e950dA44F1E51b5d0Fa424"

export const CONTRACT_ABI = [
  {
    name: "createTemplate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "baseBehavior", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTemplate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "templateId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "templateId", type: "uint256" },
          { name: "name", type: "string" },
          { name: "baseBehavior", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "getUserAvatars",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getState",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "avatarId", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "avatarId", type: "uint256" },
          { name: "sessionId", type: "uint256" },
          { name: "templateId", type: "uint256" },
          { name: "dialogue", type: "string" },
          { name: "behavior", type: "string" },
          { name: "lastInteraction", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "TemplateCreated",
    type: "event",
    inputs: [
      { name: "templateId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "baseBehavior", type: "string", indexed: false },
    ],
  },
] as const

export const RPC_URL = "https://avalanche-fuji-c-chain-rpc.publicnode.com"
