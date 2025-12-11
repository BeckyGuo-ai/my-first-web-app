<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <router-view />
    <AIChatPanel v-if="showChatPanel" @close="showChatPanel = false" />

    <button
      @click="showChatPanel = true"
      class="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors z-50"
    >
      <span class="text-2xl">AI</span>
    </button>
  </div>
 </template>

<script setup>
import { ref } from 'vue'
import AIChatPanel from './components/AIChatPanel.vue'

const showChatPanel = ref(false)
</script>