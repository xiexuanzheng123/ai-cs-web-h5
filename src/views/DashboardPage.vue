<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  fetchDashboardStats,
  fetchFeatureFlags,
  updateFeatureFlag,
  type DashboardStats,
  type FeatureFlag,
} from '../api/admin'

const stats = ref<DashboardStats | null>(null)
const flags = ref<FeatureFlag[]>([])
const loading = ref(false)
const togglingKey = ref('')
const error = ref('')

const cards = computed(() => {
  if (!stats.value) return []
  return [
    { label: '会话数', value: stats.value.total_conversations },
    { label: '消息数', value: stats.value.total_messages },
    { label: 'AI 事件', value: stats.value.total_ai_events },
    { label: '规则命中', value: stats.value.rule_hit_count },
    { label: '转人工', value: stats.value.handoff_count },
    { label: '反馈数', value: stats.value.feedback_count },
    { label: '有用反馈', value: stats.value.positive_feedback },
    { label: '没用反馈', value: stats.value.negative_feedback },
    { label: '平均耗时', value: `${stats.value.average_latency_ms.toFixed(1)} ms` },
  ]
})

onMounted(() => {
  void loadDashboard()
})

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [nextStats, nextFlags] = await Promise.all([fetchDashboardStats(), fetchFeatureFlags()])
    stats.value = nextStats
    flags.value = nextFlags
  } catch (err) {
    error.value = err instanceof Error ? err.message : '看板加载失败'
  } finally {
    loading.value = false
  }
}

async function toggleFlag(flag: FeatureFlag) {
  togglingKey.value = flag.key
  error.value = ''
  try {
    const updated = await updateFeatureFlag(flag.key, !flag.enabled)
    flags.value = flags.value.map((item) => (item.key === updated.key ? updated : item))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '灰度开关更新失败'
  } finally {
    togglingKey.value = ''
  }
}
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>基础看板</strong>
        <span>规则路由、转人工、反馈和延迟统计</span>
      </div>
      <nav class="admin-nav">
        <RouterLink to="/">返回客服</RouterLink>
        <RouterLink to="/admin/rules">规则配置</RouterLink>
      </nav>
    </header>

    <p v-if="error" class="notice danger">{{ error }}</p>

    <section class="rule-toolbar">
      <button :disabled="loading" @click="loadDashboard">
        {{ loading ? '刷新中' : '刷新看板' }}
      </button>
    </section>

    <p v-if="loading" class="admin-muted">正在加载看板...</p>

    <section class="dashboard-grid" aria-label="统计指标">
      <article v-for="card in cards" :key="card.label" class="metric-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="flag-panel" aria-label="灰度开关">
      <h2>灰度开关</h2>
      <article v-for="flag in flags" :key="flag.key" class="flag-row">
        <div>
          <strong>{{ flag.key }}</strong>
          <p>{{ flag.description || '无说明' }}</p>
        </div>
        <button
          :class="{ danger: flag.enabled }"
          :disabled="togglingKey === flag.key"
          @click="toggleFlag(flag)"
        >
          {{ flag.enabled ? '关闭' : '开启' }}
        </button>
      </article>
    </section>
  </main>
</template>
