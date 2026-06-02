<script setup lang="ts">
import { computed, ref } from 'vue'
import { sendChatMessage } from './api/chat'
import { getOrCreateSessionId, persistSessionId } from './utils/session'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  transferToHuman?: boolean
}

const sessionId = ref(getOrCreateSessionId())
const input = ref('')
const loading = ref(false)
const error = ref('')
const messages = ref<ChatMessage[]>([
  {
    id: 'hello-1',
    role: 'assistant',
    content: '非常对不起哦，不知道怎么回答这个问题呢，我会努力学习的。',
  },
  {
    id: 'hello-2',
    role: 'assistant',
    content: '您好，很高兴为您服务，请问有什么可以帮您？',
  },
])

const categories = [
  { label: '账号问题', icon: 'user' },
  { label: '会员问题', icon: 'heart' },
  { label: '功能咨询', icon: 'store' },
  { label: '其他', icon: 'more' },
]

const faqs = ['密码错误过多', '找回账号密码', '账号异常设备登录', '账号违规举报']
const quickActions = ['转人工', '热门活动', '社区活动']

const canSend = computed(() => input.value.trim().length > 0 && !loading.value)

async function submitMessage(text = input.value) {
  const content = text.trim()
  if (!content || loading.value) return

  error.value = ''
  input.value = ''
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content,
  })

  loading.value = true
  try {
    const response = await sendChatMessage({
      sessionId: sessionId.value,
      message: content,
    })
    sessionId.value = response.session_id
    persistSessionId(response.session_id)
    messages.value.push({
      id: response.message_id,
      role: 'assistant',
      content: response.reply,
      transferToHuman: response.transfer_to_human,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '请求失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="phone-shell">
    <header class="chat-header">
      <button class="icon-button" aria-label="返回">‹</button>
      <div class="bot-avatar">唱</div>
      <div class="title">
        <strong>小唱机器人</strong>
        <span>唱吧</span>
      </div>
      <button class="icon-button menu" aria-label="更多">•••</button>
    </header>

    <section class="chat-body">
      <time class="timestamp">19:21</time>

      <div class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div v-if="message.role === 'assistant'" class="mini-avatar">唱</div>
          <div class="bubble">
            {{ message.content }}
            <div v-if="message.transferToHuman" class="handoff-tag">已转人工</div>
          </div>
        </div>

        <div v-if="loading" class="message-row assistant">
          <div class="mini-avatar">唱</div>
          <div class="bubble muted">正在处理...</div>
        </div>
      </div>

      <section class="category-grid" aria-label="问题分类">
        <button
          v-for="category in categories"
          :key="category.label"
          class="category-card"
          @click="submitMessage(category.label)"
        >
          <span class="category-icon" :data-icon="category.icon"></span>
          <span>{{ category.label }}</span>
        </button>
      </section>

      <section class="faq-panel" aria-label="常见问题">
        <button v-for="faq in faqs" :key="faq" class="faq-item" @click="submitMessage(faq)">
          <span>{{ faq }}</span>
          <span class="chevron">›</span>
        </button>
      </section>

      <section class="quick-actions" aria-label="快捷操作">
        <button v-for="action in quickActions" :key="action" @click="submitMessage(action)">
          {{ action }}
        </button>
      </section>
    </section>

    <footer class="composer">
      <p v-if="error" class="error">{{ error }}</p>
      <input
        v-model="input"
        type="text"
        placeholder="请详细描述您的问题"
        @keyup.enter="submitMessage()"
      />
      <button class="round-button" aria-label="表情">☺</button>
      <button class="round-button" aria-label="添加">＋</button>
      <button class="send-button" :disabled="!canSend" @click="submitMessage()">发送</button>
    </footer>
  </main>
</template>

