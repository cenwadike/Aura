export interface Template {
  id: number
  name: string
  behavior: string
  creator: string
  createdAt: number
}

export interface Avatar {
  id: number
  sessionId: number
  templateId: number
  templateName: string
  dialogue: string
  behavior: string
  lastInteraction: number
}

export interface AvatarState {
  behavior: string
  dialogue: string
}

export interface ChatMessage {
  role: "user" | "ai"
  content: string
}

export interface X402PaymentDetails {
  amount: string
  recipient: string
  purpose: string
}
