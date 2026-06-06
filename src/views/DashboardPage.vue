<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound,
  CircleCheck,
  CircleClose,
  Connection,
  Cpu,
  Refresh,
  Switch,
  Timer,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import {
  fetchDashboardStats,
  fetchFeatureFlags,
  updateFeatureFlag,
  type DashboardStats,
  type FeatureFlag,
} from '../api/admin'

interface MetricCard {
  label: string
  value: string | number
  tone: 'steel' | 'blue' | 'violet' | 'amber' | 'slate' | 'green' | 'muted'
  icon: typeof ChatDotRound
}

const stats = ref<DashboardStats | null>(null)
const flags = ref<FeatureFlag[]>([])
const loading = ref(false)
const togglingKey = ref('')

const flagLabels: Record<string, string> = {
  smart_reply_enabled: '智能回复',
  robot_entry_enabled: '机器人入口',
}

const primaryMetrics = computed<MetricCard[]>(() => {
  if (!stats.value) return []
  return [
    {
      label: '会话数',
      value: stats.value.total_conversations,
      tone: 'steel',
      icon: ChatDotRound,
    },
    {
      label: '消息数',
      value: stats.value.total_messages,
      tone: 'blue',
      icon: Connection,
    },
    {
      label: 'AI 事件',
      value: stats.value.total_ai_events,
      tone: 'violet',
      icon: Cpu,
    },
    {
      label: '平均耗时',
      value: `${stats.value.average_latency_ms.toFixed(1)} ms`,
      tone: 'amber',
      icon: Timer,
    },
  ]
})

const secondaryMetrics = computed<MetricCard[]>(() => {
  if (!stats.value) return []
  return [
    {
      label: '规则命中',
      value: stats.value.rule_hit_count,
      tone: 'slate',
      icon: TrendCharts,
    },
    {
      label: '转人工',
      value: stats.value.handoff_count,
      tone: 'slate',
      icon: User,
    },
    {
      label: '反馈总数',
      value: stats.value.feedback_count,
      tone: 'slate',
      icon: ChatDotRound,
    },
    {
      label: '有用反馈',
      value: stats.value.positive_feedback,
      tone: 'green',
      icon: CircleCheck,
    },
    {
      label: '没用反馈',
      value: stats.value.negative_feedback,
      tone: 'muted',
      icon: CircleClose,
    },
  ]
})

const hasMetrics = computed(() => primaryMetrics.value.length > 0)

onMounted(() => {
  void loadDashboard()
})

async function loadDashboard() {
  loading.value = true
  try {
    const [nextStats, nextFlags] = await Promise.all([fetchDashboardStats(), fetchFeatureFlags()])
    stats.value = nextStats
    flags.value = nextFlags
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '看板加载失败')
  } finally {
    loading.value = false
  }
}

function flagTitle(flag: FeatureFlag) {
  return flagLabels[flag.key] ?? flag.key
}

async function toggleFlag(flag: FeatureFlag) {
  togglingKey.value = flag.key
  try {
    const updated = await updateFeatureFlag(flag.key, !flag.enabled)
    flags.value = flags.value.map((item) => (item.key === updated.key ? updated : item))
    ElMessage.success(updated.enabled ? '已开启' : '已关闭')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '灰度开关更新失败')
  } finally {
    togglingKey.value = ''
  }
}
</script>

<template>
  <div v-loading="loading" class="dashboard-page">
    <AdminPageHeader
      title="基础看板"
      subtitle="规则路由、转人工、反馈和延迟统计"
      breadcrumb="首页 > 客服数据 > 基础看板"
    >
      <template #actions>
        <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadDashboard">
          刷新看板
        </el-button>
      </template>
    </AdminPageHeader>

    <template v-if="hasMetrics">
      <section class="metric-section">
        <h3 class="section-title">核心指标</h3>
        <div class="metric-grid metric-grid--primary">
          <article
            v-for="card in primaryMetrics"
            :key="card.label"
            class="metric-card"
            :class="`metric-card--${card.tone}`"
          >
            <div class="metric-icon">
              <el-icon :size="22"><component :is="card.icon" /></el-icon>
            </div>
            <div class="metric-body">
              <span class="metric-label">{{ card.label }}</span>
              <strong class="metric-value">{{ card.value }}</strong>
            </div>
          </article>
        </div>
      </section>

      <section class="metric-section">
        <h3 class="section-title">运营数据</h3>
        <div class="metric-grid metric-grid--secondary">
          <article
            v-for="card in secondaryMetrics"
            :key="card.label"
            class="metric-card metric-card--compact"
            :class="`metric-card--${card.tone}`"
          >
            <div class="metric-icon metric-icon--small">
              <el-icon :size="18"><component :is="card.icon" /></el-icon>
            </div>
            <div class="metric-body">
              <span class="metric-label">{{ card.label }}</span>
              <strong class="metric-value metric-value--compact">{{ card.value }}</strong>
            </div>
          </article>
        </div>
      </section>
    </template>
    <el-empty v-else-if="!loading" description="暂无统计数据" class="dashboard-empty" />

    <section class="flag-section">
      <div class="flag-section-header">
        <div class="flag-section-title">
          <el-icon :size="18"><Switch /></el-icon>
          <strong>灰度开关</strong>
        </div>
        <span class="flag-section-hint">控制机器人核心能力是否对外生效</span>
      </div>

      <el-empty v-if="flags.length === 0" description="暂无灰度开关" />
      <div v-else class="flag-list">
        <article v-for="flag in flags" :key="flag.key" class="flag-card">
          <div class="flag-info">
            <div class="flag-title-row">
              <strong>{{ flagTitle(flag) }}</strong>
              <el-tag :type="flag.enabled ? 'success' : 'info'" size="small" effect="light">
                {{ flag.enabled ? '已开启' : '已关闭' }}
              </el-tag>
            </div>
            <code class="flag-key">{{ flag.key }}</code>
            <p>{{ flag.description || '无说明' }}</p>
          </div>
          <el-switch
            :model-value="flag.enabled"
            :loading="togglingKey === flag.key"
            inline-prompt
            active-text="开"
            inactive-text="关"
            @change="toggleFlag(flag)"
          />
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

.metric-section + .metric-section {
  margin-top: 20px;
}

.section-title {
  margin: 0 0 12px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.metric-grid {
  display: grid;
  gap: 12px;
}

.metric-grid--primary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-grid--secondary {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 96px;
  padding: 16px 18px;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.metric-card--compact {
  min-height: 84px;
  padding: 14px 16px;
  gap: 12px;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}

.metric-icon--small {
  width: 38px;
  height: 38px;
  border-radius: 10px;
}

.metric-body {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.metric-label {
  color: #64748b;
  font-size: 13px;
}

.metric-value {
  color: #334155;
  font-size: 26px;
  line-height: 1.1;
  font-weight: 700;
}

.metric-value--compact {
  font-size: 22px;
}

.metric-card--steel .metric-icon {
  background: #ecf1f6;
  color: #5b7c9d;
}

.metric-card--blue .metric-icon {
  background: #eff6ff;
  color: #2563eb;
}

.metric-card--violet .metric-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.metric-card--amber .metric-icon {
  background: #fffbeb;
  color: #d97706;
}

.metric-card--slate .metric-icon {
  background: #f8fafc;
  color: #475569;
}

.metric-card--green .metric-icon {
  background: #ecfdf5;
  color: #059669;
}

.metric-card--muted .metric-icon {
  background: #eef3f7;
  color: #6b8cae;
}

.dashboard-empty {
  margin: 24px 0;
}

.flag-section {
  margin-top: 24px;
  padding: 18px 20px 20px;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.flag-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.flag-section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 15px;
}

.flag-section-hint {
  color: #94a3b8;
  font-size: 12px;
}

.flag-list {
  display: grid;
  gap: 12px;
}

.flag-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 16px;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  background: #fafbfc;
}

.flag-info {
  min-width: 0;
  flex: 1;
}

.flag-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.flag-title-row strong {
  color: #334155;
  font-size: 15px;
}

.flag-key {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.flag-info p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .metric-grid--primary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-grid--secondary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .metric-grid--primary,
  .metric-grid--secondary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flag-section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .flag-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
