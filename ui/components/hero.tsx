"use client"

import { useAccount } from "wagmi"
import { ExternalLink } from "lucide-react"

interface HeroProps {
  onCreateTemplate: () => void
}

export function Hero({ onCreateTemplate }: HeroProps) {
  const { isConnected } = useAccount()

  return (
    <section className="text-center py-16">
      <div className="max-w-7xl mx-auto px-5">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-violet-400 via-pink-500 to-blue-400 bg-clip-text text-transparent">
          Build & Monetize AI Avatars on Avalanche
        </h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
          Aura provides infrastructure for creating dynamic AI personalities with verifiable on-chain state and
          automated micropayments via x402.
        </p>
        <div className="flex gap-4 justify-center mb-12 flex-wrap">
          <button
            onClick={onCreateTemplate}
            disabled={!isConnected}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Template
          </button>
          <a
            href="https://github.com/cenwadike/Aura"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 flex items-center gap-2"
          >
            View GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              &lt;200ms
            </div>
            <div className="text-gray-400 mt-1">Finality</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              70%
            </div>
            <div className="text-gray-400 mt-1">Creator Revenue</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              $0.001
            </div>
            <div className="text-gray-400 mt-1">Per Interaction</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              100%
            </div>
            <div className="text-gray-400 mt-1">Uptime</div>
          </div>
        </div>
      </div>
    </section>
  )
}
