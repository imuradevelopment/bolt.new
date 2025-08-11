<template>
  <ChatTemplate>
    <ChatPanel
      :messages="messages"
      v-model:input="input"
      :is-streaming="isStreaming"
      :error="error"
      @send="send"
    />
  </ChatTemplate>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGlobalAlert } from '~/composables/useGlobalAlert'
import ChatTemplate from '~/components/templates/ChatTemplate.vue'
import ChatPanel from '~/components/organisms/ChatPanel.vue'

type Role = 'user' | 'assistant' | 'system'
interface ChatMessage { role: Role; content: string }

const messages = ref<ChatMessage[]>([])
const chatId = ref<string | null>(null)
const input = ref('')
const isStreaming = ref(false)
const error = ref('')
const { show } = useGlobalAlert()

const config = useRuntimeConfig()
const apiBaseUrl: string = config.public.apiBaseUrl

async function send() {
  if (!input.value || isStreaming.value) return
  error.value = ''
  isStreaming.value = true

  const body = { messages: [...messages.value, { role: 'user', content: input.value }] }
  messages.value.push({ role: 'user', content: input.value })
  input.value = ''

  try {
    const res = await fetch(`${apiBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(chatId.value ? { 'x-chat-id': chatId.value } : {}) },
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

</script>

<style>
html, body, #__nuxt { height: 100%; }
</style>


