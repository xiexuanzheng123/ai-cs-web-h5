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

export interface TraceStage {
  name: string
  status: string
  latency_ms: number
  detail: string
}

export interface TraceRagMatch {
  chunk_id: string
  knowledge_id: string
  title: string
  content: string
  score: number
  chunk_text: string
}

export interface TraceCitation {
  doc_id: string
  title: string
  score: number
}

export interface TraceLog {
  id: number
  trace_id: string
  conversation_id: string
  message_id: string
  user_id: string
  channel: string
  message_type: string
  user_message: string
  response_text: string
  intent: string
  route: string
  response_type: string
  risk_level: string
  handoff_required: boolean
  handoff_reason: string
  model_used: string
  total_latency_ms: number
  stages: TraceStage[]
  rag_matches: TraceRagMatch[]
  citations: TraceCitation[]
  error_message: string
  created_at: string
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

export async function fetchTraceLogs(limit = 50): Promise<TraceLog[]> {
  const response = await fetch(`/api/customer-service/admin/trace-logs?limit=${limit}`)
  if (!response.ok) {
    throw await readApiError(response, '链路日志加载失败')
  }
  const payload = (await response.json()) as { logs: TraceLog[] }
  return (payload.logs ?? []).map(normalizeTraceLog)
}

function normalizeTraceLog(log: TraceLog): TraceLog {
  return {
    ...log,
    total_latency_ms: log.total_latency_ms || 0,
    stages: Array.isArray(log.stages) ? log.stages : [],
    rag_matches: Array.isArray(log.rag_matches) ? log.rag_matches : [],
    citations: Array.isArray(log.citations) ? log.citations : [],
  }
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
