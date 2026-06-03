import { readApiError } from './error'

export interface DashboardStats {
  total_conversations: number
  total_messages: number
  total_ai_events: number
  rule_hit_count: number
  handoff_count: number
  feedback_count: number
  positive_feedback: number
  negative_feedback: number
  average_latency_ms: number
}

export interface FeatureFlag {
  key: string
  enabled: boolean
  description: string
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/customer-service/admin/dashboard')
  if (!response.ok) {
    throw await readApiError(response, '看板加载失败')
  }
  return response.json()
}

export async function fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await fetch('/api/customer-service/admin/flags')
  if (!response.ok) {
    throw await readApiError(response, '灰度开关加载失败')
  }
  const payload = (await response.json()) as { flags: FeatureFlag[] }
  return payload.flags
}

export async function updateFeatureFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
  const response = await fetch(`/api/customer-service/admin/flags/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  })
  if (!response.ok) {
    throw await readApiError(response, '灰度开关更新失败')
  }
  return response.json()
}
