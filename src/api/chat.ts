import { readApiError } from './error'

export interface ChatResponse {
  session_id: string
  message_id: string
  reply: string
  reply_type: string
  transfer_to_human: boolean
  risk_level: string
  intent: string
  suggestions: string[]
}

export interface FeedbackResponse {
  success: boolean
}

export interface HandoffResponse {
  success: boolean
  handoff_id: string
  status: string
}

export async function sendChatMessage(params: {
  sessionId: string
  message: string
}): Promise<ChatResponse> {
  const response = await fetch('/api/customer-service/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: params.sessionId,
      user_id: 'demo-user-001',
      message: params.message,
      source: 'h5',
      metadata: {
        platform: 'h5',
        app_version: 'local',
      },
    }),
  })

  if (!response.ok) {
    throw await readApiError(response, '请求失败')
  }

  return response.json()
}

export async function sendFeedback(params: {
  conversationId: string
  messageId: string
  rating: 'thumbs_up' | 'thumbs_down'
  comment?: string
  actionTaken?: string
}): Promise<FeedbackResponse> {
  const response = await fetch('/api/customer-service/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      message_id: params.messageId,
      user_id: 'demo-user-001',
      rating: params.rating,
      comment: params.comment ?? '',
      action_taken: params.actionTaken ?? '',
    }),
  })

  if (!response.ok) {
    throw await readApiError(response, '反馈失败')
  }

  return response.json()
}

export async function requestHandoff(params: {
  conversationId: string
  messageId?: string
  reason?: string
}): Promise<HandoffResponse> {
  const response = await fetch('/api/customer-service/handoff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      message_id: params.messageId ?? '',
      user_id: 'demo-user-001',
      reason: params.reason ?? 'user_requested',
      source: 'h5',
    }),
  })

  if (!response.ok) {
    throw await readApiError(response, '转人工失败')
  }

  return response.json()
}
