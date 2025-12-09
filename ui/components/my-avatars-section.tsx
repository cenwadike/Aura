// "use client"

// import { useEffect, useState } from "react"
// import { useAccount } from "wagmi"
// import { createPublicClient, http } from "viem"
// import { avalancheFuji } from "wagmi/chains"
// import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract"
// import { AvatarCard } from "./avatar-card"
// import type { Avatar } from "@/types"
// import { Loader2 } from "lucide-react"

// interface MyAvatarsSectionProps {
//   onInteract: (avatarId: number, templateName: string) => void
//   refreshTrigger: number
// }

// export function MyAvatarsSection({ onInteract, refreshTrigger }: MyAvatarsSectionProps) {
//   const { address, isConnected } = useAccount()
//   const [avatars, setAvatars] = useState<Avatar[]>([])
//   const [loading, setLoading] = useState(false)

//   useEffect(() => {
//     if (isConnected && address) {
//       loadUserAvatars()
//     }
//   }, [isConnected, address, refreshTrigger])

//   const loadUserAvatars = async () => {
//     if (!address) return

//     setLoading(true)
//     try {
//       const client = createPublicClient({
//         chain: avalancheFuji,
//         transport: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
//       })

//       const avatarIds = await client.readContract({
//         address: CONTRACT_ADDRESS,
//         abi: CONTRACT_ABI,
//         functionName: "getUserAvatars",
//         args: [address],
//       })

//       if (avatarIds.length === 0) {
//         setAvatars([])
//         return
//       }

//       const loadedAvatars: Avatar[] = await Promise.all(
//         avatarIds.map(async (id) => {
//           const state = await client.readContract({
//             address: CONTRACT_ADDRESS,
//             abi: CONTRACT_ABI,
//             functionName: "getState",
//             args: [address, id],
//           })

//           const template = await client.readContract({
//             address: CONTRACT_ADDRESS,
//             abi: CONTRACT_ABI,
//             functionName: "getTemplate",
//             args: [state.templateId],
//           })

//           return {
//             id: Number(state.avatarId),
//             sessionId: Number(state.sessionId),
//             templateId: Number(state.templateId),
//             templateName: template.name,
//             dialogue: state.dialogue || "No interactions yet",
//             behavior: state.behavior,
//             lastInteraction: Number(state.lastInteraction),
//           }
//         }),
//       )

//       setAvatars(loadedAvatars)
//     } catch (error) {
//       console.error("Failed to load avatars:", error)
//     } finally {
//       setLoading(false)
//     }
//   }

//   if (!isConnected) return null

//   return (
//     <section className="py-16">
//       <div className="max-w-7xl mx-auto px-5">
//         <h2 className="text-center text-3xl font-bold text-white mb-12">My Avatars</h2>

//         {loading ? (
//           <div className="text-center py-12 text-gray-500">
//             <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-violet-500" />
//             <p>Loading your avatars...</p>
//           </div>
//         ) : avatars.length === 0 ? (
//           <div className="text-center py-12 text-gray-500">
//             <p>You haven&apos;t created any avatars yet</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {avatars.map((avatar) => (
//               <AvatarCard key={avatar.id} avatar={avatar} onInteract={onInteract} />
//             ))}
//           </div>
//         )}
//       </div>
//     </section>
//   )
// }


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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && address) {
      loadUserAvatars()
    } else {
      setAvatars([])
    }
  }, [isConnected, address, refreshTrigger])

  const loadUserAvatars = async () => {
    if (!address) return

    setLoading(true)
    setError(null)

    try {
      const client = createPublicClient({
        chain: avalancheFuji,
        transport: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
      })

      console.log("[MyAvatars] Fetching avatars for:", address)

      // Get avatar IDs
      const avatarIds = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getUserAvatars",
        args: [address],
      }) as bigint[]


      console.log("[MyAvatars] Avatar count:", avatarIds.length.toString())

      console.log("[MyAvatars] Avatar IDs:", avatarIds.map(id => id.toString()))

      if (!avatarIds || avatarIds.length === 0) {
        console.log("[MyAvatars] No avatars found")
        setAvatars([])
        return
      }

      // Load each avatar's details
      const loadedAvatars: Avatar[] = []

      for (const id of avatarIds) {
        try {
          console.log(`[MyAvatars] Loading avatar ${id.toString()}`)

          const state = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getState",
            args: [address, id],
          }) as any

          console.log(`[MyAvatars] State for avatar ${id.toString()}:`, {
            avatarId: state.avatarId.toString(),
            sessionId: state.sessionId.toString(),
            templateId: state.templateId.toString(),
            exists: state.exists
          })

          const template = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getTemplate",
            args: [state.templateId],
          }) as any

          console.log(`[MyAvatars] Template for avatar ${id.toString()}:`, template.name)

          loadedAvatars.push({
            id: Number(state.avatarId),
            sessionId: Number(state.sessionId),
            templateId: Number(state.templateId),
            templateName: template.name,
            dialogue: state.dialogue || "No interactions yet",
            behavior: state.behavior,
            lastInteraction: Number(state.lastInteraction),
          })
        } catch (err) {
          console.error(`[MyAvatars] Failed to load avatar ${id.toString()}:`, err)
          // Continue loading other avatars
        }
      }

      console.log("[MyAvatars] Successfully loaded avatars:", loadedAvatars.length)
      setAvatars(loadedAvatars)

    } catch (error) {
      console.error("[MyAvatars] Failed to load avatars:", error)
      setError(error instanceof Error ? error.message : "Failed to load avatars")
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) return null

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold text-white">My Avatars</h2>
          <button
            onClick={loadUserAvatars}
            disabled={loading}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-violet-500" />
            <p>Loading your avatars...</p>
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">You haven&apos;t created any avatars yet</p>
            <p className="text-sm text-gray-600">
              Create one from the templates above to get started
            </p>
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
