"use client"

import { useToastStore } from "@/hooks/use-aura-toast"
import { cn } from "@/lib/utils"

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={cn(
            "bg-gray-800 border border-gray-700 text-gray-200 px-6 py-4 rounded-lg",
            "shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer",
            "animate-in slide-in-from-right-full duration-300",
            "border-l-4",
            toast.type === "success" && "border-l-emerald-500",
            toast.type === "error" && "border-l-red-500",
            toast.type === "info" && "border-l-blue-500",
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
