<template>
  <ChatTemplate>
    <div class="chat-page">
      <div class="messages" ref="messagesEl">
        <div v-for="(m, i) in messages" :key="i" :class="['bubble', m.role]">
          <div class="role" v-if="false">{{ m.role }}</div>
          <div class="content">{{ m.content }}</div>
        </div>
      </div>
      <div class="composer">
        <textarea :value="input" @input="onInput" class="input" rows="2" placeholder="Type a message" />
        <button :disabled="isStreaming || !input" class="send" @click="send">Send</button>
      </div>
    </div>
  </ChatTemplate>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGlobalAlert } from '~/composables/useGlobalAlert'
import { useJwtAuth } from '~/composables/useJwtAuth'
import { useApi } from '~/composables/useApi'
import ChatTemplate from '~/components/templates/ChatTemplate.vue'
import ChatPanel from '~/components/organisms/ChatPanel.vue'

definePageMeta({ middleware: ['require-auth-client'] })

type Role = 'user' | 'assistant' | 'system'
interface ChatMessage { role: Role; content: string }
interface ChatItem { id: number; title: string | null }

const messages = ref<ChatMessage[]>([])
const chatId = ref<string | null>(null)
const input = ref('')
const isStreaming = ref(false)
const error = ref('')
const { show } = useGlobalAlert()

const config = useRuntimeConfig()
const apiBaseUrl: string = config.public.apiBaseUrl
const { getAuthHeader } = useJwtAuth()
const { get, patch, del } = useApi()
const chats = ref<ChatItem[]>([])

function onInput(e: Event) { input.value = (e.target as HTMLTextAreaElement).value }

async function send() {
  if (!input.value || isStreaming.value) return
  error.value = ''
  isStreaming.value = true

  const body = { messages: [...messages.value, { role: 'user', content: input.value }] }
  messages.value.push({ role: 'user', content: input.value })
  input.value = ''

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(chatId.value ? { 'x-chat-id': chatId.value } : {}) , ...getAuthHeader() }

    const res = await fetch(`${apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(res.statusText || 'Request failed')

    chatId.value = res.headers.get('x-chat-id') || chatId.value
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let acc = ''
    const assistantIndex = messages.value.push({ role: 'assistant', content: '' }) - 1
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          if (chunk) {
            acc += chunk
            messages.value[assistantIndex].content = acc
          }
        }
      }
    }
    // 初回応答完了タイミングでサイドバーを更新（タイトルが確定）
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('chat-title-updated'))
    }
  } catch (e: any) {
    error.value = e?.message || 'Unknown error'
    show(error.value)
  } finally {
    isStreaming.value = false
  }
}

// クエリの id でチャットを開く
const route = useRoute()
watch(
  () => route.query.id,
  (id) => {
    if (!id) return
    openChat(Number(id))
  },
  { immediate: true }
)

async function refreshChats() {
  try {
    const data = await get<{ chats: { id: number; title: string | null }[] }>(`/api/chat/chats`)
    chats.value = data.chats
  } catch (e: any) {
    show(e?.message || 'failed to load chats')
  }
}

async function openChat(id: number) {
  chatId.value = String(id)
  messages.value = []
  try {
    const data = await get<{ messages: ChatMessage[] }>(`/api/chat/${id}/messages`)
    messages.value = data.messages
  } catch (e: any) {
    show(e?.message || 'failed to load messages')
  }
}

async function rename(id: number) {
  const title = prompt('New title?')
  if (!title) return
  try {
    await patch(`/api/chat/${id}`, { title })
    await refreshChats()
  } catch (e: any) {
    show(e?.message || 'rename failed')
  }
}

async function removeChat(id: number) {
  if (!confirm('Delete this chat?')) return
  try {
    await del(`/api/chat/${id}`)
    if (chatId.value === String(id)) {
      chatId.value = null
      messages.value = []
    }
    await refreshChats()
  } catch (e: any) {
    show(e?.message || 'delete failed')
  }
}

onMounted(() => {
  refreshChats()
})

// 自動スクロール
const messagesEl = ref<HTMLElement | null>(null)
watch(messages, () => {
  requestAnimationFrame(() => {
    messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight })
  })
})

</script>

<style scoped>
.chat-page { display: grid; grid-template-rows: 1fr auto; gap: 10px; height: 100%; overflow: hidden; }
.messages { overflow: auto; padding: 8px 4px; display: flex; flex-direction: column; gap: 8px; }
.bubble { max-width: 72%; padding: 10px 12px; border-radius: 14px; line-height: 1.5; white-space: pre-wrap; }
.bubble.user { align-self: flex-end; background: #eef2ff; border-top-right-radius: 6px; }
.bubble.assistant { align-self: flex-start; background: #f3f4f6; border-top-left-radius: 6px; }
.composer { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 8px; background: #fff; }
.input { width: 100%; resize: none; padding: 10px; border: 1px solid #ccc; border-radius: 10px; }
.send { padding: 10px 16px; border-radius: 10px; border: 1px solid #111; background: #111; color: #fff; }
</style>


