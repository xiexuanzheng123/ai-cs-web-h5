<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createKnowledge,
  fetchKnowledge,
  updateKnowledge,
  type KnowledgeInput,
  type KnowledgeRecord,
} from '../api/knowledge'

const emptyForm: KnowledgeInput = {
  knowledge_id: '',
  title: '',
  content: '',
  category: 'account',
  owner: 'cs_operation',
  version: 'v1',
  status: 'published',
}

const records = ref<KnowledgeRecord[]>([])
const form = ref<KnowledgeInput>({ ...emptyForm })
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const filterStatus = ref('all')
const error = ref('')

const filteredRecords = computed(() => {
  if (filterStatus.value === 'all') return records.value
  return records.value.filter((record) => record.status === filterStatus.value)
})

onMounted(() => {
  void loadKnowledge()
})

async function loadKnowledge() {
  loading.value = true
  error.value = ''
  try {
    records.value = await fetchKnowledge()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '知识库加载失败'
  } finally {
    loading.value = false
  }
}

function editRecord(record: KnowledgeRecord) {
  editingId.value = record.id
  form.value = {
    knowledge_id: record.knowledge_id,
    title: record.title,
    content: record.content,
    category: record.category,
    owner: record.owner,
    version: record.version,
    status: record.status,
  }
}

function resetForm() {
  editingId.value = null
  form.value = { ...emptyForm }
}

async function submitKnowledge() {
  if (!form.value.knowledge_id.trim() || !form.value.title.trim() || !form.value.content.trim()) {
    error.value = '请填写知识 ID、标题和内容'
    return
  }

  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await updateKnowledge(editingId.value, form.value)
    } else {
      await createKnowledge(form.value)
    }
    resetForm()
    await loadKnowledge()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '知识保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>知识库管理</strong>
        <span>{{ records.length }} 条知识 / {{ filteredRecords.length }} 条当前筛选</span>
      </div>
    </header>

    <section class="rule-editor">
      <div class="field">
        <label>知识 ID</label>
        <input v-model="form.knowledge_id" placeholder="kb_member_auto_renew_cancel" />
      </div>
      <div class="field">
        <label>标题</label>
        <input v-model="form.title" placeholder="会员自动续费取消说明" />
      </div>
      <div class="field">
        <label>分类</label>
        <input v-model="form.category" placeholder="member / account / recharge" />
      </div>
      <div class="field">
        <label>状态</label>
        <select v-model="form.status">
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      <div class="field">
        <label>Owner</label>
        <input v-model="form.owner" placeholder="cs_operation" />
      </div>
      <div class="field">
        <label>版本</label>
        <input v-model="form.version" placeholder="v1" />
      </div>
      <div class="field field-wide">
        <label>知识内容</label>
        <textarea v-model="form.content" rows="5" placeholder="填写可用于 RAG 回答的知识正文"></textarea>
      </div>
      <div class="form-actions">
        <button :disabled="saving" @click="submitKnowledge">
          {{ editingId ? '保存知识' : '新增知识' }}
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
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="disabled">disabled</option>
        </select>
      </div>
      <button :disabled="loading" @click="loadKnowledge">
        {{ loading ? '刷新中' : '刷新列表' }}
      </button>
    </section>

    <p v-if="loading" class="admin-muted">正在加载知识库...</p>
    <p v-else-if="filteredRecords.length === 0" class="empty-state">暂无知识</p>

    <section class="rule-list">
      <article v-for="record in filteredRecords" :key="record.id" class="rule-row knowledge-row">
        <div>
          <div class="rule-title">
            <span>{{ record.title }}</span>
            <em :class="{ off: record.status !== 'published' }">{{ record.status }}</em>
            <small>{{ record.knowledge_id }} / {{ record.category }} / {{ record.version }}</small>
          </div>
          <p>{{ record.content }}</p>
        </div>
        <div class="rule-actions">
          <button @click="editRecord(record)">编辑</button>
        </div>
      </article>
    </section>
  </main>
</template>
