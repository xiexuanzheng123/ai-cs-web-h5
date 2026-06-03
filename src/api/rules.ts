import { readApiError } from './error'

export interface RuleConfig {
  id: number
  rule_type: string
  pattern: string
  action: string
  priority: number
  enabled: boolean
  description: string
}

export interface RuleConfigInput {
  rule_type: string
  pattern: string
  action: string
  priority: number
  enabled: boolean
  description: string
}

export async function fetchRules(): Promise<RuleConfig[]> {
  const response = await fetch('/api/customer-service/admin/rules')
  if (!response.ok) {
    throw await readApiError(response, '规则加载失败')
  }
  const payload = (await response.json()) as { rules: RuleConfig[] }
  return payload.rules
}

export async function createRule(input: RuleConfigInput): Promise<RuleConfig> {
  const response = await fetch('/api/customer-service/admin/rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '规则创建失败')
  }
  return response.json()
}

export async function updateRule(id: number, input: RuleConfigInput): Promise<RuleConfig> {
  const response = await fetch(`/api/customer-service/admin/rules/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '规则更新失败')
  }
  return response.json()
}

export async function reloadRules(): Promise<void> {
  const response = await fetch('/api/customer-service/admin/rules/reload', {
    method: 'POST',
  })
  if (!response.ok) {
    throw await readApiError(response, '规则刷新失败')
  }
}
