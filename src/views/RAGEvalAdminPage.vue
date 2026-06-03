<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createRAGEvalCase,
  fetchRAGEvalCases,
  updateRAGEvalCase,
  type RAGEvalCaseInput,
  type RAGEvalCaseRecord,
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
const filterStatus = ref('all')
const error = ref('')

const filteredCases = computed(() => {
  if (filterStatus.value === 'all') return cases.value
  return cases.value.filter((item) => item.status === filterStatus.value)
})

onMounted(() => {
  void loadCases()
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
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>RAG 回归集</strong>
        <span>{{ cases.length }} 条 case / {{ filteredCases.length }} 条当前筛选</span>
      </div>
    </header>

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
