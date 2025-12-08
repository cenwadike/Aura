"use client"

import { http, createConfig, createStorage, cookieStorage } from "wagmi"
import { avalancheFuji } from "wagmi/chains"
import { injected } from "wagmi/connectors"

export const config = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [avalancheFuji.id]: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
  },
})

export { avalancheFuji }
