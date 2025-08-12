import { ref } from 'vue'

const token = ref<string>('')
const name = ref<string>('')

let initialized = false
function ensureInit() {
  if (initialized) return
  initialized = true
  if (process.client) {
    try {
      token.value = localStorage.getItem('jwtToken') || ''
      name.value = localStorage.getItem('jwtName') || ''
    } catch {}
  }
}

export function useJwtAuth() {
  ensureInit()

  function setToken(t: string, n?: string) {
    token.value = t
    if (n) name.value = n
    if (process.client) {
      try {
        localStorage.setItem('jwtToken', t)
        if (n) localStorage.setItem('jwtName', n)
      } catch {}
    }
  }

  function clear() {
    token.value = ''
    name.value = ''
    if (process.client) {
      try {
        localStorage.removeItem('jwtToken')
        localStorage.removeItem('jwtName')
      } catch {}
    }
  }

  function getAuthHeader(): Record<string, string> {
    if (!token.value) return {}
    return { Authorization: `Bearer ${token.value}` }
  }

  return { token, name, setToken, clear, getAuthHeader }
}


