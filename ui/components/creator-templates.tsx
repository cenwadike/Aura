"use client"

import { useState, useEffect } from "react"
import { Package, Users, DollarSign, Plus } from "lucide-react"
import type { CreatorTemplatesProps, Template } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export function CreatorTemplates({ address, refreshTrigger = 0 }: CreatorTemplatesProps) {
    const [templates, setTemplates] = useState<Template[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true)

            try {
                const res = await fetch(`${API_BASE_URL}/user-templates?userAddress=${address}`)

                if (!res.ok) {
                    throw new Error("Failed to fetch templates")
                }

                const data = await res.json()
                const templateIds = data.templates || []

                // Fetch details for each template
                const templateDetails = await Promise.all(
                    templateIds.map(async (id: number) => {
                        try {
                            const templateRes = await fetch(`${API_BASE_URL}/template?templateId=${id}`)
                            if (!templateRes.ok) return null
                            return await templateRes.json()
                        } catch {
                            return null
                        }
                    }),
                )

                const validTemplates = templateDetails
                    .filter((t): t is Template => t !== null)
                    .map((t) => ({
                        id: t.id,
                        name: t.name,
                        behavior: t.behavior,
                        creator: t.creator,
                        createdAt: t.createdAt,
                    }))

                setTemplates(validTemplates)
            } catch (err) {
                console.error("Error fetching templates:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchTemplates()
    }, [address, refreshTrigger])

    if (isLoading) {
        return (
            <div>
                <h2 className="text-2xl font-bold text-white mb-6">Your Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 animate-pulse">
                            <div className="h-6 bg-gray-800 rounded w-32 mb-4" />
                            <div className="h-4 bg-gray-800 rounded w-24 mb-2" />
                            <div className="h-4 bg-gray-800 rounded w-16" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (templates.length === 0) {
        return (
            <div>
                <h2 className="text-2xl font-bold text-white mb-6">Your Templates</h2>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Templates Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first AI avatar template and start earning 70% revenue share</p>
                    <button className="px-6 py-3 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Templates</h2>
                <div className="flex items-center gap-2 text-gray-400">
                    <Package className="w-5 h-5" />
                    <span className="text-sm font-medium">
                        {templates.length} Template{templates.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-violet-500/30 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-300 transition-colors">
                                    {template.name}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium">
                                        {template.behavior}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-gray-800">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Instances
                                </span>
                                <span className="text-gray-300 font-medium">-</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Revenue
                                </span>
                                <span className="text-emerald-400 font-medium">$0.00</span>
                            </div>
                        </div>

                        <div className="mt-4 text-xs text-gray-500">
                            Created {new Date(template.createdAt * 1000).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
