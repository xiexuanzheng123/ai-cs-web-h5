<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { fetchTraceLogs, type TraceLog } from '../api/admin'

const logs = ref<TraceLog[]>([])
const detailId = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const filters = reactive({
  keyword: '',
  route: 'all',
  handoff: 'all',
  risk: 'all',
  conversationId: '',
  limit: 50,
})
const page = reactive({
  current: 1,
  pageSize: 20,
})

const detailLog = computed(() => logs.value.find((item) => item.id === detailId.value) ?? null)
const detailStages = computed(() => detailLog.value?.stages ?? [])
const detailRagMatches = computed(() => detailLog.value?.rag_matches ?? [])
const detailCitations = computed(() => detailLog.value?.citations ?? [])

const routeOptions = computed(() => {
  const values = logs.value.map((item) => item.route).filter(Boolean)
  return Array.from(new Set(values)).sort()
})

const filteredLogs = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const conversationId = filters.conversationId.trim().toLowerCase()

  return logs.value.filter((item) => {
    const haystack = [item.user_message, item.response_text, item.intent, item.trace_id, item.message_id]
      .join(' ')
      .toLowerCase()
    if (keyword && !haystack.includes(keyword)) return false
    if (conversationId && !item.conversation_id.toLowerCase().includes(conversationId)) return false
    if (filters.route !== 'all' && item.route !== filters.route) return false
    if (filters.handoff !== 'all') {
      const expected = filters.handoff === 'yes'
      if (item.handoff_required !== expected) return false
    }
    if (filters.risk !== 'all' && item.risk_level !== filters.risk) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / page.pageSize)))
const pagedLogs = computed(() => {
  const start = (page.current - 1) * page.pageSize
  return filteredLogs.value.slice(start, start + page.pageSize)
})
const successCount = computed(() => logs.value.filter((item) => !item.error_message).length)
const errorCount = computed(() => logs.value.filter((item) => item.error_message).length)
const handoffCount = computed(() => logs.value.filter((item) => item.handoff_required).length)

onMounted(() => {
  void loadLogs()
})

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    logs.value = await fetchTraceLogs(filters.limit)
    page.current = 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : '链路日志加载失败'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.route = 'all'
  filters.handoff = 'all'
  filters.risk = 'all'
  filters.conversationId = ''
  filters.limit = 50
  page.current = 1
}

function openDetail(item: TraceLog) {
  detailId.value = item.id
}

function closeDetail() {
  detailId.value = null
}

function formatLatency(value: number) {
  return `${value || 0} ms`
}

function formatRoute(item: TraceLog) {
  if (item.error_message) return 'error'
  return item.route || 'unknown'
}

function routeClass(item: TraceLog) {
  return {
    error: Boolean(item.error_message),
    handoff: item.route === 'handoff',
    rag: item.route === 'rag' || item.route === 'rag_llm',
    rule: item.route === 'db_rule',
  }
}

function formatText(value: string, max = 96) {
  const text = (value || '').trim()
  if (!text) return '--'
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function formatStageName(name: string) {
  const names: Record<string, string> = {
    save_conversation: '会话写入',
    save_user_message: '用户消息写入',
    media_guide: '媒体引导',
    rule_match: '规则匹配',
    feature_flag: '灰度开关',
    session_memory: '会话记忆',
    session_memory_write: '记忆写入',
    rag_search: 'RAG 检索',
    llm_reply: 'LLM 回复',
    response_validator: '回答校验',
    save_ai_message: 'AI 消息写入',
  }
  return names[name] || name
}

function formatCitationNames(item: TraceLog) {
  const citations = Array.isArray(item.citations) ? item.citations : []
  if (citations.length === 0) return '--'
  return citations.map((citation) => citation.title || citation.doc_id).join('，')
}

function changePage(nextPage: number) {
  page.current = Math.min(Math.max(1, nextPage), totalPages.value)
}

function changePageSize(event: Event) {
  page.pageSize = Number((event.target as HTMLSelectElement).value)
  page.current = 1
}
</script>

<template>
  <main class="admin-shell trace-log-page">
    <header class="page-heading">
      <div>
        <strong>回答日志</strong>
        <span>主表保留时间、会话、问题、回答、路由、RAG 与耗时；完整链路在详情弹窗查看。</span>
      </div>
      <nav aria-label="面包屑">首页 &gt; 客服数据 &gt; 回答日志</nav>
    </header>

    <section class="trace-filter-panel">
      <div class="trace-filters">
        <label>
          <span>问题关键词</span>
          <input v-model="filters.keyword" placeholder="输入问题 / 回答 / trace 关键词" />
        </label>
        <label>
          <span>会话 ID</span>
          <input v-model="filters.conversationId" placeholder="子串匹配 conversationId" />
        </label>
        <label>
          <span>路由</span>
          <select v-model="filters.route">
            <option value="all">全部</option>
            <option v-for="route in routeOptions" :key="route" :value="route">{{ route }}</option>
          </select>
        </label>
        <label>
          <span>转人工</span>
          <select v-model="filters.handoff">
            <option value="all">全部</option>
            <option value="yes">是</option>
            <option value="no">否</option>
          </select>
        </label>
        <label>
          <span>风险</span>
          <select v-model="filters.risk">
            <option value="all">全部</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </label>
        <label>
          <span>加载条数</span>
          <select v-model.number="filters.limit">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>

      <div class="trace-actions">
        <button type="button" @click="resetFilters">重置</button>
        <button type="button" class="primary" :disabled="loading" @click="loadLogs">
          {{ loading ? '搜索中' : '搜索' }}
        </button>
      </div>

      <div class="trace-stats">
        <span>成功 {{ successCount }}</span>
        <span>错误 {{ errorCount }}</span>
        <span>转人工 {{ handoffCount }}</span>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="trace-table-panel">
      <div class="trace-table-title">
        <strong>回答日志</strong>
        <span>共 {{ filteredLogs.length }} 条</span>
      </div>

      <div v-if="loading" class="admin-muted trace-loading">正在加载链路日志...</div>
      <div v-else class="trace-table-wrap">
        <table class="trace-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>会话</th>
              <th>问题</th>
              <th>回答</th>
              <th>路由</th>
              <th>命中知识</th>
              <th>耗时</th>
              <th>转人工</th>
              <th>详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredLogs.length === 0">
              <td colspan="9" class="trace-empty">暂无日志</td>
            </tr>
            <tr v-for="item in pagedLogs" :key="item.id">
              <td>{{ item.created_at }}</td>
              <td>
                <div class="trace-conversation-cell">
                  <strong>{{ formatText(item.conversation_id, 28) }}</strong>
                  <span>{{ formatText(item.trace_id, 24) }}</span>
                </div>
              </td>
              <td class="trace-question-cell">{{ formatText(item.user_message, 120) }}</td>
              <td class="trace-answer-cell">
                {{ formatText(item.response_text || item.error_message, 150) }}
              </td>
              <td>
                <span class="route-tag" :class="routeClass(item)">{{ formatRoute(item) }}</span>
              </td>
              <td>
                {{ formatCitationNames(item) }}
              </td>
              <td>{{ formatLatency(item.total_latency_ms) }}</td>
              <td>{{ item.handoff_required ? '是' : '否' }}</td>
              <td class="trace-op-cell">
                <button type="button" @click="openDetail(item)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && filteredLogs.length > 0" class="table-pagination">
        <span>共 {{ filteredLogs.length }} 条</span>
        <label>
          每页
          <select :value="page.pageSize" @change="changePageSize">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          条
        </label>
        <button type="button" :disabled="page.current <= 1" @click="changePage(page.current - 1)">
          上一页
        </button>
        <strong>{{ page.current }} / {{ totalPages }}</strong>
        <button type="button" :disabled="page.current >= totalPages" @click="changePage(page.current + 1)">
          下一页
        </button>
      </div>
    </section>

    <div v-if="detailLog" class="admin-dialog-mask" @click.self="closeDetail">
      <article class="admin-dialog trace-detail-dialog" role="dialog" aria-modal="true" aria-label="链路详情">
        <header>
          <div>
            <strong>链路详情</strong>
            <span>{{ detailLog.trace_id }}</span>
          </div>
          <button type="button" @click="closeDetail">×</button>
        </header>

        <section class="trace-detail-body">
          <div class="trace-detail-summary">
            <div>
              <span>总耗时</span>
              <strong>{{ formatLatency(detailLog.total_latency_ms) }}</strong>
            </div>
            <div>
              <span>路由</span>
              <strong>{{ formatRoute(detailLog) }}</strong>
            </div>
            <div>
              <span>意图</span>
              <strong>{{ detailLog.intent || '-' }}</strong>
            </div>
            <div>
              <span>模型</span>
              <strong>{{ detailLog.model_used || '-' }}</strong>
            </div>
            <div>
              <span>转人工</span>
              <strong>{{ detailLog.handoff_required ? '是' : '否' }}</strong>
            </div>
            <div>
              <span>风险</span>
              <strong>{{ detailLog.risk_level || '-' }}</strong>
            </div>
          </div>

          <section class="trace-detail-section">
            <h2>主链路</h2>
            <div class="trace-flow-line">
              <div>
                <span>用户问题</span>
                <strong>{{ detailLog.user_message }}</strong>
              </div>
              <div>
                <span>Gateway</span>
                <strong>{{ detailLog.channel }} / {{ detailLog.message_type }}</strong>
                <small>{{ detailLog.conversation_id }}</small>
              </div>
              <div v-for="stage in detailStages" :key="`${stage.name}-${stage.status}`">
                <span>{{ formatStageName(stage.name) }}</span>
                <strong>{{ stage.status }}</strong>
                <small>{{ stage.detail || formatLatency(stage.latency_ms) }}</small>
              </div>
              <div>
                <span>最终答案</span>
                <strong>{{ detailLog.response_type || detailLog.route }}</strong>
                <small>{{ formatLatency(detailLog.total_latency_ms) }}</small>
              </div>
            </div>
          </section>

          <section v-if="detailLog.error_message" class="notice danger">
            {{ detailLog.error_message }}
          </section>

          <section class="trace-detail-section">
            <h2>回复内容</h2>
            <p>{{ detailLog.response_text || '无回复内容' }}</p>
          </section>

          <section class="trace-detail-section">
            <h2>阶段耗时</h2>
            <div class="trace-stage-table">
              <div v-for="stage in detailStages" :key="`${stage.name}-${stage.latency_ms}`">
                <span>{{ formatStageName(stage.name) }}</span>
                <em>{{ stage.status }}</em>
                <strong>{{ formatLatency(stage.latency_ms) }}</strong>
                <small>{{ stage.detail }}</small>
              </div>
            </div>
          </section>

          <section class="trace-detail-section">
            <h2>RAG 检索</h2>
            <p v-if="detailRagMatches.length === 0" class="admin-muted">没有召回候选，或未进入 RAG</p>
            <div v-for="match in detailRagMatches" :key="match.chunk_id" class="rag-match-row">
              <strong>{{ match.title || match.knowledge_id }}</strong>
              <span>{{ match.knowledge_id }} / {{ match.chunk_id }} / {{ match.score.toFixed(3) }}</span>
              <p>{{ match.chunk_text || match.content }}</p>
            </div>
          </section>

          <section class="trace-detail-section">
            <h2>引用来源</h2>
            <p v-if="detailCitations.length === 0" class="admin-muted">本次回答没有引用来源</p>
            <div v-for="citation in detailCitations" :key="citation.doc_id" class="citation-row">
              <strong>{{ citation.title || citation.doc_id }}</strong>
              <span>{{ citation.doc_id }} / {{ citation.score.toFixed(3) }}</span>
            </div>
          </section>
        </section>

        <footer>
          <button type="button" @click="closeDetail">关闭</button>
        </footer>
      </article>
    </div>
  </main>
</template>
