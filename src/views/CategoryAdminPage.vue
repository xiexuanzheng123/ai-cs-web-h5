<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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
const error = ref('')

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
  error.value = ''
  try {
    categories.value = await fetchCategories()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分类加载失败'
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
    error.value = '分类名称不能为空'
    return
  }
  saving.value = true
  error.value = ''
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分类保存失败'
  } finally {
    saving.value = false
  }
}

async function removeCategory(row: CategoryRecord) {
  if (!window.confirm(`确认删除分类「${row.name}」吗？`)) return
  error.value = ''
  try {
    await deleteCategory(row.id)
    await loadCategories()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分类删除失败'
  }
}
</script>

<template>
  <main class="admin-shell category-admin-page">
    <header class="page-heading">
      <div>
        <strong>分类管理</strong>
        <span>维护知识分类树，当前支持最多三级</span>
      </div>
      <nav aria-label="面包屑">首页 &gt; 客服数据 &gt; 分类管理</nav>
    </header>

    <section class="category-toolbar">
      <div>
        <strong>分类管理</strong>
        <span>共 {{ categories.length }} 个分类</span>
      </div>
      <div>
        <button type="button" :disabled="loading" @click="loadCategories">
          {{ loading ? '刷新中' : '刷新' }}
        </button>
        <button type="button" class="primary" @click="openCreateRootDialog">新增一级分类</button>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="category-table-panel">
      <div v-if="loading" class="admin-muted category-loading">正在加载分类...</div>
      <div v-else class="category-table-wrap">
        <table class="category-table">
          <thead>
            <tr>
              <th>分类名称</th>
              <th>分类路径</th>
              <th>排序</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="flatCategories.length === 0">
              <td colspan="4" class="category-empty">暂无分类</td>
            </tr>
            <tr v-for="row in flatCategories" :key="row.id">
              <td>
                <div class="category-name-cell" :style="{ paddingLeft: `${(row.level - 1) * 28}px` }">
                  <button
                    v-if="row.has_children"
                    type="button"
                    class="category-toggle"
                    @click="toggleCategory(row.id)"
                  >
                    {{ row.collapsed ? '▶' : '▼' }}
                  </button>
                  <span v-else class="category-toggle-placeholder"></span>
                  <strong>{{ row.name }}</strong>
                  <em :class="`level-${row.level}`">L{{ row.level }}</em>
                  <span class="category-child-count">({{ row.child_count }})</span>
                </div>
              </td>
              <td>{{ row.path_label }}</td>
              <td>{{ row.sort_order }}</td>
              <td class="category-op-cell">
                <button v-if="row.level < 3" type="button" @click="openCreateChildDialog(row)">
                  新增子类
                </button>
                <button type="button" @click="openEditDialog(row)">编辑</button>
                <button type="button" class="danger" @click="removeCategory(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="dialogVisible" class="admin-dialog-mask" @click.self="closeDialog">
      <section class="admin-dialog category-dialog">
        <header>
          <strong>{{ editingId ? '编辑分类' : '新增分类' }}</strong>
          <button type="button" @click="closeDialog">×</button>
        </header>
        <div class="category-form">
          <label>
            <span>父级分类</span>
            <select v-model.number="form.parent_id" :disabled="Boolean(editingId)">
              <option :value="0">一级分类</option>
              <option v-for="item in parentOptions" :key="item.id" :value="item.id">
                {{ formatParentLabel(item.parent_id) }} / {{ item.name }}
              </option>
            </select>
          </label>
          <label>
            <span>分类名称</span>
            <input v-model="form.name" placeholder="请输入分类名称" />
          </label>
          <label>
            <span>排序</span>
            <input v-model.number="form.sort_order" type="number" min="0" />
          </label>
        </div>
        <footer>
          <button type="button" @click="closeDialog">取消</button>
          <button type="button" class="primary" :disabled="saving" @click="saveCategory">
            {{ saving ? '保存中' : '保存' }}
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
