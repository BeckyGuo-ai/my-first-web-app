<template>
  <div class="min-h-screen bg-white">
    <div class="border-b border-gray-200 p-4">
      <div class="max-w-4xl mx-auto flex justify-between items-center">
        <button @click="goBack" class="text-blue-500 font-medium">返回</button>

        <div class="flex items-center gap-4">
          <select v-model="currentFolder" class="border border-gray-300 rounded-lg px-3 py-1 text-sm">
            <option value="">选择文件夹</option>
            <option v-for="folder in noteStore.folders" :key="folder" :value="folder">{{ folder }}</option>
          </select>

          <button
            @click="saveNote"
            :disabled="!content.trim()"
            class="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isEditing ? '更新' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto p-6">
      <textarea
        v-model="content"
        placeholder="开始记录你的想法..."
        class="w-full min-h-[60vh] resize-none border-0 focus:outline-none focus:ring-0 text-lg leading-relaxed"
        autofocus
      ></textarea>

      <div v-if="note && note.summary" class="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-2">AI 摘要</h4>
        <p class="text-gray-700">{{ note.summary }}</p>

        <div v-if="note.tags.length" class="mt-3">
          <h4 class="font-medium text-gray-900 mb-2">推荐标签</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in note.tags" :key="tag" class="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded-full">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNoteStore } from '../stores/noteStore'

const route = useRoute()
const router = useRouter()
const noteStore = useNoteStore()

const content = ref('')
const currentFolder = ref('')
const note = ref(null)
const isEditing = ref(false)

onMounted(() => {
  const noteId = route.params.id
  if (noteId) {
    isEditing.value = true
    note.value = noteStore.notes.find(n => n.id === noteId)
    if (note.value) {
      content.value = note.value.content
      currentFolder.value = note.value.folder || ''
    }
  }
})

const saveNote = async () => {
  if (!content.value.trim()) return
  try {
    if (isEditing.value && note.value) {
      await noteStore.updateNote(note.value.id, content.value)
    } else {
      await noteStore.createNote(content.value, currentFolder.value)
    }
    goBack()
  } catch (error) {
    alert('保存失败，请重试')
  }
}

const goBack = () => {
  router.back()
}
</script>