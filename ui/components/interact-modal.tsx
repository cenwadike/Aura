"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAccount, useSendTransaction, useWalletClient } from "wagmi"
import { x402UpdateAvatarCall, API_BASE_URL } from "@/lib/x402"
import { useAuraToast } from "@/hooks/use-aura-toast"
import type { ChatMessage, AvatarState } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Send, RefreshCw } from "lucide-react"

interface InteractModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  avatarId: number | null
  templateName: string
  creator: string
  onAvatarUpdate?: () => void // Optional callback to refresh parent component
}

export function InteractModal({ open, onOpenChange, avatarId, templateName, creator, onAvatarUpdate }: InteractModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>({
    behavior: "--",
    dialogue: "Ready to chat...",
  })
  const chatRef = useRef<HTMLDivElement>(null)
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { showToast } = useAuraToast()

  useEffect(() => {
    if (open && avatarId && address) {
      loadAvatarState()
      setMessages([])
    }
  }, [open, avatarId, address])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const loadAvatarState = async () => {
    if (!avatarId || !address) return

    try {
      const res = await fetch(`${API_BASE_URL}/avatar-state?avatarId=${avatarId}&userAddress=${address}`)
      const data = await res.json()
      setAvatarState({
        behavior: data.behavior || "neutral",
        dialogue: data.dialogue || "Ready to chat...",
      })
    } catch (error) {
      console.error("Failed to load avatar state:", error)
      showToast("Failed to load avatar state", "error")
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !avatarId || !address || !walletClient) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      await x402UpdateAvatarCall(`${API_BASE_URL}/update-avatar`, avatarId, userMessage, address, creator)

      // Optionally refresh parent component data
      if (onAvatarUpdate) {
        onAvatarUpdate()
      }

      showToast("Avatar updated successfully", "success")
    } catch (error) {
      console.error("Failed to send message:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update avatar"
      showToast(errorMessage, "error")

      // Reload avatar state on error to get current state
      await loadAvatarState()
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    setIsLoading(true)
    try {
      await loadAvatarState()
      if (onAvatarUpdate) {
        onAvatarUpdate()
      }
      showToast("Avatar state refreshed", "success")
    } catch (error) {
      showToast("Failed to refresh", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 sm:max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              {templateName}
            </DialogTitle>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                title="Refresh avatar state"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500 text-sm">Behavior:</span>
            <span className="text-gray-200 font-semibold text-sm">{avatarState.behavior}</span>
          </div>
          <div className="bg-gray-900 border-l-4 border-violet-500 p-3 rounded-md italic text-gray-300">
            {avatarState.dialogue}
          </div>
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto bg-[#0a0a0f] rounded-lg p-4 min-h-[200px] max-h-[300px]">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Start chatting with your avatar...
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 p-3 rounded-lg ${msg.role === "user"
                ? "bg-gray-800 ml-8 border-l-4 border-blue-500"
                : "bg-gray-900 mr-8 border-l-4 border-violet-500"
                }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your action or message..."
            disabled={isLoading}
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
