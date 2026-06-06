<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ElMessage } from 'element-plus'
import { requestHandoff, sendChatMessage, sendFeedback, type ChatResponse } from '../api/chat'
import { getOrCreateSessionId, persistSessionId } from '../utils/session'

type ChatCitation = ChatResponse['citations'][number]

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: ChatCitation[]
  transferToHuman?: boolean
  feedback?: 'thumbs_up' | 'thumbs_down'
}

const sessionId = ref(getOrCreateSessionId())
const input = ref('')
const loading = ref(false)
const feedbackLoadingId = ref('')
const handoffLoading = ref(false)
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
  { label: '账号问题', icon: 'account' },
  { label: '会员问题', icon: 'member' },
  { label: '功能咨询', icon: 'feature' },
  { label: '其他', icon: 'more' },
]

const faqs = ['密码错误过多', '找回账号密码', '账号异常设备登录', '账号违规举报']
const quickActions = ['转人工', '热门活动', '社区活动', '图片', '语音']

const canSend = computed(() => input.value.trim().length > 0 && !loading.value)

const lastAssistantMessage = computed(() => {
  return [...messages.value].reverse().find((message) => message.role === 'assistant')
})

function newMessageId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

async function submitMessage(text = input.value, messageType: 'text' | 'image' | 'audio' = 'text') {
  const content = text.trim()
  if (!content || loading.value) return

  input.value = ''
  const messageId = newMessageId()
  messages.value.push({ id: messageId, role: 'user', content })

  loading.value = true
  try {
    const response = await sendChatMessage({
      conversationId: sessionId.value,
      messageId,
      messageType,
      message: content,
    })
    sessionId.value = response.conversation_id
    persistSessionId(response.conversation_id)
    messages.value.push({
      id: response.trace_id,
      role: 'assistant',
      content: response.content.text,
      citations: response.citations ?? [],
      transferToHuman: response.handoff.required,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求失败，请稍后重试'
    ElMessage.error(message)
    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: `服务暂时不可用：${message}`,
    })
  } finally {
    loading.value = false
  }
}

async function submitFeedback(message: ChatMessage, rating: 'thumbs_up' | 'thumbs_down') {
  if (message.role !== 'assistant' || message.feedback || feedbackLoadingId.value) return

  feedbackLoadingId.value = message.id
  try {
    await sendFeedback({
      conversationId: sessionId.value,
      messageId: message.id,
      rating,
      comment: rating === 'thumbs_down' ? '没有解决' : '',
      actionTaken: rating === 'thumbs_down' ? 'handoff' : '',
    })
    message.feedback = rating
    ElMessage.success(rating === 'thumbs_up' ? '感谢反馈' : '已记录反馈')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '反馈失败，请稍后重试')
  } finally {
    feedbackLoadingId.value = ''
  }
}

async function submitHandoff(reason = 'user_requested') {
  if (handoffLoading.value) return

  handoffLoading.value = true
  try {
    await requestHandoff({
      conversationId: sessionId.value,
      messageId: lastAssistantMessage.value?.id,
      reason,
    })
    messages.value.push({
      id: `handoff-${Date.now()}`,
      role: 'assistant',
      content: '已为您转接智齿人工客服，请继续在人工客服窗口处理。',
      transferToHuman: true,
    })
    ElMessage.success('已提交转人工')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '转人工失败，请稍后重试')
  } finally {
    handoffLoading.value = false
  }
}

function handleQuickAction(action: string) {
  if (action === '转人工') {
    void submitHandoff()
    return
  }
  if (action === '图片') {
    void submitMessage('[图片]', 'image')
    return
  }
  if (action === '语音') {
    void submitMessage('[语音]', 'audio')
    return
  }
  void submitMessage(action)
}
</script>

<template>
  <main class="phone-shell">
    <header class="chat-header">
      <button type="button" class="icon-button" aria-label="返回">‹</button>
      <div class="bot-avatar">唱</div>
      <div class="title">
        <strong>小唱机器人</strong>
        <span>唱吧</span>
      </div>
      <RouterLink class="admin-link" to="/admin/dashboard">管理</RouterLink>
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
            <p class="bubble-text">{{ message.content }}</p>
            <span v-if="message.transferToHuman" class="handoff-tag">已转人工</span>
            <div v-if="message.citations?.length" class="citation-list">
              <span>参考来源</span>
              <small v-for="citation in message.citations" :key="citation.doc_id">
                {{ citation.question || citation.doc_id }} / {{ citation.score.toFixed(3) }}
              </small>
            </div>
            <div v-if="message.role === 'assistant'" class="feedback-actions">
              <span v-if="message.feedback" class="feedback-result">
                {{ message.feedback === 'thumbs_up' ? '已标记有用' : '已反馈没用' }}
              </span>
              <template v-else>
                <button
                  type="button"
                  class="feedback-btn"
                  :disabled="feedbackLoadingId === message.id"
                  @click="submitFeedback(message, 'thumbs_up')"
                >
                  有用
                </button>
                <button
                  type="button"
                  class="feedback-btn"
                  :disabled="feedbackLoadingId === message.id"
                  @click="submitFeedback(message, 'thumbs_down')"
                >
                  没用
                </button>
              </template>
            </div>
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
          type="button"
          class="category-card"
          @click="submitMessage(category.label)"
        >
          <span class="category-icon" :data-icon="category.icon" aria-hidden="true"></span>
          <span class="category-label">{{ category.label }}</span>
        </button>
      </section>

      <section class="faq-panel" aria-label="常见问题">
        <button
          v-for="faq in faqs"
          :key="faq"
          type="button"
          class="faq-item"
          @click="submitMessage(faq)"
        >
          <span class="faq-text">{{ faq }}</span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
      </section>

      <section class="quick-actions" aria-label="快捷操作">
        <button
          v-for="action in quickActions"
          :key="action"
          type="button"
          class="quick-action-btn"
          :disabled="action === '转人工' && handoffLoading"
          @click="handleQuickAction(action)"
        >
          {{ action }}
        </button>
      </section>
    </section>

    <footer class="composer">
      <input
        v-model="input"
        type="text"
        placeholder="请详细描述您的问题"
        @keyup.enter="submitMessage()"
      />
      <button type="button" class="round-button" aria-label="表情">☺</button>
      <button type="button" class="round-button" aria-label="添加">＋</button>
      <button
        type="button"
        class="send-button"
        :disabled="!canSend"
        @click="submitMessage()"
      >
        {{ loading ? '...' : '发送' }}
      </button>
    </footer>
  </main>
</template>
