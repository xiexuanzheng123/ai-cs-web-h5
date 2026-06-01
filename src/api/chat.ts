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

export async function sendChatMessage(params: {
  sessionId?: string
  message: string
}): Promise<ChatResponse> {
  const response = await fetch('/api/chat/send', {
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
    throw new Error(`请求失败：${response.status}`)
  }

  return response.json()
}

