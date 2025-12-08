"use client"

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { avalancheFuji } from "@/lib/wagmi"
import { useAuraToast } from "@/hooks/use-aura-toast"
import { Zap, ExternalLink } from "lucide-react"

export function Header() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { showToast } = useAuraToast()

  const handleConnect = async () => {
    try {
      connect(
        { connector: injected() },
        {
          onSuccess: () => {
            showToast("Wallet connected!", "success")
          },
          onError: (error) => {
            console.error(error)
            showToast("Failed to connect wallet", "error")
          },
        },
      )
    } catch (error) {
      console.error(error)
      showToast("Failed to connect wallet", "error")
    }
  }

  const handleSwitchChain = () => {
    switchChain(
      { chainId: avalancheFuji.id },
      {
        onSuccess: () => {
          showToast("Switched to Avalanche Fuji", "success")
        },
        onError: () => {
          showToast("Failed to switch network", "error")
        },
      },
    )
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""

  const isWrongNetwork = isConnected && chain?.id !== avalancheFuji.id

  return (
    <header className="border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-pink-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Aura AI</h1>
              <p className="text-xs text-gray-400">Web3 AI Avatars</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            {isWrongNetwork ? (
              <button
                onClick={handleSwitchChain}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-amber-600 hover:bg-amber-500 text-white"
              >
                Switch to Fuji
              </button>
            ) : isConnected ? (
              <button
                onClick={() => disconnect()}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,185,129,0.4)]"
              >
                {shortAddress}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] disabled:opacity-50"
              >
                {isPending ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
            <a
              href="https://github.com/cenwadike/Aura"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 flex items-center gap-2"
            >
              Docs
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
