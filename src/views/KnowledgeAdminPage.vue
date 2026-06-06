<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import {
  createKnowledge,
  fetchKnowledge,
  updateKnowledge,
  type KnowledgeInput,
  type KnowledgeRecord,
} from '../api/knowledge'

const emptyForm: KnowledgeInput = {
  knowledge_id: '',
  question: '',
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
const selectedRows = ref<KnowledgeRecord[]>([])
const form = ref<KnowledgeInput>({ ...emptyForm })
const editingId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const filters = reactive({ ...emptyFilters })
const page = reactive({ current: 1, pageSize: 20 })

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
    const haystack = [record.knowledge_id, record.question, record.content, record.category, record.owner]
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

const pagedRecords = computed(() => {
  const start = (page.current - 1) * page.pageSize
  return filteredRecords.value.slice(start, start + page.pageSize)
})

onMounted(() => {
  void loadKnowledge()
})

async function loadKnowledge() {
  loading.value = true
  try {
    records.value = await fetchKnowledge()
    selectedRows.value = []
    page.current = 1
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '知识库加载失败')
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
    question: record.question,
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
  if (!form.value.knowledge_id.trim() || !form.value.question.trim() || !form.value.content.trim()) {
    ElMessage.warning('请填写知识 ID、问题和内容')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateKnowledge(editingId.value, form.value)
    } else {
      await createKnowledge(form.value)
    }
    closeDialog()
    await loadKnowledge()
    ElMessage.success('知识已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '知识保存失败')
  } finally {
    saving.value = false
  }
}

async function updateStatus(record: KnowledgeRecord, status: string) {
  const action = status === 'disabled' ? '删除' : '审核'
  try {
    if (status === 'disabled') {
      await ElMessageBox.confirm(`确认${action}知识「${record.question}」吗？`, '操作确认', {
        type: 'warning',
      })
    }
    await updateKnowledge(record.id, {
      knowledge_id: record.knowledge_id,
      question: record.question,
      content: record.content,
      category: record.category,
      owner: record.owner,
      version: record.version,
      status,
    })
    await loadKnowledge()
    ElMessage.success('操作成功')
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err instanceof Error ? err.message : '状态更新失败')
  }
}

function formatStatus(status: string) {
  if (status === 'published') return '通过'
  if (status === 'draft') return '待审核'
  if (status === 'disabled') return '已停用'
  return status || '--'
}

function statusTagType(status: string): 'success' | 'warning' | 'info' {
  if (status === 'published') return 'success'
  if (status === 'draft') return 'warning'
  return 'info'
}

function contentSummary(content: string) {
  const text = content.trim()
  return text.length > 92 ? `${text.slice(0, 92)}...` : text
}
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader title="知识管理" breadcrumb="首页 > 客服数据 > 知识管理" />

    <el-card shadow="never" class="toolbar-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="问题/答案/关键词" clearable />
        </el-form-item>
        <el-form-item label="审核状态">
          <el-select v-model="filters.status" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="待审核" value="draft" />
            <el-option label="通过" value="published" />
            <el-option label="已停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-select v-model="filters.hasContent" style="width: 130px">
            <el-option label="全部" value="all" />
            <el-option label="有答案" value="yes" />
            <el-option label="无答案" value="no" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" style="width: 140px">
            <el-option label="全部分类" value="all" />
            <el-option v-for="category in categoryOptions" :key="category" :label="category" :value="category" />
          </el-select>
        </el-form-item>
        <el-form-item label="申请人">
          <el-input v-model="filters.owner" placeholder="申请人" clearable />
        </el-form-item>
        <el-form-item label="版本">
          <el-input v-model="filters.version" placeholder="版本" clearable />
        </el-form-item>
      </el-form>
      <div class="toolbar-row">
        <el-tag type="warning">待审核 {{ pendingCount }} 条</el-tag>
        <div class="toolbar-actions">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" :loading="loading" @click="loadKnowledge">搜索</el-button>
          <el-button :disabled="selectedRows.length === 0">批量删除({{ selectedRows.length }})</el-button>
          <el-button>导入 Excel</el-button>
          <el-button type="primary" @click="openCreateDialog">新建</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-card-header">
          <strong>知识列表</strong>
          <span>共 {{ filteredRecords.length }} 条</span>
        </div>
      </template>

      <el-table
        v-loading="loading"
        border
        :data="pagedRecords"
        empty-text="暂无知识"
        @selection-change="(rows: KnowledgeRecord[]) => (selectedRows = rows)"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="序号" width="70">
          <template #default="{ $index }">{{ (page.current - 1) * page.pageSize + $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="question" label="问题" min-width="180" show-overflow-tooltip />
        <el-table-column label="答案摘要" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ contentSummary(row.content) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ formatStatus(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="owner" label="申请人" width="120" />
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row as KnowledgeRecord)">编辑</el-button>
            <el-button link type="success" @click="updateStatus(row as KnowledgeRecord, 'published')">审核</el-button>
            <el-button link type="danger" @click="updateStatus(row as KnowledgeRecord, 'disabled')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page.current"
          v-model:page-size="page.pageSize"
          :total="filteredRecords.length"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑知识' : '新建知识'"
      width="720px"
      destroy-on-close
      @closed="closeDialog"
    >
      <el-form label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="知识 ID">
              <el-input v-model="form.knowledge_id" placeholder="kb_member_auto_renew_cancel" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="问题">
              <el-input v-model="form.question" placeholder="会员自动续费怎么取消" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="form.category" placeholder="member / account" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="通过" value="published" />
                <el-option label="待审核" value="draft" />
                <el-option label="已停用" value="disabled" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="申请人">
              <el-input v-model="form.owner" placeholder="cs_operation" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本">
              <el-input v-model="form.version" placeholder="v1" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="答案内容">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="8"
                placeholder="填写可用于 RAG 回答的知识正文"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitKnowledge">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-form {
  margin-bottom: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
