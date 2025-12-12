"use client"

import type { Avatar } from "@/types"

interface AvatarCardProps {
  avatar: Avatar
  onInteract: (avatarId: number, templateName: string, creator: string) => void
}

export function AvatarCard({ avatar, onInteract }: AvatarCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-[#0a0a0f] border border-gray-700 rounded-xl p-6 relative">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-bl-xl rounded-tr-xl" />

      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400 mb-4">
        <span className="animate-pulse">●</span>
        Active
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">Template:</span>
          <span className="text-gray-200 font-semibold text-sm">{avatar.templateName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">Avatar ID:</span>
          <span className="text-gray-200 font-semibold text-sm">#{avatar.id}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">Behavior:</span>
          <span className="text-gray-200 font-semibold text-sm">{avatar.behavior}</span>
        </div>
      </div>

      {avatar.dialogue !== "No interactions yet" && (
        <div className="bg-gray-800 border-l-4 border-violet-500 p-4 rounded-lg mb-4 italic text-gray-300">
          &ldquo;{avatar.dialogue}&rdquo;
        </div>
      )}

      <button
        onClick={() => onInteract(avatar.id, avatar.templateName, avatar.creator)}
        className="w-full px-4 py-2 rounded-md font-semibold text-xs transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)]"
      >
        Interact ($0.001/msg)
      </button>
    </div>
  )
}
