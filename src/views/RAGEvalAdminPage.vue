<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createRAGEvalCase,
  fetchRAGEvalCases,
  fetchRAGEvalRuns,
  runRAGEvalCases,
  updateRAGEvalCase,
  type RAGEvalCaseInput,
  type RAGEvalCaseRecord,
  type RAGEvalRunRecord,
  type RAGEvalRunResult,
} from '../api/knowledge'

const emptyForm: RAGEvalCaseInput = {
  case_id: '',
  query_text: '',
  expected_knowledge_id: '',
  expected_intent: '',
  should_answer: true,
  status: 'active',
}

const cases = ref<RAGEvalCaseRecord[]>([])
const form = ref<RAGEvalCaseInput>({ ...emptyForm })
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const running = ref(false)
const historyLoading = ref(false)
const filterStatus = ref('all')
const error = ref('')
const runResult = ref<RAGEvalRunResult | null>(null)
const runHistory = ref<RAGEvalRunRecord[]>([])
const activeRunID = ref('')

const filteredCases = computed(() => {
  if (filterStatus.value === 'all') return cases.value
  return cases.value.filter((item) => item.status === filterStatus.value)
})

onMounted(() => {
  void loadCases()
  void loadRunHistory()
})

async function loadCases() {
  loading.value = true
  error.value = ''
  try {
    cases.value = await fetchRAGEvalCases()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'RAG 回归集加载失败'
  } finally {
    loading.value = false
  }
}

function editCase(item: RAGEvalCaseRecord) {
  editingId.value = item.id
  form.value = {
    case_id: item.case_id,
    query_text: item.query_text,
    expected_knowledge_id: item.expected_knowledge_id,
    expected_intent: item.expected_intent,
    should_answer: item.should_answer,
    status: item.status,
  }
}

function resetForm() {
  editingId.value = null
  form.value = { ...emptyForm }
}

async function submitCase() {
  if (!form.value.case_id.trim() || !form.value.query_text.trim()) {
    error.value = '请填写 Case ID 和问题'
    return
  }

  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await updateRAGEvalCase(editingId.value, form.value)
    } else {
      await createRAGEvalCase(form.value)
    }
    resetForm()
    await loadCases()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'RAG case 保存失败'
  } finally {
    saving.value = false
  }
}

async function toggleCase(item: RAGEvalCaseRecord) {
  try {
    await updateRAGEvalCase(item.id, {
      case_id: item.case_id,
      query_text: item.query_text,
      expected_knowledge_id: item.expected_knowledge_id,
      expected_intent: item.expected_intent,
      should_answer: item.should_answer,
      status: item.status === 'active' ? 'disabled' : 'active',
    })
    await loadCases()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'RAG case 状态更新失败'
  }
}

async function runEval() {
  running.value = true
  error.value = ''
  try {
    runResult.value = await runRAGEvalCases()
    await loadRunHistory()
    activeRunID.value = runHistory.value[0]?.run_id ?? ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'RAG 回归运行失败'
  } finally {
    running.value = false
  }
}

async function loadRunHistory() {
  historyLoading.value = true
  try {
    runHistory.value = await fetchRAGEvalRuns(10)
    if (!activeRunID.value && runHistory.value.length > 0) {
      activeRunID.value = runHistory.value[0].run_id
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'RAG 回归历史加载失败'
  } finally {
    historyLoading.value = false
  }
}

function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)}%`
}

const failedRunItems = computed(() => runResult.value?.items.filter((item) => !item.passed) ?? [])

const activeRun = computed(() => {
  return runHistory.value.find((item) => item.run_id === activeRunID.value) ?? runHistory.value[0] ?? null
})

const activeRunFailedItems = computed(() => activeRun.value?.items.filter((item) => !item.passed) ?? [])
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>RAG 回归集</strong>
        <span>{{ cases.length }} 条 case / {{ filteredCases.length }} 条当前筛选</span>
      </div>
      <button type="button" :disabled="running" @click="runEval">
        {{ running ? '运行中' : '运行回归' }}
      </button>
    </header>

    <section v-if="runResult" class="eval-result-panel">
      <div>
        <span>总数</span>
        <strong>{{ runResult.total }}</strong>
      </div>
      <div>
        <span>通过</span>
        <strong>{{ runResult.passed }}</strong>
      </div>
      <div>
        <span>失败</span>
        <strong>{{ runResult.failed }}</strong>
      </div>
      <div>
        <span>通过率</span>
        <strong>{{ formatPercent(runResult.pass_rate) }}</strong>
      </div>
      <div>
        <span>耗时</span>
        <strong>{{ runResult.duration_ms }} ms</strong>
      </div>
    </section>

    <section v-if="failedRunItems.length" class="eval-failed-panel">
      <strong>失败 Case</strong>
      <article v-for="item in failedRunItems" :key="item.case_id">
        <div>
          <b>{{ item.query_text }}</b>
          <span>{{ item.case_id }}</span>
        </div>
        <p>
          {{ item.reason }}；期望 {{ item.expected_knowledge_id || '-' }}，Top1
          {{ item.top1_knowledge_id || '-' }} / {{ item.top1_score.toFixed(3) }}
        </p>
      </article>
    </section>

    <section class="eval-history-panel">
      <div class="eval-history-title">
        <div>
          <strong>最近运行历史</strong>
          <span>保存每次回归批次，便于对比知识库和检索参数调整效果</span>
        </div>
        <button type="button" :disabled="historyLoading" @click="loadRunHistory">
          {{ historyLoading ? '刷新中' : '刷新历史' }}
        </button>
      </div>
      <p v-if="!historyLoading && runHistory.length === 0" class="admin-muted">暂无运行历史</p>
      <div v-else class="eval-history-layout">
        <div class="eval-run-list">
          <button
            v-for="item in runHistory"
            :key="item.run_id"
            type="button"
            :class="{ active: item.run_id === activeRun?.run_id }"
            @click="activeRunID = item.run_id"
          >
            <b>{{ formatPercent(item.pass_rate) }}</b>
            <span>{{ item.created_at }}</span>
            <small>{{ item.passed }}/{{ item.total }} 通过 · {{ item.duration_ms }} ms</small>
          </button>
        </div>
        <div v-if="activeRun" class="eval-run-detail">
          <div class="eval-run-summary">
            <span>批次 {{ activeRun.run_id }}</span>
            <b>{{ activeRun.passed }}/{{ activeRun.total }} 通过</b>
            <em>{{ activeRun.duration_ms }} ms</em>
          </div>
          <div v-if="activeRunFailedItems.length" class="eval-run-failures">
            <article v-for="item in activeRunFailedItems" :key="`${activeRun.run_id}-${item.case_id}`">
              <div>
                <b>{{ item.query_text }}</b>
                <span>{{ item.case_id }}</span>
              </div>
              <p>
                {{ item.reason }}；期望 {{ item.expected_knowledge_id || '-' }}，Top1
                {{ item.top1_knowledge_id || '-' }} / {{ item.top1_score.toFixed(3) }}
              </p>
            </article>
          </div>
          <p v-else class="admin-muted">本次回归没有失败 case</p>
        </div>
      </div>
    </section>

    <section class="rule-editor">
      <div class="field">
        <label>Case ID</label>
        <input v-model="form.case_id" placeholder="rag_case_member_cancel_auto_renew" />
      </div>
      <div class="field">
        <label>期望知识 ID</label>
        <input v-model="form.expected_knowledge_id" placeholder="kb_member_auto_renew_cancel" />
      </div>
      <div class="field">
        <label>期望意图</label>
        <input v-model="form.expected_intent" placeholder="member_auto_renew" />
      </div>
      <div class="field">
        <label>状态</label>
        <select v-model="form.status">
          <option value="active">active</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      <label class="check-field">
        <input v-model="form.should_answer" type="checkbox" />
        应该回答
      </label>
      <div class="field field-wide">
        <label>问题</label>
        <textarea v-model="form.query_text" rows="3" placeholder="会员怎么取消自动续费"></textarea>
      </div>
      <div class="form-actions">
        <button :disabled="saving" @click="submitCase">
          {{ editingId ? '保存 Case' : '新增 Case' }}
        </button>
        <button type="button" @click="resetForm">清空</button>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="rule-toolbar">
      <div class="field">
        <label>筛选状态</label>
        <select v-model="filterStatus">
          <option value="all">全部</option>
          <option value="active">active</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      <button :disabled="loading" @click="loadCases">
        {{ loading ? '刷新中' : '刷新列表' }}
      </button>
    </section>

    <p v-if="loading" class="admin-muted">正在加载 RAG 回归集...</p>
    <p v-else-if="filteredCases.length === 0" class="empty-state">暂无 case</p>

    <section class="rule-list">
      <article v-for="item in filteredCases" :key="item.id" class="rule-row">
        <div>
          <div class="rule-title">
            <span>{{ item.query_text }}</span>
            <em :class="{ off: item.status !== 'active' }">{{ item.status }}</em>
            <small>{{ item.case_id }}</small>
          </div>
          <p>
            {{ item.expected_knowledge_id || '无期望知识' }} /
            {{ item.expected_intent || '无期望意图' }} /
            {{ item.should_answer ? '应该回答' : '不应回答' }}
          </p>
        </div>
        <div class="rule-actions">
          <button @click="editCase(item)">编辑</button>
          <button :class="{ danger: item.status === 'active' }" @click="toggleCase(item)">
            {{ item.status === 'active' ? '停用' : '启用' }}
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
