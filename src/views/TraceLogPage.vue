<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchTraceLogs, type TraceLog } from '../api/admin'

const logs = ref<TraceLog[]>([])
const selectedId = ref<number | null>(null)
const detailId = ref<number | null>(null)
const loading = ref(false)
const error = ref('')

const selectedLog = computed(() => logs.value.find((item) => item.id === selectedId.value) ?? null)
const detailLog = computed(() => logs.value.find((item) => item.id === detailId.value) ?? null)
const activeDetailLog = computed(() => detailLog.value)
const detailStages = computed(() => activeDetailLog.value?.stages ?? [])
const detailRagMatches = computed(() => activeDetailLog.value?.rag_matches ?? [])
const routerStage = computed(() =>
  detailStages.value.find((item) => item.name === 'rule_match') ?? null,
)
const ragStage = computed(() =>
  detailStages.value.find((item) => item.name === 'rag_search') ?? null,
)
const llmStage = computed(() =>
  detailStages.value.find((item) => item.name === 'llm_reply') ?? null,
)

onMounted(() => {
  void loadLogs()
})

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    logs.value = await fetchTraceLogs(50)
    if (!selectedId.value && logs.value.length > 0) {
      selectedId.value = logs.value[0].id
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '链路日志加载失败'
  } finally {
    loading.value = false
  }
}

function formatRoute(item: TraceLog) {
  return item.route || 'unknown'
}

function formatLatency(value: number) {
  return `${value || 0} ms`
}

function openDetail(item: TraceLog) {
  selectedId.value = item.id
  detailId.value = item.id
}
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>链路日志</strong>
        <span>最近 {{ logs.length }} 条问答链路 / 网关分支、RAG、LLM 与阶段耗时</span>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="rule-toolbar">
      <button :disabled="loading" @click="loadLogs">
        {{ loading ? '刷新中' : '刷新日志' }}
      </button>
    </section>

    <p v-if="loading" class="admin-muted">正在加载链路日志...</p>
    <p v-else-if="logs.length === 0" class="empty-state">暂无日志</p>

    <section v-else class="trace-layout">
      <div class="trace-list" aria-label="链路日志列表">
        <button
          v-for="item in logs"
          :key="item.id"
          class="trace-item"
          :class="{ active: item.id === selectedId }"
          @click="openDetail(item)"
        >
          <span class="trace-title">
            <strong>{{ item.user_message || '空消息' }}</strong>
            <em :class="{ off: item.error_message }">{{ formatRoute(item) }}</em>
          </span>
          <span class="trace-meta">
            {{ item.created_at }} / {{ formatLatency(item.total_latency_ms) }}
          </span>
          <span class="trace-id">{{ item.trace_id }}</span>
        </button>
      </div>

      <article v-if="selectedLog" class="trace-preview">
        <strong>{{ selectedLog.user_message }}</strong>
        <p>{{ selectedLog.response_text || selectedLog.error_message || '无回复内容' }}</p>
        <button @click="detailId = selectedLog.id">查看完整链路</button>
      </article>

      <div v-if="activeDetailLog" class="trace-modal-mask" @click.self="detailId = null">
        <article class="trace-detail" role="dialog" aria-modal="true" aria-label="链路详情">
        <header class="trace-detail-header">
          <div>
            <strong>链路详情</strong>
            <span>{{ activeDetailLog.trace_id }}</span>
          </div>
          <em :class="{ off: activeDetailLog.error_message }">
            {{ activeDetailLog.error_message ? 'error' : activeDetailLog.route }}
          </em>
        </header>

        <section class="trace-flow">
          <div>
            <span>1. 用户问题</span>
            <strong>{{ activeDetailLog.user_message }}</strong>
          </div>
          <div>
            <span>2. Gateway</span>
            <strong>{{ activeDetailLog.channel }} / {{ activeDetailLog.message_type }}</strong>
            <small>{{ activeDetailLog.conversation_id }}</small>
          </div>
          <div>
            <span>3. Router</span>
            <strong>{{ routerStage?.status || 'unknown' }}</strong>
            <small>{{ routerStage?.detail || '无规则命中' }}</small>
          </div>
          <div>
            <span>4. Python / RAG</span>
            <strong>{{ ragStage?.status || 'skip' }}</strong>
            <small>{{ ragStage?.detail || '未进入 RAG' }}</small>
          </div>
          <div>
            <span>5. 生成答案</span>
            <strong>{{ activeDetailLog.route === 'rag' ? 'RAG 直答' : 'LLM 回复' }}</strong>
            <small>{{ llmStage?.detail || activeDetailLog.intent }}</small>
          </div>
        </section>

        <section class="trace-summary-grid">
          <div>
            <span>总耗时</span>
            <strong>{{ formatLatency(activeDetailLog.total_latency_ms) }}</strong>
          </div>
          <div>
            <span>会话</span>
            <strong>{{ activeDetailLog.conversation_id }}</strong>
          </div>
          <div>
            <span>意图</span>
            <strong>{{ activeDetailLog.intent || '-' }}</strong>
          </div>
          <div>
            <span>模型</span>
            <strong>{{ activeDetailLog.model_used || '-' }}</strong>
          </div>
          <div>
            <span>转人工</span>
            <strong>{{ activeDetailLog.handoff_required ? '是' : '否' }}</strong>
          </div>
          <div>
            <span>风险</span>
            <strong>{{ activeDetailLog.risk_level || '-' }}</strong>
          </div>
        </section>

        <section v-if="activeDetailLog.error_message" class="notice danger">
          {{ activeDetailLog.error_message }}
        </section>

        <section class="trace-block">
          <h2>回复内容</h2>
          <p>{{ activeDetailLog.response_text || '无回复内容' }}</p>
        </section>

        <section class="trace-block">
          <h2>阶段耗时</h2>
          <div class="stage-list">
            <div v-for="stage in detailStages" :key="`${stage.name}-${stage.status}`" class="stage-row">
              <span>{{ stage.name }}</span>
              <em>{{ stage.status }}</em>
              <strong>{{ formatLatency(stage.latency_ms) }}</strong>
              <small>{{ stage.detail }}</small>
            </div>
          </div>
        </section>

        <section class="trace-block">
          <h2>RAG 检索</h2>
          <p v-if="detailRagMatches.length === 0" class="admin-muted">没有召回候选，或未进入 RAG</p>
          <div v-for="match in detailRagMatches" :key="match.chunk_id" class="rag-match-row">
            <strong>{{ match.title || match.knowledge_id }}</strong>
            <span>{{ match.knowledge_id }} / {{ match.chunk_id }} / {{ match.score.toFixed(3) }}</span>
            <p>{{ match.chunk_text || match.content }}</p>
          </div>
        </section>

        <section class="trace-block">
          <h2>最终答案</h2>
          <p>{{ activeDetailLog.response_text || '无回复内容' }}</p>
        </section>

        <button class="modal-close" @click="detailId = null">关闭</button>
      </article>
      </div>
    </section>
  </main>
</template>
