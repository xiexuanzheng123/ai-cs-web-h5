const STORAGE_KEY = 'ai-cs-chat-session-id'

function newSessionId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `session-${hex}`
}

/** 读取或创建会话 ID，与 gateway 的 session-xxxxxxxx 格式一致 */
export function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem(STORAGE_KEY)
  if (existing) {
    return existing
  }
  const id = newSessionId()
  sessionStorage.setItem(STORAGE_KEY, id)
  return id
}

export function persistSessionId(sessionId: string): void {
  sessionStorage.setItem(STORAGE_KEY, sessionId)
}
