<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type CategoryInput,
  type CategoryRecord,
} from '../api/knowledge'

interface FlatCategory extends CategoryRecord {
  path_label: string
  has_children: boolean
  collapsed: boolean
}

const emptyForm: CategoryInput = {
  parent_id: 0,
  name: '',
  sort_order: 0,
}

const categories = ref<CategoryRecord[]>([])
const collapsedIds = ref<number[]>([])
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive<CategoryInput>({ ...emptyForm })
const loading = ref(false)
const saving = ref(false)

const categoryNameMap = computed(() => {
  const map = new Map<number, string>()
  categories.value.forEach((item) => map.set(item.id, item.name))
  return map
})

const parentOptions = computed(() => categories.value.filter((item) => item.level < 3))

const flatCategories = computed<FlatCategory[]>(() => {
  const childrenMap = new Map<number, CategoryRecord[]>()
  categories.value.forEach((item) => {
    const parentId = item.parent_id || 0
    const list = childrenMap.get(parentId) ?? []
    list.push(item)
    childrenMap.set(parentId, list)
  })
  childrenMap.forEach((list) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  })

  const rows: FlatCategory[] = []
  const walk = (parentId: number, parentNames: string[]) => {
    const list = childrenMap.get(parentId) ?? []
    list.forEach((item) => {
      const names = [...parentNames, item.name]
      const hasChildren = (childrenMap.get(item.id) ?? []).length > 0
      const collapsed = collapsedIds.value.includes(item.id)
      rows.push({
        ...item,
        path_label: names.join(' / '),
        has_children: hasChildren,
        collapsed,
      })
      if (hasChildren && !collapsed) {
        walk(item.id, names)
      }
    })
  }
  walk(0, [])
  return rows
})

onMounted(() => {
  void loadCategories()
})

async function loadCategories() {
  loading.value = true
  try {
    categories.value = await fetchCategories()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '分类加载失败')
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm)
}

function openCreateRootDialog() {
  resetForm()
  dialogVisible.value = true
}

function openCreateChildDialog(row: CategoryRecord) {
  resetForm()
  form.parent_id = row.id
  dialogVisible.value = true
}

function openEditDialog(row: CategoryRecord) {
  editingId.value = row.id
  form.parent_id = row.parent_id || 0
  form.name = row.name
  form.sort_order = row.sort_order
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  resetForm()
}

function toggleCategory(id: number) {
  if (collapsedIds.value.includes(id)) {
    collapsedIds.value = collapsedIds.value.filter((item) => item !== id)
    return
  }
  collapsedIds.value = [...collapsedIds.value, id]
}

function formatParentLabel(parentId: number) {
  if (!parentId) return '一级分类'
  return categoryNameMap.value.get(parentId) || `#${parentId}`
}

async function saveCategory() {
  if (!form.name.trim()) {
    ElMessage.warning('分类名称不能为空')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateCategory(editingId.value, {
        parent_id: form.parent_id,
        name: form.name.trim(),
        sort_order: form.sort_order,
      })
    } else {
      await createCategory({
        parent_id: form.parent_id,
        name: form.name.trim(),
        sort_order: form.sort_order,
      })
    }
    closeDialog()
    await loadCategories()
    ElMessage.success('分类已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '分类保存失败')
  } finally {
    saving.value = false
  }
}

async function removeCategory(row: CategoryRecord) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${row.name}」吗？`, '删除确认', { type: 'warning' })
    await deleteCategory(row.id)
    await loadCategories()
    ElMessage.success('分类已删除')
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err instanceof Error ? err.message : '分类删除失败')
  }
}
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="分类管理"
      subtitle="维护知识分类树，当前支持最多三级"
      breadcrumb="首页 > 客服数据 > 分类管理"
    />

    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <span class="sub-text">共 {{ categories.length }} 个分类</span>
        <div class="toolbar-actions">
          <el-button :loading="loading" @click="loadCategories">刷新</el-button>
          <el-button type="primary" @click="openCreateRootDialog">新增一级分类</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" border :data="flatCategories" empty-text="暂无分类">
        <el-table-column label="分类名称" min-width="260">
          <template #default="{ row }">
            <div class="category-name-cell" :style="{ paddingLeft: `${(row.level - 1) * 20}px` }">
              <el-button
                v-if="row.has_children"
                link
                type="primary"
                @click="toggleCategory(row.id)"
              >
                {{ row.collapsed ? '▶' : '▼' }}
              </el-button>
              <span v-else class="toggle-placeholder" />
              <strong>{{ row.name }}</strong>
              <el-tag size="small" type="info">L{{ row.level }}</el-tag>
              <span class="sub-text">({{ row.child_count }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="path_label" label="分类路径" min-width="220" />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.level < 3" link type="primary" @click="openCreateChildDialog(row as CategoryRecord)">
              新增子类
            </el-button>
            <el-button link type="primary" @click="openEditDialog(row as CategoryRecord)">编辑</el-button>
            <el-button link type="danger" @click="removeCategory(row as CategoryRecord)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑分类' : '新增分类'"
      width="520px"
      destroy-on-close
      @closed="closeDialog"
    >
      <el-form label-width="90px">
        <el-form-item label="父级分类">
          <el-select v-model="form.parent_id" :disabled="Boolean(editingId)" style="width: 100%">
            <el-option :value="0" label="一级分类" />
            <el-option
              v-for="item in parentOptions"
              :key="item.id"
              :value="item.id"
              :label="`${formatParentLabel(item.parent_id)} / ${item.name}`"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.category-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-placeholder {
  display: inline-block;
  width: 24px;
}
</style>
