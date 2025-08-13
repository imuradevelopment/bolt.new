import { ref, watch } from 'vue'

type Provider = 'gemini' | 'azure-openai' | 'openai'

interface ModelSelection {
  provider: Provider
  model: string
}

const selection = useState<ModelSelection>('llmSelection', () => ({ provider: 'gemini', model: 'models/gemini-2.5-pro' }))

export function useModelSelector() {
  const provider = computed(() => selection.value.provider)
  const model = computed(() => selection.value.model)

  if (process.client) {
    const saved = localStorage.getItem('llmSelection')
    if (saved) {
      try { selection.value = JSON.parse(saved) } catch {}
    }
    watch(selection, (v) => {
      try { localStorage.setItem('llmSelection', JSON.stringify(v)) } catch {}
    }, { deep: true })
  }

  function setProvider(p: Provider) { selection.value = { ...selection.value, provider: p } }
  function setModel(m: string) { selection.value = { ...selection.value, model: m } }
  function getHeaders(): Record<string, string> {
    return {
      'X-LLM-Provider': selection.value.provider,
      'X-LLM-Model': selection.value.model,
    }
  }

  return { selection, provider, model, setProvider, setModel, getHeaders }
}


