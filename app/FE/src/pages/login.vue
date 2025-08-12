<template>
  <ChatTemplate>
    <div class="border rounded p-4 max-w-md mx-auto space-y-3">
      <h2 class="text-xl font-semibold">Login</h2>
      <div class="space-y-2">
        <label class="block text-sm">Username</label>
        <input v-model="u" class="w-full border rounded p-2" placeholder="alice" />
      </div>
      <div class="space-y-2">
        <label class="block text-sm">Password</label>
        <input v-model="p" class="w-full border rounded p-2" type="password" placeholder="••••••" />
      </div>
      <div class="flex gap-2 items-center">
        <button :disabled="submitting" @click="login" class="px-3 py-1 border rounded">{{ submitting ? 'Checking...' : 'Login' }}</button>
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
      </div>
    </div>
  </ChatTemplate>
  
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatTemplate from '~/components/templates/ChatTemplate.vue'
import { useBasicAuth } from '~/composables/useBasicAuth'

const { setCredentials, getAuthHeader } = useBasicAuth()
const config = useRuntimeConfig()
const apiBaseUrl: string = config.public.apiBaseUrl
const router = useRouter()

const u = ref('')
const p = ref('')
const submitting = ref(false)
const error = ref('')

async function login() {
  error.value = ''
  submitting.value = true
  try {
    setCredentials(u.value, p.value)
    const res = await fetch(`${apiBaseUrl}/api/auth/whoami`, {
      method: 'GET',
      headers: { ...getAuthHeader() },
    })
    if (!res.ok) throw new Error('認証に失敗しました')
    await router.push('/chat')
  } catch (e: any) {
    error.value = e?.message || 'Unknown error'
  } finally {
    submitting.value = false
  }
}
</script>


