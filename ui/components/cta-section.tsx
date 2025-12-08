"use client"

import { useAccount } from "wagmi"
import { ExternalLink } from "lucide-react"

interface CTASectionProps {
  onCreateTemplate: () => void
}

export function CTASection({ onCreateTemplate }: CTASectionProps) {
  const { isConnected } = useAccount()

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-5">
        <div className="bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Ready to Build?</h3>
          <p className="text-xl text-white/90 mb-8">Start creating dynamic AI avatars with Aura today.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={onCreateTemplate}
              disabled={!isConnected}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-white text-violet-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Started
            </button>
            <a
              href="https://github.com/cenwadike/aura"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-white/10 text-white border border-white/30 hover:bg-white/20 flex items-center gap-2"
            >
              Read Documentation
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
