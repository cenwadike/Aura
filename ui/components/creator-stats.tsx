"use client"

import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Clock } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface CreatorStatsProps {
    address: string
}

interface CreatorBalance {
    address: string
    pendingUSDC: string
    totalEarnedUSDC: string
    thresholdUSDC: string
    thresholdReached: boolean
    progressPercent: string
    lastPayout: string | null
}

export function CreatorStats({ address }: CreatorStatsProps) {
    const [stats, setStats] = useState<CreatorBalance | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Fixed fetch syntax - use backticks correctly
                const res = await fetch(`${API_BASE_URL}/creator-balance?creator=${address}`)

                if (!res.ok) {
                    if (res.status === 404) {
                        // No earnings yet - this is normal for new creators
                        setStats(null)
                        setError(null)
                        return
                    }
                    throw new Error("Failed to fetch creator stats")
                }

                const data = await res.json()
                setStats(data)
            } catch (err) {
                console.error("Error fetching creator stats:", err)
                setError("Unable to load stats")
            } finally {
                setIsLoading(false)
            }
        }

        if (address) {
            fetchStats()
        }
    }, [address])

    if (isLoading) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Creator Earnings</h3>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-800 rounded w-24 mb-2" />
                            <div className="h-6 bg-gray-800 rounded w-32" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-gray-900/50 border border-red-900/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Stats</h3>
                <p className="text-gray-400 text-sm">{error}</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Creator Earnings</h3>
                <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No earnings yet</p>
                    <p className="text-gray-500 text-xs mt-2">
                        Start earning when users interact with your templates
                    </p>
                </div>
            </div>
        )
    }

    const progressValue = parseFloat(stats.progressPercent.replace('%', ''))

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-violet-400" />
                Creator Earnings
            </h3>

            <div className="space-y-6">
                {/* Pending Balance */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Pending Balance</span>
                        {stats.thresholdReached && (
                            <span className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                                Ready for Payout
                            </span>
                        )}
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                        ${parseFloat(stats.pendingUSDC).toFixed(4)} USDC
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress to payout</span>
                            <span>{stats.progressPercent}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${stats.thresholdReached
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                    : 'bg-gradient-to-r from-violet-500 to-pink-500'
                                    }`}
                                style={{ width: `${Math.min(progressValue, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum payout: ${stats.thresholdUSDC} USDC
                        </p>
                    </div>
                </div>

                {/* Total Earned */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Total Earned
                    </div>
                    <div className="text-2xl font-semibold text-gray-300">
                        ${parseFloat(stats.totalEarnedUSDC).toFixed(4)} USDC
                    </div>
                </div>

                {/* Last Payout */}
                {stats.lastPayout && (
                    <div className="pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                            <Clock className="w-4 h-4" />
                            Last Payout
                        </div>
                        <div className="text-sm text-gray-300">
                            {new Date(stats.lastPayout).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                )}

                {/* Revenue Info */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                        <p className="text-xs text-violet-300 font-medium">
                            💡 You earn 70% of all revenue from your templates
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
