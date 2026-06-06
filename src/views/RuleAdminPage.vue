<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import {
  createRule,
  fetchRules,
  reloadRules,
  type RuleConfig,
  type RuleConfigInput,
  updateRule,
} from '../api/rules'

const emptyForm: RuleConfigInput = {
  rule_type: 'faq',
  pattern: '',
  action: 'answer',
  priority: 0,
  enabled: true,
  description: '',
}

const rules = ref<RuleConfig[]>([])
const form = ref<RuleConfigInput>({ ...emptyForm })
const editingId = ref<number | null>(null)
const dialogVisible = ref(false)
const loading = ref(false)
const saving = ref(false)
const togglingId = ref<number | null>(null)
const filterType = ref('all')

const enabledCount = computed(() => rules.value.filter((rule) => rule.enabled).length)
const filteredRules = computed(() => {
  if (filterType.value === 'all') return rules.value
  return rules.value.filter((rule) => rule.rule_type === filterType.value)
})

onMounted(() => {
  void loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    rules.value = await fetchRules()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '规则加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingId.value = null
  form.value = { ...emptyForm }
  dialogVisible.value = true
}

function openEditDialog(rule: RuleConfig) {
  editingId.value = rule.id
  form.value = {
    rule_type: rule.rule_type,
    pattern: rule.pattern,
    action: rule.action,
    priority: rule.priority,
    enabled: rule.enabled,
    description: rule.description,
  }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

async function submitRule() {
  if (!form.value.pattern.trim()) {
    ElMessage.warning('请填写匹配内容')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateRule(editingId.value, form.value)
    } else {
      await createRule(form.value)
    }
    try {
      await reloadRules()
    } catch (err) {
      ElMessage.warning(
        err instanceof Error ? `规则已保存，但刷新缓存失败：${err.message}` : '规则已保存，但刷新缓存失败',
      )
    }
    closeDialog()
    await loadRules()
    ElMessage.success('规则已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '规则保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleRule(rule: RuleConfig) {
  togglingId.value = rule.id
  try {
    await updateRule(rule.id, {
      rule_type: rule.rule_type,
      pattern: rule.pattern,
      action: rule.action,
      priority: rule.priority,
      enabled: !rule.enabled,
      description: rule.description,
    })
    try {
      await reloadRules()
    } catch (err) {
      ElMessage.warning(
        err instanceof Error ? `规则已更新，但刷新缓存失败：${err.message}` : '规则已更新，但刷新缓存失败',
      )
    }
    await loadRules()
    ElMessage.success('规则状态已更新')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '规则状态更新失败')
  } finally {
    togglingId.value = null
  }
}

function ruleTypeLabel(type: string) {
  const map: Record<string, string> = {
    greeting: '问候',
    handoff: '转人工',
    risk: '高风险',
    faq: '固定 FAQ',
  }
  return map[type] || type
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    answer: '直接回复',
    handoff: '转人工',
    guide: '引导',
  }
  return map[action] || action
}
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="规则配置"
      :subtitle="`${enabledCount} 条启用 / ${rules.length} 条规则`"
      breadcrumb="首页 > 客服数据 > 规则配置"
    />

    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <el-select v-model="filterType" style="width: 160px">
          <el-option label="全部规则" value="all" />
          <el-option label="问候" value="greeting" />
          <el-option label="转人工" value="handoff" />
          <el-option label="高风险" value="risk" />
          <el-option label="固定 FAQ" value="faq" />
        </el-select>
        <div class="toolbar-actions">
          <el-button :loading="loading" @click="loadRules">刷新列表</el-button>
          <el-button type="primary" @click="openCreateDialog">新增规则</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" border :data="filteredRules" empty-text="暂无规则">
        <el-table-column label="匹配内容" min-width="220">
          <template #default="{ row }">
            <strong>{{ row.pattern }}</strong>
            <div class="sub-text">{{ row.description || '无说明' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ ruleTypeLabel(row.rule_type) }}</template>
        </el-table-column>
        <el-table-column label="动作" width="110">
          <template #default="{ row }">{{ actionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row as RuleConfig)">编辑</el-button>
            <el-button
              link
              :type="row.enabled ? 'danger' : 'success'"
              :loading="togglingId === row.id"
              @click="toggleRule(row as RuleConfig)"
            >
              {{ row.enabled ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑规则' : '新增规则'"
      width="640px"
      destroy-on-close
      @closed="closeDialog"
    >
      <el-form label-width="110px">
        <el-form-item label="规则类型">
          <el-select v-model="form.rule_type" style="width: 100%">
            <el-option label="问候" value="greeting" />
            <el-option label="转人工" value="handoff" />
            <el-option label="高风险" value="risk" />
            <el-option label="固定 FAQ" value="faq" />
          </el-select>
        </el-form-item>
        <el-form-item label="匹配内容">
          <el-input v-model="form.pattern" placeholder="例如：退款、密码错误过多" />
        </el-form-item>
        <el-form-item label="动作">
          <el-select v-model="form.action" style="width: 100%">
            <el-option label="直接回复" value="answer" />
            <el-option label="转人工" value="handoff" />
            <el-option label="引导" value="guide" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="说明 / 回复">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="运营备注或固定回复内容" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRule">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.toolbar-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.sub-text {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}
</style>
