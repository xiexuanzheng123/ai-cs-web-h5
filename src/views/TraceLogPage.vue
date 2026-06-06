<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import { fetchTraceLogs, type TraceLog } from '../api/admin'

const logs = ref<TraceLog[]>([])
const detailId = ref<number | null>(null)
const loading = ref(false)
const filters = reactive({
  keyword: '',
  route: 'all',
  handoff: 'all',
  risk: 'all',
  conversationId: '',
  limit: 50,
})
const page = reactive({ current: 1, pageSize: 20 })

const drawerVisible = computed({
  get: () => detailId.value !== null,
  set: (value: boolean) => {
    if (!value) detailId.value = null
  },
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
  try {
    logs.value = await fetchTraceLogs(filters.limit)
    page.current = 1
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '链路日志加载失败')
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

function routeTagType(item: TraceLog): 'success' | 'warning' | 'info' | undefined {
  if (item.error_message) return 'info'
  if (item.route === 'handoff') return 'warning'
  if (item.route === 'rag' || item.route === 'rag_llm') return 'success'
  if (item.route === 'rag_fallback') return 'warning'
  if (item.route === 'db_rule') return 'info'
  return 'info'
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
  return citations.map((citation) => citation.question || citation.doc_id).join('，')
}

function formatRagQuestion(match: TraceLog['rag_matches'][number]) {
  return match.question || match.knowledge_id
}
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="回答日志"
      subtitle="主表保留时间、会话、问题、回答、路由、RAG 与耗时；完整链路在详情抽屉查看"
      breadcrumb="首页 > 客服数据 > 回答日志"
    />

    <el-card shadow="never" class="toolbar-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="问题 / 回答 / trace" clearable />
        </el-form-item>
        <el-form-item label="会话 ID">
          <el-input v-model="filters.conversationId" placeholder="conversationId" clearable />
        </el-form-item>
        <el-form-item label="路由">
          <el-select v-model="filters.route" style="width: 140px">
            <el-option label="全部" value="all" />
            <el-option v-for="route in routeOptions" :key="route" :label="route" :value="route" />
          </el-select>
        </el-form-item>
        <el-form-item label="转人工">
          <el-select v-model="filters.handoff" style="width: 100px">
            <el-option label="全部" value="all" />
            <el-option label="是" value="yes" />
            <el-option label="否" value="no" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险">
          <el-select v-model="filters.risk" style="width: 110px">
            <el-option label="全部" value="all" />
            <el-option label="low" value="low" />
            <el-option label="medium" value="medium" />
            <el-option label="high" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item label="加载条数">
          <el-select v-model="filters.limit" style="width: 100px">
            <el-option :value="20" label="20" />
            <el-option :value="50" label="50" />
            <el-option :value="100" label="100" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="toolbar-row">
        <div class="stat-tags">
          <el-tag type="success">成功 {{ successCount }}</el-tag>
          <el-tag class="stat-tag--neutral" effect="plain">错误 {{ errorCount }}</el-tag>
          <el-tag type="warning">转人工 {{ handoffCount }}</el-tag>
        </div>
        <div class="toolbar-actions">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" :loading="loading" @click="loadLogs">搜索</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-card-header">
          <strong>回答日志</strong>
          <span>共 {{ filteredLogs.length }} 条</span>
        </div>
      </template>

      <el-table v-loading="loading" border :data="pagedLogs" empty-text="暂无日志">
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column label="会话" min-width="180">
          <template #default="{ row }">
            <div>{{ formatText(row.conversation_id, 28) }}</div>
            <div class="sub-text">{{ formatText(row.trace_id, 24) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="问题" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatText(row.user_message, 120) }}</template>
        </el-table-column>
        <el-table-column label="回答" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatText(row.response_text || row.error_message, 150) }}
          </template>
        </el-table-column>
        <el-table-column label="路由" width="110">
          <template #default="{ row }">
            <el-tag :type="routeTagType(row as TraceLog)">{{ formatRoute(row as TraceLog) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="命中知识" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatCitationNames(row as TraceLog) }}</template>
        </el-table-column>
        <el-table-column label="耗时" width="100">
          <template #default="{ row }">{{ formatLatency(row.total_latency_ms) }}</template>
        </el-table-column>
        <el-table-column label="转人工" width="80">
          <template #default="{ row }">{{ row.handoff_required ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row as TraceLog)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page.current"
          v-model:page-size="page.pageSize"
          :total="filteredLogs.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" :with-header="false" size="62%" destroy-on-close>
      <template v-if="detailLog">
        <div class="drawer-header">
          <div>
            <h3>链路详情</h3>
            <p>{{ detailLog.trace_id }}</p>
          </div>
          <el-button @click="closeDetail">关闭</el-button>
        </div>

        <el-descriptions :column="3" border class="detail-desc">
          <el-descriptions-item label="总耗时">{{ formatLatency(detailLog.total_latency_ms) }}</el-descriptions-item>
          <el-descriptions-item label="路由">{{ formatRoute(detailLog) }}</el-descriptions-item>
          <el-descriptions-item label="意图">{{ detailLog.intent || '-' }}</el-descriptions-item>
          <el-descriptions-item label="模型">{{ detailLog.model_used || '-' }}</el-descriptions-item>
          <el-descriptions-item label="转人工">{{ detailLog.handoff_required ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="风险">{{ detailLog.risk_level || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="detailLog.error_message"
          :title="detailLog.error_message"
          type="warning"
          show-icon
          :closable="false"
          class="detail-alert"
        />

        <el-card shadow="never" class="detail-section">
          <template #header><strong>回复内容</strong></template>
          <p>{{ detailLog.response_text || '无回复内容' }}</p>
        </el-card>

        <el-card shadow="never" class="detail-section">
          <template #header><strong>阶段耗时</strong></template>
          <el-table border :data="detailStages" size="small" empty-text="无阶段数据">
            <el-table-column label="阶段">
              <template #default="{ row }">{{ formatStageName(row.name) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column label="耗时" width="100">
              <template #default="{ row }">{{ formatLatency(row.latency_ms) }}</template>
            </el-table-column>
            <el-table-column prop="detail" label="详情" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-card>

        <el-card shadow="never" class="detail-section">
          <template #header><strong>RAG 检索</strong></template>
          <el-empty v-if="detailRagMatches.length === 0" description="没有召回候选" />
          <div v-for="match in detailRagMatches" :key="match.chunk_id" class="match-block">
            <strong>{{ formatRagQuestion(match) }}</strong>
            <div class="sub-text">
              {{ match.knowledge_id }} / {{ match.chunk_id }} / {{ match.score.toFixed(3) }}
            </div>
            <p>{{ match.chunk_text || match.content }}</p>
          </div>
        </el-card>

        <el-card shadow="never" class="detail-section">
          <template #header><strong>引用来源</strong></template>
          <el-empty v-if="detailCitations.length === 0" description="本次回答没有引用来源" />
          <div v-for="citation in detailCitations" :key="citation.doc_id" class="match-block">
            <strong>{{ citation.question || citation.doc_id }}</strong>
            <div class="sub-text">{{ citation.doc_id }} / {{ citation.score.toFixed(3) }}</div>
          </div>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}

.stat-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.drawer-header h3 {
  margin: 0;
}

.drawer-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  word-break: break-all;
}

.detail-desc {
  margin-bottom: 16px;
}

.detail-alert {
  margin-bottom: 16px;
}

.detail-section {
  margin-bottom: 16px;
}

.match-block {
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.match-block:last-child {
  border-bottom: 0;
}

.match-block p {
  margin: 8px 0 0;
  color: #475569;
  line-height: 1.6;
}
</style>
