"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
import { createPublicClient, http } from "viem"
import { avalancheFuji } from "wagmi/chains"
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract"
import { AvatarCard } from "./avatar-card"
import type { Avatar } from "@/types"
import { Loader2 } from "lucide-react"

interface MyAvatarsSectionProps {
  onInteract: (avatarId: number, templateName: string) => void
  refreshTrigger: number
}

export function MyAvatarsSection({ onInteract, refreshTrigger }: MyAvatarsSectionProps) {
  const { address, isConnected } = useAccount()
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      loadUserAvatars()
    }
  }, [isConnected, address, refreshTrigger])

  const loadUserAvatars = async () => {
    if (!address) return

    setLoading(true)
    try {
      const client = createPublicClient({
        chain: avalancheFuji,
        transport: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
      })

      const avatarIds = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getUserAvatars",
        args: [address],
      })

      if (avatarIds.length === 0) {
        setAvatars([])
        return
      }

      const loadedAvatars: Avatar[] = await Promise.all(
        avatarIds.map(async (id) => {
          const state = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getState",
            args: [address, id],
          })

          const template = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getTemplate",
            args: [state.templateId],
          })

          return {
            id: Number(state.avatarId),
            sessionId: Number(state.sessionId),
            templateId: Number(state.templateId),
            templateName: template.name,
            dialogue: state.dialogue || "No interactions yet",
            behavior: state.behavior,
            lastInteraction: Number(state.lastInteraction),
          }
        }),
      )

      setAvatars(loadedAvatars)
    } catch (error) {
      console.error("Failed to load avatars:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) return null

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-5">
        <h2 className="text-center text-3xl font-bold text-white mb-12">My Avatars</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-violet-500" />
            <p>Loading your avatars...</p>
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>You haven&apos;t created any avatars yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {avatars.map((avatar) => (
              <AvatarCard key={avatar.id} avatar={avatar} onInteract={onInteract} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
