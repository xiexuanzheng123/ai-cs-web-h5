<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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

const emptyFilters = {
  keyword: '',
  status: 'all',
  category: 'all',
  owner: '',
  version: '',
  hasContent: 'all',
}

const records = ref<KnowledgeRecord[]>([])
const selectedIds = ref<number[]>([])
const form = ref<KnowledgeInput>({ ...emptyForm })
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const error = ref('')
const filters = reactive({ ...emptyFilters })
const page = reactive({
  current: 1,
  pageSize: 20,
})

const categoryOptions = computed(() => {
  const values = records.value.map((item) => item.category).filter(Boolean)
  return Array.from(new Set(values)).sort()
})

const pendingCount = computed(() => records.value.filter((item) => item.status === 'draft').length)

const filteredRecords = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const owner = filters.owner.trim().toLowerCase()
  const version = filters.version.trim().toLowerCase()

  return records.value.filter((record) => {
    const haystack = [record.knowledge_id, record.title, record.content, record.category, record.owner]
      .join(' ')
      .toLowerCase()
    if (keyword && !haystack.includes(keyword)) return false
    if (filters.status !== 'all' && record.status !== filters.status) return false
    if (filters.category !== 'all' && record.category !== filters.category) return false
    if (owner && !record.owner.toLowerCase().includes(owner)) return false
    if (version && !record.version.toLowerCase().includes(version)) return false
    if (filters.hasContent === 'yes' && !record.content.trim()) return false
    if (filters.hasContent === 'no' && record.content.trim()) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / page.pageSize)))
const pagedRecords = computed(() => {
  const start = (page.current - 1) * page.pageSize
  return filteredRecords.value.slice(start, start + page.pageSize)
})
const selectionSummary = computed(() => `批量删除(${selectedIds.value.length})`)

onMounted(() => {
  void loadKnowledge()
})

async function loadKnowledge() {
  loading.value = true
  error.value = ''
  try {
    records.value = await fetchKnowledge()
    selectedIds.value = []
    page.current = 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : '知识库加载失败'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, emptyFilters)
  page.current = 1
}

function openCreateDialog() {
  editingId.value = null
  form.value = { ...emptyForm }
  dialogVisible.value = true
}

function openEditDialog(record: KnowledgeRecord) {
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
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
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
    closeDialog()
    await loadKnowledge()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '知识保存失败'
  } finally {
    saving.value = false
  }
}

async function updateStatus(record: KnowledgeRecord, status: string) {
  error.value = ''
  try {
    await updateKnowledge(record.id, {
      knowledge_id: record.knowledge_id,
      title: record.title,
      content: record.content,
      category: record.category,
      owner: record.owner,
      version: record.version,
      status,
    })
    await loadKnowledge()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '状态更新失败'
  }
}

function toggleSelection(record: KnowledgeRecord) {
  if (selectedIds.value.includes(record.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== record.id)
    return
  }
  selectedIds.value = [...selectedIds.value, record.id]
}

function toggleAllSelection(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedIds.value = checked ? pagedRecords.value.map((item) => item.id) : []
}

function changePage(nextPage: number) {
  page.current = Math.min(Math.max(1, nextPage), totalPages.value)
}

function changePageSize(event: Event) {
  page.pageSize = Number((event.target as HTMLSelectElement).value)
  page.current = 1
}

function formatStatus(status: string) {
  if (status === 'published') return '通过'
  if (status === 'draft') return '待审核'
  if (status === 'disabled') return '已停用'
  return status || '--'
}

function statusClass(status: string) {
  return {
    published: status === 'published',
    draft: status === 'draft',
    disabled: status === 'disabled',
  }
}

function contentSummary(content: string) {
  const text = content.trim()
  return text.length > 92 ? `${text.slice(0, 92)}...` : text
}
</script>

<template>
  <main class="admin-shell knowledge-manage-page">
    <header class="page-heading">
      <div>
        <strong>知识管理</strong>
      </div>
      <nav aria-label="面包屑">首页 &gt; 客服数据 &gt; 知识管理</nav>
    </header>

    <section class="knowledge-filter-panel">
      <div class="knowledge-filters">
        <label>
          <span>关键词</span>
          <input v-model="filters.keyword" placeholder="请输入标题/问答/关键词" />
        </label>
        <label>
          <span>审核状态</span>
          <select v-model="filters.status">
            <option value="all">全部</option>
            <option value="draft">待审核</option>
            <option value="published">通过</option>
            <option value="disabled">已停用</option>
          </select>
        </label>
        <label>
          <span>图片</span>
          <select v-model="filters.hasContent">
            <option value="all">全部</option>
            <option value="yes">有答案内容</option>
            <option value="no">无答案内容</option>
          </select>
        </label>
        <label>
          <span>分类</span>
          <select v-model="filters.category">
            <option value="all">全部分类</option>
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>
        <label>
          <span>申请人</span>
          <input v-model="filters.owner" placeholder="请输入申请人" />
        </label>
        <label>
          <span>创建人</span>
          <input v-model="filters.owner" placeholder="请输入创建人" />
        </label>
        <label>
          <span>审核人</span>
          <input disabled placeholder="暂未接入" />
        </label>
        <label>
          <span>版本</span>
          <input v-model="filters.version" placeholder="请输入版本" />
        </label>
      </div>

      <div class="knowledge-actions">
        <button type="button" @click="resetFilters">重置</button>
        <button type="button" class="primary" @click="loadKnowledge">搜索</button>
        <button type="button" :disabled="selectedIds.length === 0">{{ selectionSummary }}</button>
        <button type="button">导入 Excel</button>
        <button type="button" class="primary" @click="openCreateDialog">新建</button>
      </div>

      <div class="knowledge-stat">
        <span>待审核</span>
        <strong>{{ pendingCount }}</strong>
        <span>条</span>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="knowledge-table-panel">
      <div class="knowledge-table-title">
        <strong>知识管理</strong>
        <span>共 {{ filteredRecords.length }} 条</span>
      </div>

      <div v-if="loading" class="admin-muted knowledge-loading">正在加载知识库...</div>
      <div v-else class="knowledge-table-wrap">
        <table class="knowledge-table">
          <thead>
            <tr>
              <th class="select-col">
                <input
                  type="checkbox"
                  :checked="pagedRecords.length > 0 && pagedRecords.every((item) => selectedIds.includes(item.id))"
                  @change="toggleAllSelection"
                />
              </th>
              <th>序号</th>
              <th>问题</th>
              <th>答案摘要</th>
              <th>状态</th>
              <th>关键词</th>
              <th>来源</th>
              <th>分类</th>
              <th>申请人</th>
              <th>创建人</th>
              <th>审核人</th>
              <th>更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredRecords.length === 0">
              <td colspan="13" class="knowledge-empty">暂无知识</td>
            </tr>
            <tr v-for="(record, index) in pagedRecords" :key="record.id">
              <td class="select-col">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(record.id)"
                  @change="toggleSelection(record)"
                />
              </td>
              <td>{{ (page.current - 1) * page.pageSize + index + 1 }}</td>
              <td class="question-cell">{{ record.title }}</td>
              <td class="answer-cell">{{ contentSummary(record.content) }}</td>
              <td>
                <span class="status-tag" :class="statusClass(record.status)">
                  {{ formatStatus(record.status) }}
                </span>
              </td>
              <td>{{ record.title }}</td>
              <td>后台维护</td>
              <td>{{ record.category }}</td>
              <td>{{ record.owner }}</td>
              <td>{{ record.owner }}</td>
              <td>--</td>
              <td>{{ record.version }}</td>
              <td class="operation-cell">
                <button type="button" @click="openEditDialog(record)">详情</button>
                <button type="button" @click="openEditDialog(record)">编辑</button>
                <button type="button" @click="updateStatus(record, 'published')">审核</button>
                <button type="button" class="danger" @click="updateStatus(record, 'disabled')">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && filteredRecords.length > 0" class="table-pagination">
        <span>共 {{ filteredRecords.length }} 条</span>
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

    <div v-if="dialogVisible" class="admin-dialog-mask" @click.self="closeDialog">
      <section class="admin-dialog knowledge-dialog">
        <header>
          <strong>{{ editingId ? '编辑知识' : '新建知识' }}</strong>
          <button type="button" @click="closeDialog">×</button>
        </header>
        <div class="knowledge-form-grid">
          <label>
            <span>知识 ID</span>
            <input v-model="form.knowledge_id" placeholder="kb_member_auto_renew_cancel" />
          </label>
          <label>
            <span>标题 / 问题</span>
            <input v-model="form.title" placeholder="会员自动续费取消说明" />
          </label>
          <label>
            <span>分类</span>
            <input v-model="form.category" placeholder="member / account / recharge" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="form.status">
              <option value="published">通过</option>
              <option value="draft">待审核</option>
              <option value="disabled">已停用</option>
            </select>
          </label>
          <label>
            <span>申请人 / 创建人</span>
            <input v-model="form.owner" placeholder="cs_operation" />
          </label>
          <label>
            <span>版本</span>
            <input v-model="form.version" placeholder="v1" />
          </label>
          <label class="wide">
            <span>答案内容</span>
            <textarea v-model="form.content" rows="8" placeholder="填写可用于 RAG 回答的知识正文"></textarea>
          </label>
        </div>
        <footer>
          <button type="button" @click="closeDialog">取消</button>
          <button type="button" class="primary" :disabled="saving" @click="submitKnowledge">
            {{ saving ? '保存中' : '保存' }}
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
