"use client"

import { create } from "zustand"
import type { Address } from "viem"

interface WalletStore {
  address: Address | null
  isConnected: boolean
  setAddress: (address: Address | null) => void
  setIsConnected: (connected: boolean) => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  address: null,
  isConnected: false,
  setAddress: (address) => set({ address, isConnected: !!address }),
  setIsConnected: (isConnected) => set({ isConnected }),
}))
