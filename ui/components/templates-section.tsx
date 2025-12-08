"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { avalancheFuji } from "wagmi/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/contract";
import { TemplateCard } from "./template-card";
import type { Template } from "@/types";
import { Loader2 } from 'lucide-react';

interface TemplatesSectionProps {
  onCreateAvatar: (templateId: number, templateName: string) => void;
  isCreatingAvatar: boolean;
}

export function TemplatesSection({
  onCreateAvatar,
  isCreatingAvatar,
}: TemplatesSectionProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const client = createPublicClient({
        chain: avalancheFuji,
        transport: http("https://avalanche-fuji-c-chain-rpc.publicnode.com"),
      });

      const loadedTemplates: Template[] = [];

      for (let i = 1; i <= 20; i++) {
        try {
          const result = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "getTemplate",
            args: [BigInt(i)],
          });

          if (result.exists) {
            loadedTemplates.push({
              id: Number(result.templateId),
              name: result.name,
              behavior: result.baseBehavior,
              creator: result.creator,
              createdAt: Number(result.createdAt),
            });
          }
        } catch {
          // Template doesn't exist, skip
        }
      }

      setTemplates(loadedTemplates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-5">
        <h2 className="text-center text-3xl font-bold text-white mb-12">
          Available Avatar Templates
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-violet-500" />
            <p>Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No templates available yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onCreateAvatar={onCreateAvatar}
                isCreating={isCreatingAvatar}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
