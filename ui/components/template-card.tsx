"use client"

import type { Template } from "@/types"

interface TemplateCardProps {
  template: Template
  onCreateAvatar: (templateId: number, templateName: string) => void
  isCreating: boolean
}

export function TemplateCard({ template, onCreateAvatar, isCreating }: TemplateCardProps) {
  const shortCreator = `${template.creator.slice(0, 8)}...${template.creator.slice(-6)}`

  return (
    <div className="group bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 cursor-pointer transition-all relative overflow-hidden hover:-translate-y-1 hover:border-violet-500 hover:shadow-[0_10px_30px_rgba(139,92,246,0.2)]">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xl font-bold bg-gradient-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent mb-1">
            {template.name}
          </div>
          <div className="text-xs text-gray-500 font-mono">by {shortCreator}</div>
        </div>
      </div>

      <div className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{template.behavior}</div>

      <div className="flex gap-2">
        <button
          onClick={() => onCreateAvatar(template.id, template.name)}
          disabled={isCreating}
          className="px-4 py-2 rounded-md font-semibold text-xs transition-all bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] disabled:opacity-50"
        >
          {isCreating ? "Processing..." : "Create Avatar ($0.01)"}
        </button>
      </div>
    </div>
  )
}
