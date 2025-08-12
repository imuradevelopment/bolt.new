import { ref } from 'vue'

const username = ref<string>('')
const password = ref<string>('')

let initialized = false
function ensureInit() {
  if (initialized) return
  initialized = true
  if (process.client) {
    try {
      const u = localStorage.getItem('basicAuthUser') || ''
      const p = localStorage.getItem('basicAuthPass') || ''
      username.value = u
      password.value = p
    } catch {}
  }
}

export function useBasicAuth() {
  ensureInit()

  function toBase64Utf8(input: string): string {
    try {
      const bytes = new TextEncoder().encode(input)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    } catch {
      // Fallback to legacy encodeURIComponent path
      // eslint-disable-next-line deprecation/deprecation
      return btoa(unescape(encodeURIComponent(input)))
    }
  }

  function setCredentials(u: string, p: string) {
    username.value = u
    password.value = p
    if (process.client) {
      try {
        localStorage.setItem('basicAuthUser', u)
        localStorage.setItem('basicAuthPass', p)
      } catch {}
    }
  }

  function clearCredentials() {
    username.value = ''
    password.value = ''
    if (process.client) {
      try {
        localStorage.removeItem('basicAuthUser')
        localStorage.removeItem('basicAuthPass')
      } catch {}
    }
  }

  function getAuthHeader(): Record<string, string> {
    if (!username.value || !password.value) return {}
    const token = toBase64Utf8(`${username.value}:${password.value}`)
    return { Authorization: `Basic ${token}` }
  }

  return { username, password, setCredentials, clearCredentials, getAuthHeader }
}


