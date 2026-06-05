import { readApiError } from './error'

export interface ChatResponse {
  trace_id: string
  conversation_id: string
  response_type: string
  content: {
    text: string
    buttons: Array<{
      text: string
      action: string
    }>
  }
  handoff: {
    required: boolean
    reason: string
  }
  intent: string
  route: string
  risk_level: string
  citations: Array<{
    doc_id: string
    title: string
    score: number
  }>
  message_id: string
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
  conversationId: string
  messageId: string
  messageType: 'text' | 'image' | 'audio'
  message: string
}): Promise<ChatResponse> {
  const response = await fetch('/api/customer-service/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      user_id: 'demo-user-001',
      message_id: params.messageId,
      message_type: params.messageType,
      message: params.message,
      channel: 'h5',
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
      channel: 'h5',
    }),
  })

  if (!response.ok) {
    throw await readApiError(response, '转人工失败')
  }

  return response.json()
}
