"use client"

import { useState } from "react"
import { useAccount, useSendTransaction, useWalletClient } from "wagmi"
import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { TemplatesSection } from "@/components/templates-section"
import { MyAvatarsSection } from "@/components/my-avatars-section"
import { CTASection } from "@/components/cta-section"
import { CreateTemplateModal } from "@/components/create-template-modal"
import { InteractModal } from "@/components/interact-modal"
import { ToastContainer } from "@/components/toast-container"
import { useAuraToast } from "@/hooks/use-aura-toast"
import { API_BASE_URL, x402CreateAvatarCall } from "@/lib/x402"

export default function Home() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [interactModalOpen, setInteractModalOpen] = useState(false)
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState("")
  const [selectedCreator, setSelectedCreator] = useState("")
  const [isCreatingAvatar, setIsCreatingAvatar] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { showToast } = useAuraToast()

  const handleCreateTemplate = () => {
    if (!isConnected) {
      showToast("Connect wallet first", "error")
      return
    }
    setCreateModalOpen(true)
  }

  const handleCreateAvatar = async (templateId: number, creator: string) => {
    if (!isConnected || !address || !walletClient) {
      showToast("Connect wallet first", "error")
      return
    }

    setIsCreatingAvatar(true)
    showToast("Initiating payment...", "info")

    try {
      console.log("[v0] Creating avatar for template:", templateId)

      await x402CreateAvatarCall(
        `${API_BASE_URL}/create-avatar`,
        templateId, address, creator
      )
      console.log("[v0] Avatar created")

      showToast("Avatar created! Refreshing...", "success")

      // Trigger refresh of avatars
      setTimeout(() => {
        setRefreshTrigger((prev) => prev + 1)
      }, 2000)
    } catch (error) {
      console.error("[v0] Avatar creation error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create avatar"

      if (errorMessage.includes("rejected")) {
        showToast("Payment cancelled", "error")
      } else if (errorMessage.includes("insufficient")) {
        showToast("Insufficient AVAX", "error")
      } else {
        showToast(`Error: ${errorMessage}`, "error")
      }
    } finally {
      setIsCreatingAvatar(false)
    }
  }

  const handleInteract = (avatarId: number, templateName: string, creator: string) => {
    setSelectedAvatarId(avatarId)
    setSelectedTemplateName(templateName)
    setSelectedCreator(creator)
    setInteractModalOpen(true)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <Header />
      <Hero onCreateTemplate={handleCreateTemplate} />
      <TemplatesSection onCreateAvatar={handleCreateAvatar} isCreatingAvatar={isCreatingAvatar} />
      <MyAvatarsSection onInteract={handleInteract} refreshTrigger={refreshTrigger} />
      <CTASection onCreateTemplate={handleCreateTemplate} />

      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">&copy; 2025 Aura AI. Built on Avalanche.</p>
            <a
              href="https://github.com/cenwadike/Aura"
              className="text-gray-400 hover:text-gray-200 transition-colors text-sm"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      <CreateTemplateModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <InteractModal
        open={interactModalOpen}
        onOpenChange={setInteractModalOpen}
        avatarId={selectedAvatarId}
        templateName={selectedTemplateName}
        creator={selectedCreator}
      />
      <ToastContainer />
    </main>
  )
}
