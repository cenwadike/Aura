"use client"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract"
import { useAuraToast } from "@/hooks/use-aura-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Coins } from "lucide-react"

interface CreateTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTemplateModal({ open, onOpenChange }: CreateTemplateModalProps) {
  const [name, setName] = useState("")
  const [behavior, setBehavior] = useState("")
  const { showToast } = useAuraToast()
  const { isConnected } = useAccount()

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSubmit = async () => {
    if (!name.trim() || !behavior.trim()) {
      showToast("Fill all fields", "error")
      return
    }

    if (!isConnected) {
      showToast("Connect wallet first", "error")
      return
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "createTemplate",
        args: [name, behavior],
      })
    } catch (error) {
      console.error(error)
      showToast("Failed to create template", "error")
    }
  }

  // Handle success with useEffect to avoid state updates during render
  useEffect(() => {
    if (isSuccess && hash) {
      showToast(`Template "${name}" created!`, "success")
      setName("")
      setBehavior("")
      onOpenChange(false)
    }
  }, [isSuccess, hash, name, showToast, onOpenChange])

  const isLoading = isPending || isConfirming

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
              Create New AI Avatar Template
            </DialogTitle>
            <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogHeader>

        <div className="bg-gray-800 p-6 rounded-xl space-y-4">
          <div>
            <label className="block mb-2 text-gray-200 font-semibold">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wise Oracle, Cyber Samurai"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-200 font-semibold">Personality & Behavior</label>
            <textarea
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              rows={6}
              placeholder="You are a mysterious ancient wizard who speaks in riddles..."
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-violet-500 resize-y"
            />
          </div>

          <div className="p-4 bg-slate-900 rounded-lg border border-blue-800">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <Coins className="w-4 h-4" />
              <span>
                You earn <strong>70%</strong> on Royalties forever
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-lg font-semibold text-lg transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] disabled:opacity-50"
          >
            {isLoading ? "Creating..." : "Create Template"}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-all bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}