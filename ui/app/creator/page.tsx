"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { Header } from "@/components/header"
import { CreatorStats } from "@/components/creator-stats"
import { CreatorTemplates } from "@/components/creator-templates"
import { CreateTemplateModal } from "@/components/create-template-modal"
import { ToastContainer } from "@/components/toast-container"
import { useAuraToast } from "@/hooks/use-aura-toast"
import { TrendingUp, Wallet, Sparkles } from "lucide-react"
import Link from "next/link"

export default function CreatorDashboard() {
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const { address, isConnected } = useAccount()
    const { showToast } = useAuraToast()

    const handleTemplateCreated = () => {
        showToast("Template created successfully!", "success")
        setRefreshTrigger((prev) => prev + 1)
        setCreateModalOpen(false)
    }

    if (!isConnected) {
        return (
            <main className="min-h-screen bg-[#0a0a0f] text-gray-200">
                <Header />
                <div className="max-w-7xl mx-auto px-5 py-20">
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-pink-500 rounded-full flex items-center justify-center">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white text-center">Connect Wallet to Access Dashboard</h2>
                        <p className="text-gray-400 text-center max-w-md">
                            Connect your wallet to view your creator stats, manage templates, and track earnings
                        </p>
                    </div>
                </div>
                <ToastContainer />
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#0a0a0f] text-gray-200">
            <Header />

            {/* Hero Section */}
            <section className="relative overflow-hidden border-b border-gray-800">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 via-transparent to-transparent" />
                <div className="max-w-7xl mx-auto px-5 py-16 relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-pink-500 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold text-white">Creator Dashboard</h1>
                                    <p className="text-gray-400 mt-1">Monetize your AI templates on Web3</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <div className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                                    <span className="text-violet-300 text-sm font-medium">70% Revenue Share</span>
                                </div>
                                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <span className="text-emerald-300 text-sm font-medium">Paid in USDC</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/"
                                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
                            >
                                Back to Home
                            </Link>
                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] flex items-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Create Template
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="max-w-7xl mx-auto px-5 py-12">
                <CreatorStats address={address!} />
            </section>

            {/* Templates Section */}
            <section className="max-w-7xl mx-auto px-5 pb-16">
                <CreatorTemplates address={address!} refreshTrigger={refreshTrigger} />
            </section>

            <CreateTemplateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
            <ToastContainer />
        </main>
    )
}
