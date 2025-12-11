import { defineStore } from 'pinia'
import { ref } from 'vue'
import { deepseekAPI } from '../services/deepseekAPI'

export const useNoteStore = defineStore('notes', () => {
  const notes = ref([])
  const folders = ref(['工作', '个人', '想法'])
  const tags = ref([])

  const loadFromStorage = () => {
    const saved = localStorage.getItem('ai-notebook-data')
    if (saved) {
      const data = JSON.parse(saved)
      notes.value = data.notes || []
      folders.value = data.folders || ['工作', '个人', '想法']
      tags.value = data.tags || []
    }
  }

  const saveToStorage = () => {
    const data = {
      notes: notes.value,
      folders: folders.value,
      tags: tags.value
    }
    localStorage.setItem('ai-notebook-data', JSON.stringify(data))
  }

  const createNote = async (content, folder = '') => {
    const newNote = {
      id: Date.now().toString(),
      title: content.split('\n')[0] || '新笔记',
      content,
      summary: '',
      tags: [],
      folder,
      urgent: false,
      important: false,
      deadline: '',
      starred: false,
      audios: [],
      status: '待开始',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const [summaryResponse, tagsResponse] = await Promise.all([
        deepseekAPI.generateSummary(content),
        deepseekAPI.generateTags(content)
      ])

      newNote.summary = summaryResponse.summary
      newNote.tags = tagsResponse.tags

      tagsResponse.tags.forEach(tag => {
        if (!tags.value.includes(tag)) {
          tags.value.push(tag)
        }
      })
    } catch (error) {
      newNote.summary = content.substring(0, 100) + '...'
      newNote.tags = ['未分类']
    }

    notes.value.unshift(newNote)
    saveToStorage()
    return newNote
  }

  const updateNote = async (id, content) => {
    const note = notes.value.find(n => n.id === id)
    if (note) {
      note.content = content
      note.title = content.split('\n')[0] || '新笔记'
      note.updatedAt = new Date().toISOString()

      try {
        const [summaryResponse, tagsResponse] = await Promise.all([
          deepseekAPI.generateSummary(content),
          deepseekAPI.generateTags(content)
        ])

        note.summary = summaryResponse.summary
        note.tags = tagsResponse.tags
      } catch (error) {
      }

      saveToStorage()
    }
  }

  const deleteNote = (id) => {
    notes.value = notes.value.filter(note => note.id !== id)
    saveToStorage()
  }

  const toggleStar = (id) => {
    const n = notes.value.find(x => x.id === id)
    if (n) {
      n.starred = !n.starred
      n.updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }

  const addAudioClip = (id, clip) => {
    const n = notes.value.find(x => x.id === id)
    if (n) {
      if (!Array.isArray(n.audios)) n.audios = []
      n.audios.unshift(clip)
      n.updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }

  const removeAudioClip = (id, clipId) => {
    const n = notes.value.find(x => x.id === id)
    if (n && Array.isArray(n.audios)) {
      n.audios = n.audios.filter(a => a.id !== clipId)
      n.updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }

  loadFromStorage()

  return {
    notes,
    folders,
    tags,
    createNote,
    updateNote,
    deleteNote,
    toggleStar,
    addAudioClip,
    removeAudioClip,
    loadFromStorage,
    saveToStorage
  }
})