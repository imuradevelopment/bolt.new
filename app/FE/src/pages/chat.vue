<template>
  <ChatTemplate>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-1 border rounded p-3 space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Chats</h2>
          <button class="text-sm border rounded px-2 py-1" @click="refreshChats">Refresh</button>
        </div>
        <div v-if="chats.length === 0" class="text-sm text-gray-500">No chats</div>
        <ul class="space-y-1">
          <li v-for="c in chats" :key="c.id" class="flex items-center gap-2">
            <button class="flex-1 text-left underline" @click="openChat(c.id)">{{ c.title || `Chat #${c.id}` }}</button>
            <button class="text-xs border rounded px-1" @click="rename(c.id)">Rename</button>
            <button class="text-xs border rounded px-1" @click="removeChat(c.id)">Delete</button>
          </li>
        </ul>
      </div>
      <div class="md:col-span-2">
        <ChatPanel
          :messages="messages"
          v-model:input="input"
          :is-streaming="isStreaming"
          :error="error"
          @send="send"
        />
      </div>
    </div>
  </ChatTemplate>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  } catch (e: any) {
    error.value = e?.message || 'Unknown error'
    show(error.value)
  } finally {
    isStreaming.value = false
  }
}

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

</script>

<style>
html, body, #__nuxt { height: 100%; }
</style>


