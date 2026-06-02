<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
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
const loading = ref(false)
const saving = ref(false)
const togglingId = ref<number | null>(null)
const filterType = ref('all')
const error = ref('')

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
  error.value = ''
  try {
    rules.value = await fetchRules()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '规则加载失败'
  } finally {
    loading.value = false
  }
}

function editRule(rule: RuleConfig) {
  editingId.value = rule.id
  form.value = {
    rule_type: rule.rule_type,
    pattern: rule.pattern,
    action: rule.action,
    priority: rule.priority,
    enabled: rule.enabled,
    description: rule.description,
  }
}

function resetForm() {
  editingId.value = null
  form.value = { ...emptyForm }
}

async function submitRule() {
  if (!form.value.pattern.trim()) {
    error.value = '请填写匹配内容'
    return
  }

  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await updateRule(editingId.value, form.value)
    } else {
      await createRule(form.value)
    }
    await reloadRules()
    resetForm()
    await loadRules()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '规则保存失败'
  } finally {
    saving.value = false
  }
}

async function toggleRule(rule: RuleConfig) {
  togglingId.value = rule.id
  error.value = ''
  try {
    await updateRule(rule.id, {
      rule_type: rule.rule_type,
      pattern: rule.pattern,
      action: rule.action,
      priority: rule.priority,
      enabled: !rule.enabled,
      description: rule.description,
    })
    await reloadRules()
    await loadRules()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '规则状态更新失败'
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <strong>规则配置</strong>
        <span>{{ enabledCount }} 条启用 / {{ rules.length }} 条规则</span>
      </div>
      <RouterLink to="/">返回客服</RouterLink>
    </header>

    <section class="rule-editor">
      <div class="field">
        <label>规则类型</label>
        <select v-model="form.rule_type">
          <option value="greeting">问候</option>
          <option value="handoff">转人工</option>
          <option value="risk">高风险</option>
          <option value="faq">固定 FAQ</option>
        </select>
      </div>
      <div class="field">
        <label>匹配内容</label>
        <input v-model="form.pattern" placeholder="例如：退款、密码错误过多" />
      </div>
      <div class="field">
        <label>动作</label>
        <select v-model="form.action">
          <option value="answer">直接回复</option>
          <option value="handoff">转人工</option>
          <option value="guide">引导</option>
        </select>
      </div>
      <div class="field">
        <label>优先级</label>
        <input v-model.number="form.priority" type="number" />
      </div>
      <div class="field field-wide">
        <label>说明 / 回复文案</label>
        <textarea v-model="form.description" rows="3" placeholder="运营备注或固定回复内容"></textarea>
      </div>
      <label class="check-field">
        <input v-model="form.enabled" type="checkbox" />
        启用
      </label>
      <div class="form-actions">
        <button :disabled="saving" @click="submitRule">
          {{ editingId ? '保存规则' : '新增规则' }}
        </button>
        <button type="button" @click="resetForm">清空</button>
      </div>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="rule-toolbar">
      <div class="field">
        <label>筛选类型</label>
        <select v-model="filterType">
          <option value="all">全部规则</option>
          <option value="greeting">问候</option>
          <option value="handoff">转人工</option>
          <option value="risk">高风险</option>
          <option value="faq">固定 FAQ</option>
        </select>
      </div>
      <button :disabled="loading" @click="loadRules">
        {{ loading ? '刷新中' : '刷新列表' }}
      </button>
    </section>

    <p v-if="loading" class="admin-muted">正在加载规则...</p>
    <p v-else-if="filteredRules.length === 0" class="empty-state">暂无规则</p>

    <section class="rule-list">
      <article v-for="rule in filteredRules" :key="rule.id" class="rule-row">
        <div>
          <div class="rule-title">
            <span>{{ rule.pattern }}</span>
            <em :class="{ off: !rule.enabled }">{{ rule.enabled ? '启用' : '停用' }}</em>
            <small>{{ rule.rule_type }} / {{ rule.action }} / P{{ rule.priority }}</small>
          </div>
          <p>{{ rule.description || '无说明' }}</p>
        </div>
        <div class="rule-actions">
          <button @click="editRule(rule)">编辑</button>
          <button
            :class="{ danger: rule.enabled }"
            :disabled="togglingId === rule.id"
            @click="toggleRule(rule)"
          >
            {{ togglingId === rule.id ? '处理中' : rule.enabled ? '停用' : '启用' }}
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
