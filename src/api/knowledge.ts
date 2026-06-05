import { readApiError } from './error'

export interface KnowledgeRecord {
  id: number
  knowledge_id: string
  title: string
  content: string
  category: string
  owner: string
  version: string
  status: string
}

export interface KnowledgeInput {
  knowledge_id: string
  title: string
  content: string
  category: string
  owner: string
  version: string
  status: string
}

export interface CategoryRecord {
  id: number
  parent_id: number
  name: string
  level: number
  path: string
  sort_order: number
  child_count: number
}

export interface CategoryInput {
  parent_id: number
  name: string
  sort_order: number
}

export interface RAGEvalCaseRecord {
  id: number
  case_id: string
  query_text: string
  expected_knowledge_id: string
  expected_intent: string
  should_answer: boolean
  status: string
}

export interface RAGEvalCaseInput {
  case_id: string
  query_text: string
  expected_knowledge_id: string
  expected_intent: string
  should_answer: boolean
  status: string
}

export interface RAGEvalRunItem {
  case_id: string
  query_text: string
  expected_knowledge_id: string
  should_answer: boolean
  matched: boolean
  passed: boolean
  reason: string
  top1_knowledge_id: string
  top1_score: number
  duration_ms: number
}

export interface RAGEvalRunResult {
  total: number
  passed: number
  failed: number
  pass_rate: number
  duration_ms: number
  items: RAGEvalRunItem[]
}

export interface RAGEvalRunRecord extends RAGEvalRunResult {
  id: number
  run_id: string
  created_at: string
}

export async function fetchKnowledge(): Promise<KnowledgeRecord[]> {
  const response = await fetch('/api/customer-service/admin/knowledge')
  if (!response.ok) {
    throw await readApiError(response, '知识库加载失败')
  }
  const payload = (await response.json()) as { knowledge: KnowledgeRecord[] }
  return payload.knowledge
}

export async function createKnowledge(input: KnowledgeInput): Promise<KnowledgeRecord> {
  const response = await fetch('/api/customer-service/admin/knowledge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '知识创建失败')
  }
  return response.json()
}

export async function updateKnowledge(id: number, input: KnowledgeInput): Promise<KnowledgeRecord> {
  const response = await fetch(`/api/customer-service/admin/knowledge/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '知识更新失败')
  }
  return response.json()
}

export async function fetchCategories(): Promise<CategoryRecord[]> {
  const response = await fetch('/api/customer-service/admin/categories')
  if (!response.ok) {
    throw await readApiError(response, '分类加载失败')
  }
  const payload = (await response.json()) as { categories: CategoryRecord[] }
  return payload.categories
}

export async function createCategory(input: CategoryInput): Promise<CategoryRecord> {
  const response = await fetch('/api/customer-service/admin/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '分类创建失败')
  }
  return response.json()
}

export async function updateCategory(id: number, input: CategoryInput): Promise<CategoryRecord> {
  const response = await fetch(`/api/customer-service/admin/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, '分类更新失败')
  }
  return response.json()
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await fetch(`/api/customer-service/admin/categories/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw await readApiError(response, '分类删除失败')
  }
}

export async function fetchRAGEvalCases(): Promise<RAGEvalCaseRecord[]> {
  const response = await fetch('/api/customer-service/admin/rag-eval-cases')
  if (!response.ok) {
    throw await readApiError(response, 'RAG 回归集加载失败')
  }
  const payload = (await response.json()) as { cases: RAGEvalCaseRecord[] }
  return payload.cases
}

export async function createRAGEvalCase(input: RAGEvalCaseInput): Promise<RAGEvalCaseRecord> {
  const response = await fetch('/api/customer-service/admin/rag-eval-cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, 'RAG case 创建失败')
  }
  return response.json()
}

export async function updateRAGEvalCase(
  id: number,
  input: RAGEvalCaseInput,
): Promise<RAGEvalCaseRecord> {
  const response = await fetch(`/api/customer-service/admin/rag-eval-cases/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await readApiError(response, 'RAG case 更新失败')
  }
  return response.json()
}

export async function runRAGEvalCases(): Promise<RAGEvalRunResult> {
  const response = await fetch('/api/customer-service/admin/rag-eval-cases/run', {
    method: 'POST',
  })
  if (!response.ok) {
    throw await readApiError(response, 'RAG 回归运行失败')
  }
  return response.json()
}

export async function fetchRAGEvalRuns(limit = 10): Promise<RAGEvalRunRecord[]> {
  const response = await fetch(`/api/customer-service/admin/rag-eval-runs?limit=${limit}`)
  if (!response.ok) {
    throw await readApiError(response, 'RAG 回归历史加载失败')
  }
  const payload = (await response.json()) as { runs: RAGEvalRunRecord[] }
  return payload.runs
}
