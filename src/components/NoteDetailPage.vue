<template>
  <div class="min-h-screen bg-white">
    <div class="border-b border-gray-200 p-4">
      <div class="max-w-4xl mx-auto flex justify-between items-center">
        <button @click="goBack" class="text-blue-500 font-medium">返回</button>
        <div class="flex items-center gap-4">
          <button @click="editNote" class="text-blue-500 font-medium">编辑</button>
          <button @click="deleteNote" class="text-red-500 font-medium">删除</button>
        </div>
      </div>
    </div>

    <div v-if="note" class="max-w-4xl mx-auto p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-900 mb-2">{{ note.title }}</h1>
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span>更新：{{ formatDate(note.updatedAt) }}</span>
          <span>创建：{{ formatDate(note.createdAt) }}</span>
          <span v-if="note.folder">文件夹：{{ note.folder }}</span>
        </div>
        <div class="flex flex-wrap gap-2 mt-2" v-if="note.tags && note.tags.length">
          <span v-for="tag in note.tags" :key="tag" class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{{ tag }}</span>
        </div>
      </div>

      <article class="prose whitespace-pre-wrap leading-relaxed">{{ note.content }}</article>

      <div v-if="note.summary" class="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-2">AI 摘要</h4>
        <p class="text-gray-700">{{ note.summary }}</p>
      </div>
    </div>

    <div v-else class="max-w-4xl mx-auto p-6 text-gray-500">未找到该笔记</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useNoteStore } from '../stores/noteStore'

const route = useRoute()
const router = useRouter()
const noteStore = useNoteStore()

const note = computed(() => noteStore.notes.find(n => n.id === route.params.id))

const deleteNote = () => {
  if (!note.value) return
  noteStore.deleteNote(note.value.id)
  router.back()
}

const editNote = () => {
  if (!note.value) return
  router.push(`/edit/${note.value.id}`)
}

const goBack = () => {
  router.back()
}

const formatDate = (d) => dayjs(d).format('MM/DD HH:mm')
</script>