<template>
  <div class="fixed inset-0 bg-black/30 flex justify-end z-50">
    <div class="w-full max-w-md h-full bg-white shadow-xl flex flex-col">
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="font-medium">AI 助手</h3>
        <button @click="$emit('close')" class="text-gray-500">关闭</button>
      </div>

      <div class="flex-1 overflow-auto p-4 space-y-3">
        <div v-for="(m, i) in messages" :key="i" class="text-sm">
          <div class="text-gray-500 mb-1">{{ m.role === 'user' ? '你' : 'AI' }}</div>
          <div class="p-3 rounded-lg" :class="m.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'">{{ m.content }}</div>
        </div>
      </div>

      <div class="p-3 border-t">
        <form @submit.prevent="send" class="flex gap-2">
          <input v-model="input" :disabled="loading" placeholder="向 AI 询问…"
                 class="flex-1 border rounded-lg px-3 py-2 outline-none" />
          <button :disabled="!input.trim() || loading" class="bg-blue-500 text-white px-4 py-2 rounded-lg">发送</button>
        </form>
        <div v-if="error" class="text-xs text-red-500 mt-2">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNoteStore } from '../stores/noteStore'
import { deepseekAPI } from '../services/deepseekAPI'

const noteStore = useNoteStore()

const input = ref('')
const messages = ref([])
const loading = ref(false)
const error = ref('')

const buildNotesContext = () => {
  const top = noteStore.notes.slice(0, 5).map(n => `标题：${n.title}\n摘要：${n.summary || n.content.slice(0, 80)}...`).join('\n---\n')
  return top
}

const send = async () => {
  if (!input.value.trim() || loading.value) return
  error.value = ''
  const userMsg = input.value
  input.value = ''
  messages.value.push({ role: 'user', content: userMsg })
  loading.value = true
  try {
    const res = await deepseekAPI.chatWithAI(userMsg, buildNotesContext())
    messages.value.push({ role: 'assistant', content: res.response })
  } catch (e) {
    messages.value.push({ role: 'assistant', content: 'AI 功能不可用，已回退为本地模式。' })
    error.value = 'AI 调用失败或未配置 API Key'
  } finally {
    loading.value = false
  }
}
</script>