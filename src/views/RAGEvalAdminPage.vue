<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import {
  createRAGEvalCase,
  fetchRAGEvalCases,
  fetchRAGEvalRuns,
  runFullRAGEval,
  runRAGEvalCases,
  seedRAGEvalCases,
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
const dialogVisible = ref(false)
const loading = ref(false)
const saving = ref(false)
const running = ref(false)
const seeding = ref(false)
const fullRunning = ref(false)
const historyLoading = ref(false)
const filterStatus = ref('all')
const runResult = ref<RAGEvalRunResult | null>(null)
const runHistory = ref<RAGEvalRunRecord[]>([])
const activeRunID = ref('')
const seedMessage = ref('')

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
  try {
    cases.value = await fetchRAGEvalCases()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG 回归集加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingId.value = null
  form.value = { ...emptyForm }
  dialogVisible.value = true
}

function openEditDialog(item: RAGEvalCaseRecord) {
  editingId.value = item.id
  form.value = {
    case_id: item.case_id,
    query_text: item.query_text,
    expected_knowledge_id: item.expected_knowledge_id,
    expected_intent: item.expected_intent,
    should_answer: item.should_answer,
    status: item.status,
  }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

async function submitCase() {
  if (!form.value.case_id.trim() || !form.value.query_text.trim()) {
    ElMessage.warning('请填写 Case ID 和问题')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await updateRAGEvalCase(editingId.value, form.value)
    } else {
      await createRAGEvalCase(form.value)
    }
    closeDialog()
    await loadCases()
    ElMessage.success('Case 已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG case 保存失败')
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
    ElMessage.success('状态已更新')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG case 状态更新失败')
  }
}

async function runEval() {
  running.value = true
  try {
    runResult.value = await runRAGEvalCases()
    await loadRunHistory()
    activeRunID.value = runHistory.value[0]?.run_id ?? ''
    ElMessage.success('回归运行完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG 回归运行失败')
  } finally {
    running.value = false
  }
}

async function seedCases() {
  seeding.value = true
  seedMessage.value = ''
  try {
    const result = await seedRAGEvalCases(200)
    seedMessage.value = formatSeedMessage(result)
    await loadCases()
    ElMessage.success('Case 补齐完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG 回归集自动补齐失败')
  } finally {
    seeding.value = false
  }
}

async function runFullRegression() {
  fullRunning.value = true
  running.value = true
  seedMessage.value = ''
  try {
    const { seed, run } = await runFullRAGEval(200)
    seedMessage.value = formatSeedMessage(seed)
    runResult.value = run
    await loadCases()
    await loadRunHistory()
    activeRunID.value = runHistory.value[0]?.run_id ?? ''
    ElMessage.success('一键回归完成')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG 一键回归失败')
  } finally {
    fullRunning.value = false
    running.value = false
  }
}

function formatSeedMessage(result: {
  target_total: number
  before_total: number
  created: number
  negative_created: number
  after_total: number
}) {
  return `目标 ${result.target_total} 条正例，原有 ${result.before_total} 条，新增正例 ${result.created} 条、负例 ${result.negative_created} 条，当前 ${result.after_total} 条`
}

async function loadRunHistory() {
  historyLoading.value = true
  try {
    runHistory.value = await fetchRAGEvalRuns(10)
    if (!activeRunID.value && runHistory.value.length > 0) {
      activeRunID.value = runHistory.value[0].run_id
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : 'RAG 回归历史加载失败')
  } finally {
    historyLoading.value = false
  }
}

function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)}%`
}

function formatDuration(durationMS: number) {
  if (durationMS >= 60000) return `${(durationMS / 60000).toFixed(1)} 分钟`
  if (durationMS >= 1000) return `${(durationMS / 1000).toFixed(1)} 秒`
  return `${durationMS} ms`
}

function qualityOf(result: RAGEvalRunResult | RAGEvalRunRecord | null) {
  return (
    result?.quality_summary ?? {
      top1_hit_rate: 0,
      top3_hit_rate: 0,
      suspected_hallucination: 0,
    }
  )
}

const activeRun = computed(() => {
  return runHistory.value.find((item) => item.run_id === activeRunID.value) ?? runHistory.value[0] ?? null
})

const displayRun = computed(() => activeRun.value ?? runResult.value)

const activeRunFailedItems = computed(() => displayRun.value?.items.filter((item) => !item.passed) ?? [])

const activeCaseCount = computed(() => cases.value.filter((item) => item.status === 'active').length)

const overviewCards = computed(() => {
  const run = displayRun.value
  const quality = qualityOf(run)
  return [
    { label: 'Case 总数', value: String(cases.value.length), hint: `${activeCaseCount.value} 条启用中` },
    {
      label: '最新通过率',
      value: run ? formatPercent(run.pass_rate) : '--',
      hint: run ? `${run.passed}/${run.total} 通过` : '暂无运行记录',
      type: 'success',
    },
    {
      label: '最近耗时',
      value: run ? formatDuration(run.duration_ms) : '--',
      hint: run ? (run as RAGEvalRunRecord).created_at ?? '本次回归' : '运行后显示',
    },
    {
      label: 'Top1 命中',
      value: run ? formatPercent(quality.top1_hit_rate) : '--',
      hint: '期望知识排第一',
    },
    {
      label: 'Top3 命中',
      value: run ? formatPercent(quality.top3_hit_rate) : '--',
      hint: '期望知识在前三',
    },
    {
      label: '疑似幻觉',
      value: run ? String(quality.suspected_hallucination) : '--',
      hint: '不应回答却召回',
      type: (quality.suspected_hallucination ?? 0) > 0 ? 'warn' : '',
    },
  ]
})

const trendSummary = computed(() => {
  const runs = runHistory.value
  if (runs.length === 0) return { averagePassRate: 0, averageDuration: 0 }
  return {
    averagePassRate: runs.reduce((total, item) => total + item.pass_rate, 0) / runs.length,
    averageDuration: Math.round(runs.reduce((total, item) => total + item.duration_ms, 0) / runs.length),
  }
})

const failedCaseRanks = computed(() => {
  const rankMap = new Map<string, { caseID: string; queryText: string; failedCount: number }>()
  for (const run of runHistory.value) {
    for (const item of run.items.filter((caseItem) => !caseItem.passed)) {
      const existing = rankMap.get(item.case_id)
      if (existing) existing.failedCount += 1
      else rankMap.set(item.case_id, { caseID: item.case_id, queryText: item.query_text, failedCount: 1 })
    }
  }
  return [...rankMap.values()].sort((a, b) => b.failedCount - a.failedCount).slice(0, 5)
})
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="RAG 回归集"
      subtitle="固定测试题批量验证检索召回效果，支持历史对比与 case 管理"
      breadcrumb="首页 > 客服数据 > RAG 回归集"
    />

    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar-row">
        <div>
          <strong>回归操作</strong>
          <div class="sub-text">先补齐 case，再运行全量检索回归</div>
        </div>
        <div class="toolbar-actions">
          <el-button type="primary" :loading="fullRunning" @click="runFullRegression">一键回归</el-button>
          <el-button :loading="running" :disabled="fullRunning" @click="runEval">运行回归</el-button>
          <el-button :loading="seeding" :disabled="fullRunning" @click="seedCases">自动补齐 200 条</el-button>
        </div>
      </div>
    </el-card>

    <el-alert v-if="seedMessage" :title="seedMessage" type="info" show-icon :closable="false" />

    <el-row :gutter="12">
      <el-col v-for="card in overviewCards" :key="card.label" :xs="12" :sm="8" :md="4">
        <el-card shadow="never" class="metric-card">
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-value" :class="card.type">{{ card.value }}</div>
          <div class="sub-text">{{ card.hint }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="report-card">
          <template #header>
            <div class="table-card-header">
              <strong>运行报告</strong>
              <el-button size="small" :loading="historyLoading" @click="loadRunHistory">刷新历史</el-button>
            </div>
          </template>

          <el-empty v-if="!historyLoading && runHistory.length === 0" description="暂无运行历史，点击一键回归开始" />

          <el-row v-else :gutter="16">
            <el-col :span="8">
              <div class="run-list">
                <el-button
                  v-for="item in runHistory"
                  :key="item.run_id"
                  class="run-item"
                  :class="{ 'run-item--active': item.run_id === displayRun?.run_id }"
                  @click="activeRunID = item.run_id"
                >
                  <div>{{ formatPercent(item.pass_rate) }}</div>
                  <div class="sub-text">{{ item.created_at }}</div>
                  <div class="sub-text">{{ item.passed }}/{{ item.total }} · {{ formatDuration(item.duration_ms) }}</div>
                </el-button>
              </div>
            </el-col>
            <el-col :span="16">
              <template v-if="displayRun">
                <el-descriptions :column="3" border size="small" class="run-desc">
                  <el-descriptions-item label="批次">{{ displayRun.run_id }}</el-descriptions-item>
                  <el-descriptions-item label="通过">{{ displayRun.passed }}/{{ displayRun.total }}</el-descriptions-item>
                  <el-descriptions-item label="耗时">{{ formatDuration(displayRun.duration_ms) }}</el-descriptions-item>
                </el-descriptions>

                <el-table
                  v-if="activeRunFailedItems.length"
                  border
                  :data="activeRunFailedItems"
                  size="small"
                  class="fail-table"
                  empty-text="全部通过"
                >
                  <el-table-column prop="query_text" label="问题" min-width="160" show-overflow-tooltip />
                  <el-table-column prop="case_id" label="Case ID" width="140" />
                  <el-table-column label="详情" min-width="220">
                    <template #default="{ row }">
                      {{ row.reason }}；Top1 {{ row.top1_knowledge_id || '-' }} / {{ row.top1_score.toFixed(3) }}
                    </template>
                  </el-table-column>
                </el-table>
                <el-empty v-else description="本次回归全部通过" />
              </template>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="side-card">
          <template #header><strong>通过率趋势</strong></template>
          <el-descriptions :column="1" size="small">
            <el-descriptions-item label="平均通过率">{{ formatPercent(trendSummary.averagePassRate) }}</el-descriptions-item>
            <el-descriptions-item label="平均耗时">{{ formatDuration(trendSummary.averageDuration) }}</el-descriptions-item>
          </el-descriptions>
          <el-table v-if="runHistory.length" border :data="[...runHistory].reverse()" size="small">
            <el-table-column prop="created_at" label="时间" width="150" />
            <el-table-column label="通过率" width="80">
              <template #default="{ row }">{{ formatPercent(row.pass_rate) }}</template>
            </el-table-column>
            <el-table-column prop="failed" label="失败" width="60" />
          </el-table>
        </el-card>

        <el-card shadow="never" class="side-card">
          <template #header><strong>失败排行</strong></template>
          <el-empty v-if="failedCaseRanks.length === 0" description="暂无失败 case" />
          <el-table v-else border :data="failedCaseRanks" size="small">
            <el-table-column prop="queryText" label="问题" min-width="140" show-overflow-tooltip />
            <el-table-column prop="failedCount" label="次数" width="60" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-card-header">
          <div>
            <strong>Case 管理</strong>
            <span>{{ filteredCases.length }} 条筛选 / 共 {{ cases.length }} 条</span>
          </div>
          <div class="toolbar-actions">
            <el-select v-model="filterStatus" style="width: 120px">
              <el-option label="全部" value="all" />
              <el-option label="active" value="active" />
              <el-option label="disabled" value="disabled" />
            </el-select>
            <el-button type="primary" @click="openCreateDialog">新增 Case</el-button>
            <el-button :loading="loading" @click="loadCases">刷新列表</el-button>
          </div>
        </div>
      </template>

      <el-table v-loading="loading" border :data="filteredCases" empty-text="暂无 case">
        <el-table-column prop="query_text" label="问题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="case_id" label="Case ID" width="180" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.should_answer ? 'success' : 'warning'" size="small">
              {{ row.should_answer ? '正例' : '负例' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="期望知识" min-width="140">
          <template #default="{ row }">{{ row.expected_knowledge_id || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row as RAGEvalCaseRecord)">编辑</el-button>
            <el-button link :type="row.status === 'active' ? 'danger' : 'success'" @click="toggleCase(row as RAGEvalCaseRecord)">
              {{ row.status === 'active' ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑 Case' : '新增 Case'"
      width="640px"
      destroy-on-close
      @closed="closeDialog"
    >
      <el-form label-width="110px">
        <el-form-item label="Case ID">
          <el-input v-model="form.case_id" placeholder="rag_case_member_cancel_auto_renew" />
        </el-form-item>
        <el-form-item label="期望知识 ID">
          <el-input v-model="form.expected_knowledge_id" placeholder="kb_member_auto_renew_cancel" />
        </el-form-item>
        <el-form-item label="期望意图">
          <el-input v-model="form.expected_intent" placeholder="member_auto_renew" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="active" value="active" />
            <el-option label="disabled" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="应该回答">
          <el-switch v-model="form.should_answer" />
        </el-form-item>
        <el-form-item label="问题">
          <el-input v-model="form.query_text" type="textarea" :rows="4" placeholder="会员怎么取消自动续费" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitCase">{{ editingId ? '保存' : '新增' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.metric-card {
  margin-bottom: 12px;
}

.metric-label {
  color: #64748b;
  font-size: 13px;
}

.metric-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.metric-value.success {
  color: #16a34a;
}

.metric-value.warn {
  color: #b8956b;
}

.report-card,
.side-card {
  margin-bottom: 16px;
}

.run-list {
  display: grid;
  gap: 8px;
}

.run-item {
  width: 100%;
  height: auto;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  background: #ffffff;
  color: #334155;
}

.run-item--active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
}

.run-item--active .sub-text {
  color: #64748b;
}

.run-desc {
  margin-bottom: 12px;
}

.fail-table {
  margin-top: 8px;
}
</style>
