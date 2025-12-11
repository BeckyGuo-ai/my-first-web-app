<template>
  <div class="page">
    <div class="topbar">
      <div>Becky的AI笔记</div>
      <div class="top-actions">
        <button class="top-btn" @click="exportBackup">导出备份</button>
        <input ref="importInput" type="file" accept="application/json" @change="onImportFile" style="display:none" />
        <button class="top-btn" @click="openImport">恢复笔记</button>
      </div>
    </div>
    <div class="notebook">
    <aside class="sidebar">
      <button class="btn-create" @click="createNew">新建笔记</button>

      <div class="search-filter">
        <input class="search" v-model="search" placeholder="搜索标题/内容/标签" />
        <div class="filters">
          <button :class="['fpill', {active: filter==='all'}]" @click="filter='all'">全部</button>
          <button :class="['fpill', {active: filter==='starred'}]" @click="filter='starred'">收藏</button>
          <button :class="['fpill', {active: filter==='important'}]" @click="filter='important'">重要</button>
          <button :class="['fpill', {active: filter==='urgent'}]" @click="filter='urgent'">紧急</button>
          <button :class="['fpill', {active: filter==='status:待开始'}]" @click="filter='status:待开始'">待开始</button>
          <button :class="['fpill', {active: filter==='status:进行中'}]" @click="filter='status:进行中'">进行中</button>
          <button :class="['fpill', {active: filter==='status:已完成'}]" @click="filter='status:已完成'">已完成</button>
          <button :class="['fpill', {active: filter==='status:已暂停'}]" @click="filter='status:已暂停'">已暂停</button>
        </div>
      </div>

      <div class="summary-card">
        <div class="pc-title">笔记总结</div>
        <div class="range">
          <input type="date" v-model="sumFrom" />
          <span class="to">—</span>
          <input type="date" v-model="sumTo" />
        </div>
        <div class="pie-wrap">
          <svg :width="pieSize" :height="pieSize" :viewBox="`0 0 ${pieSize} ${pieSize}`">
            <g v-if="summary.total > 0">
              <path v-for="s in statusPie" :key="s.label"
                    :d="describeArc(cx, cy, r, s.start, s.end)"
                    :fill="s.color" />
              <circle :cx="cx" :cy="cy" :r="rInner" fill="#fff" />
              <text :x="cx" :y="cy" text-anchor="middle" dominant-baseline="middle" class="pie-center">
                {{ summary.total }}
              </text>
            </g>
            <g v-else>
              <circle :cx="cx" :cy="cy" :r="r" fill="#f3f4f6" />
              <circle :cx="cx" :cy="cy" :r="rInner" fill="#fff" />
              <text :x="cx" :y="cy" text-anchor="middle" dominant-baseline="middle" class="pie-center">0</text>
            </g>
          </svg>
          <div class="legend">
            <div v-for="s in statusLegend" :key="s.label" class="lg-item">
              <span class="dot" :style="{ background: s.color }"></span>
              <span class="name">{{ s.label }}</span>
              <span class="val">{{ s.value }}（{{ s.pct }}%）</span>
            </div>
          </div>
        </div>
        <div class="s-row"><span>总数</span><b>{{ summary.total }}</b></div>
        <div class="s-row"><span>紧急且重要</span><b>{{ summary.ui }}（{{ summary.uiPct }}%）</b></div>
        <div class="s-row"><span>待开始</span><b>{{ summary.byStatus['待开始'] || 0 }}（{{ summary.pctByStatus['待开始'] || 0 }}%）</b></div>
        <div class="s-row"><span>进行中</span><b>{{ summary.byStatus['进行中'] || 0 }}（{{ summary.pctByStatus['进行中'] || 0 }}%）</b></div>
        <div class="s-row"><span>已完成</span><b>{{ summary.byStatus['已完成'] || 0 }}（{{ summary.pctByStatus['已完成'] || 0 }}%）</b></div>
        <div class="s-row"><span>已暂停</span><b>{{ summary.byStatus['已暂停'] || 0 }}（{{ summary.pctByStatus['已暂停'] || 0 }}%）</b></div>
      </div>

      <div v-if="topPriority" class="priority-card">
        <div class="pc-title">优先提醒</div>
        <div class="pc-name">{{ topPriority.title }}</div>
        <div class="pc-count" :class="formatCountdown(topPriority.deadline) === '已到期' ? 'due' : ''">
          {{ formatCountdown(topPriority.deadline) }}
        </div>
        <button class="pc-go" @click.prevent="select(topPriority.id)">直达</button>
      </div>

      <div class="note-list">
        <div
          v-for="n in orderedNotes"
          :key="n.id"
          :class="['note-item', { active: n.id === selectedId }]"
          @click="select(n.id)"
        >
          <div class="item-title">
            <span v-if="n.starred" class="star">★</span>
            {{ n.title || '新笔记' }}
          </div>
          <div class="item-summary">{{ (n.summary || n.content || '').slice(0, 36) }}</div>
          <div class="badges">
            <span v-if="n.important" class="b b-important">重要</span>
            <span v-if="n.urgent" class="b b-urgent">紧急</span>
            <span v-if="n.deadline" class="b b-deadline">{{ formatCountdown(n.deadline) }}</span>
            <span v-if="n.status" class="b b-status">{{ n.status }}</span>
          </div>
          <button class="item-delete" @click.stop="remove(n.id)">删除</button>
        </div>

        <div v-if="noteStore.notes.length === 0" class="empty">
          还没有任何笔记
        </div>
      </div>
    </aside>

    <main class="editor" v-if="current">
      <div class="editor-header">
        <div class="title-row">
          <input class="title-input" v-model="title" placeholder="新笔记" />
          <button class="star-btn" :class="{on: current?.starred}" @click="toggleStar">{{ current?.starred ? '★' : '☆' }}</button>
        </div>
        <div class="hint">添加标签（用逗号分隔）</div>
        <input class="tags-input" v-model="tagsInput" placeholder="工作, 想法" />
      </div>

      <div class="toolbar">
        <button class="pill pill-orange" @click="insertHeading(1)">H1</button>
        <button class="pill pill-purple" @click="insertHeading(2)">H2</button>
        <button class="pill pill-indigo" @click="insertHeading(3)">H3</button>
        <button class="pill pill-blue" @click="insertBold">B</button>
        <button class="pill pill-teal" @click="insertSlash">/</button>
        <button class="pill pill-yellow" @click="insertBulleted">· 列表</button>
        <button class="pill pill-red" @click="insertOrdered">1. 列表</button>
      </div>

      <div class="priority-row">
        <button :class="['tag-btn', { active: important }]" @click="important = !important">重要</button>
        <button :class="['tag-btn', { active: urgent }]" @click="urgent = !urgent">紧急</button>
        <div class="deadline">
          <label>截止时间</label>
          <input type="datetime-local" v-model="deadlineInput" />
          <span class="countdown" :class="countdownClass">{{ countdownText }}</span>
        </div>
      </div>

      <div class="status-row">
        <button :class="['sp', {on: status==='待开始'}]" @click="status='待开始'">待开始</button>
        <button :class="['sp', {on: status==='进行中'}]" @click="status='进行中'">进行中</button>
        <button :class="['sp', {on: status==='已完成'}]" @click="status='已完成'">已完成</button>
        <button :class="['sp', {on: status==='已暂停'}]" @click="status='已暂停'">已暂停</button>
      </div>

      <div class="editor-card">
        <textarea ref="ta" class="content" v-model="content" placeholder="今天的演示很顺利，开心"></textarea>
        <div v-if="current?.audios?.length" class="audio-list">
          <div class="audio-item" v-for="a in current.audios" :key="a.id">
            <audio :src="a.url" controls></audio>
            <div class="ad">{{ formatAudioDuration(a.duration) }}</div>
            <button class="adel" @click="removeAudio(a.id)">删除</button>
          </div>
        </div>
      </div>

      <div class="footer">
        <button class="btn btn-green" @click="aiSummarize">总结</button>
        <button class="btn btn-purple" @click="aiPolish">纠错</button>
        <button class="btn btn-rec" :class="{on: recording}" @click="toggleRecord">{{ recording ? '停止录音' : '录音' }}</button>
        <span class="rectimer" v-if="recording">{{ recordTimerText }}</span>
      </div>
    </main>

    <main v-else class="editor placeholder">
      选择一条笔记或创建新笔记
    </main>
    </div>
  </div>
  </template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useNoteStore } from '../stores/noteStore'
import { deepseekAPI } from '../services/deepseekAPI'
import dayjs from 'dayjs'

const noteStore = useNoteStore()

const selectedId = ref(noteStore.notes[0]?.id || '')
const current = computed(() => noteStore.notes.find(n => n.id === selectedId.value))

const title = ref('')
const content = ref('')
const tagsInput = ref('')
const ta = ref(null)
const urgent = ref(false)
const important = ref(false)
const deadlineInput = ref('')
const nowTick = ref(Date.now())
const search = ref('')
const filter = ref('all')
const status = ref('待开始')
const sumFrom = ref('')
const sumTo = ref('')

const importInput = ref(null)

const exportBackup = () => {
  const data = localStorage.getItem('ai-notebook-data') || JSON.stringify({
    notes: noteStore.notes,
    folders: noteStore.folders,
    tags: noteStore.tags
  })
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai-notebook-backup.json'
  a.click()
  URL.revokeObjectURL(url)
}

const openImport = () => { if (importInput.value) importInput.value.click() }

const onImportFile = async (e) => {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const v = {
      notes: Array.isArray(data.notes) ? data.notes : [],
      folders: Array.isArray(data.folders) ? data.folders : ['工作','个人','想法'],
      tags: Array.isArray(data.tags) ? data.tags : []
    }
    localStorage.setItem('ai-notebook-data', JSON.stringify(v))
    noteStore.loadFromStorage()
    selectedId.value = noteStore.notes[0]?.id || ''
    alert('恢复完成')
  } catch {
    alert('导入失败，文件格式不正确')
  } finally {
    e.target.value = ''
  }
}

const recording = ref(false)
let mediaRecorder
let recordChunks = []
const recordStartAt = ref(0)
const recordNow = ref(Date.now())
const recTimer = ref(null)

watch(current, (n) => {
  if (!n) return
  title.value = n.title || ''
  content.value = n.content || ''
  tagsInput.value = (n.tags || []).join(', ')
  urgent.value = !!n.urgent
  important.value = !!n.important
  deadlineInput.value = n.deadline ? dayjs(n.deadline).format('YYYY-MM-DDTHH:mm') : ''
  status.value = n.status || '待开始'
}, { immediate: true })

let t
watch([title, content, tagsInput, urgent, important, deadlineInput, status], () => {
  if (!current.value) return
  clearTimeout(t)
  t = setTimeout(() => {
    current.value.title = title.value.trim() || '新笔记'
    current.value.content = content.value
    current.value.tags = tagsInput.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    current.value.urgent = urgent.value
    current.value.important = important.value
    current.value.deadline = deadlineInput.value ? dayjs(deadlineInput.value).toDate().toISOString() : ''
    current.value.status = status.value
    current.value.updatedAt = new Date().toISOString()
    noteStore.saveToStorage()
  }, 400)
})

const createNew = async () => {
  const n = await noteStore.createNote('', '')
  selectedId.value = n.id
}

const select = (id) => { selectedId.value = id }
const remove = (id) => {
  noteStore.deleteNote(id)
  if (selectedId.value === id) selectedId.value = noteStore.notes[0]?.id || ''
}

const insertAtCursor = (text) => {
  const el = ta.value
  if (!el) { content.value += text; return }
  const start = el.selectionStart
  const end = el.selectionEnd
  content.value = content.value.slice(0, start) + text + content.value.slice(end)
  requestAnimationFrame(() => {
    el.focus()
    el.selectionStart = el.selectionEnd = start + text.length
  })
}

const insertHeading = (level) => insertAtCursor('\n' + '#'.repeat(level) + ' ')
const insertBold = () => insertAtCursor('**粗体**')
const insertSlash = () => insertAtCursor('/')
const insertBulleted = () => insertAtCursor('\n- ')
const insertOrdered = () => insertAtCursor('\n1. ')

const aiSummarize = async () => {
  if (!current.value) return
  try {
    const res = await deepseekAPI.generateSummary(content.value)
    current.value.summary = res.summary
    noteStore.saveToStorage()
  } catch {
    current.value.summary = (content.value || '').slice(0, 100) + '...'
    noteStore.saveToStorage()
  }
}

const aiPolish = async () => {
  if (!current.value) return
  try {
    const res = await deepseekAPI.chatWithAI('请纠正并润色下面文本：\n' + content.value)
    content.value = res.response
  } catch {
  }
}

const filteredNotes = computed(() => {
  const kw = search.value.trim().toLowerCase()
  const match = (n) => {
    if (!kw) return true
    const hay = `${n.title || ''}\n${n.content || ''}\n${(n.tags || []).join(',')}`.toLowerCase()
    return hay.includes(kw)
  }
  return noteStore.notes.filter(n => {
    if (!match(n)) return false
    if (filter.value === 'starred') return !!n.starred
    if (filter.value === 'important') return !!n.important
    if (filter.value === 'urgent') return !!n.urgent
    if (filter.value.startsWith('status:')) return (n.status || '待开始') === filter.value.split(':')[1]
    return true
  })
})

const orderedNotes = computed(() => {
  const arr = [...filteredNotes.value]
  arr.sort((a, b) => {
    const score = (x) => (x.urgent && x.important ? 3 : x.urgent ? 2 : x.important ? 1 : 0)
    const sa = score(a), sb = score(b)
    if (sb !== sa) return sb - sa
    const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
    const db = b.deadline ? new Date(b.deadline).getTime() : Infinity
    if (da !== db) return da - db
    if ((b.starred ? 1 : 0) !== (a.starred ? 1 : 0)) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
  return arr
})

let intervalId
onMounted(() => { intervalId = setInterval(() => { nowTick.value = Date.now() }, 60000) })
onBeforeUnmount(() => { if (intervalId) clearInterval(intervalId) })

const formatCountdown = (deadline) => {
  if (!deadline) return ''
  const diff = dayjs(deadline).diff(nowTick.value, 'second')
  if (diff <= 0) return '已到期'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (d > 0) return `剩余${d}天${h}时`
  if (h > 0) return `剩余${h}时${m}分`
  return `剩余${m}分`
}

const countdownText = computed(() => formatCountdown(current.value?.deadline))
const countdownClass = computed(() => {
  if (!current.value?.deadline) return ''
  const diffMin = dayjs(current.value.deadline).diff(nowTick.value, 'minute')
  if (diffMin <= 0) return 'due'
  if (diffMin <= 60) return 'hot'
  return 'warm'
})

const topPriority = computed(() => {
  const list = noteStore.notes.filter(n => n.urgent && n.important)
  if (!list.length) return null
  list.sort((a, b) => {
    const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
    const db = b.deadline ? new Date(b.deadline).getTime() : Infinity
    if (da !== db) return da - db
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
  return list[0]
})

const toggleStar = () => {
  if (!current.value) return
  noteStore.toggleStar(current.value.id)
}

const startRecord = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    recordChunks = []
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size) recordChunks.push(e.data) }
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.onloadend = async () => {
        const url = reader.result
        const audio = new Audio(url)
        audio.onloadedmetadata = () => {
          const clip = { id: Date.now().toString(), url, duration: Math.floor(audio.duration), createdAt: new Date().toISOString() }
          if (current.value) noteStore.addAudioClip(current.value.id, clip)
        }
      }
      reader.readAsDataURL(blob)
    }
    mediaRecorder.start()
    recording.value = true
    recordStartAt.value = Date.now()
    recTimer.value = setInterval(() => { recordNow.value = Date.now() }, 500)
  } catch (e) {
    alert('无法访问麦克风')
  }
}

const stopRecord = () => {
  if (!mediaRecorder) return
  mediaRecorder.stop()
  recording.value = false
  if (recTimer.value) { clearInterval(recTimer.value); recTimer.value = null }
}

const toggleRecord = () => { recording.value ? stopRecord() : startRecord() }

const recordTimerText = computed(() => {
  const ms = recording.value ? recordNow.value - recordStartAt.value : 0
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
})

const formatAudioDuration = (sec) => {
  const m = Math.floor((sec || 0) / 60)
  const s = (sec || 0) % 60
  return `${m}:${String(s).padStart(2,'0')}`
}

const removeAudio = (clipId) => {
  if (!current.value) return
  noteStore.removeAudioClip(current.value.id, clipId)
}

const summary = computed(() => {
  let from = sumFrom.value ? dayjs(sumFrom.value).startOf('day') : null
  let to = sumTo.value ? dayjs(sumTo.value).endOf('day') : null
  const inRange = (d) => {
    const dd = dayjs(d)
    if (from && dd.isBefore(from)) return false
    if (to && dd.isAfter(to)) return false
    return true
  }
  const list = noteStore.notes.filter(n => inRange(n.createdAt))
  const total = list.length
  const byStatus = list.reduce((acc, n) => { const s = n.status || '待开始'; acc[s] = (acc[s]||0)+1; return acc }, {})
  const ui = list.filter(n => n.urgent && n.important).length
  const pct = (v) => total ? Math.round(v * 1000 / total) / 10 : 0
  const pctByStatus = Object.fromEntries(Object.entries(byStatus).map(([k,v])=>[k,pct(v)]))
  return { total, ui, uiPct: pct(ui), byStatus, pctByStatus }
})

const pieSize = 120
const cx = pieSize / 2
const cy = pieSize / 2
const r = 54
const rInner = 34

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z'
  ].join(' ')
}

const statusOrder = ['待开始','进行中','已完成','已暂停']
const statusColors = {
  '待开始': '#ffb3c7',
  '进行中': '#b888ff',
  '已完成': '#34d399',
  '已暂停': '#ffd166'
}

const statusPie = computed(() => {
  const total = summary.value.total
  if (!total) return []
  let angle = 0
  const slices = []
  for (const label of statusOrder) {
    const value = summary.value.byStatus[label] || 0
    if (!value) continue
    const pct = value / total
    const start = angle
    const end = angle + pct * 360
    slices.push({ label, value, pct, start, end, color: statusColors[label] })
    angle = end
  }
  return slices
})

const statusLegend = computed(() => {
  const total = summary.value.total || 0
  return statusOrder.map(label => {
    const value = summary.value.byStatus[label] || 0
    const pct = total ? Math.round(value * 1000 / total) / 10 : 0
    return { label, value, pct, color: statusColors[label] }
  })
})
</script>

<style scoped>
.page { display:flex; flex-direction:column; height:100vh; }
.topbar { height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; font-weight:800; color:#ffffff; letter-spacing:.5px; background: linear-gradient(90deg, #ff7ac3, #7a5cff); box-shadow: 0 6px 18px rgba(122,92,255,.18); }
.top-actions { display:flex; gap:8px; }
.top-btn { border:0; padding:6px 12px; border-radius:999px; background: rgba(255,255,255,.2); color:#fff; font-weight:700; cursor:pointer; }
.top-btn:hover { background: rgba(255,255,255,.3); }
.notebook {
  display: flex;
  height: calc(100vh - 56px);
  background: linear-gradient(135deg, #f8fbff, #fff0f6);
}
.sidebar {
  width: 300px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff, #fff0f6);
  border-right: 1px solid #f3d3e6;
}
.search-filter { margin-top: 12px; padding-right: 10px; }
.search { width: 100%; border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; }
.filters { display:flex; gap:8px; margin-top:8px; flex-wrap: wrap; }
.fpill { border:0; padding:6px 10px; border-radius:999px; background:#f3f4f6; color:#555; cursor:pointer; font-size:12px; }
.fpill.active { background: linear-gradient(135deg,#e9d5ff,#f0abfc); color:#4a044e; }
.summary-card { margin-top: 12px; padding: 12px; border-radius: 14px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.summary-card .range { display:flex; align-items:center; gap:6px; margin:8px 0; }
.summary-card .to { color:#999; }
.summary-card .s-row { display:flex; justify-content:space-between; font-size:12px; color:#555; padding:4px 0; }
.summary-card b { color:#7a5cff; }
.pie-wrap { display:flex; gap:10px; align-items:center; }
.pie-center { font-size:16px; font-weight:800; fill:#7a5cff; }
.legend { display:flex; flex-direction:column; gap:4px; min-width: 150px; }
.lg-item { display:flex; align-items:center; gap:8px; font-size:12px; color:#555; white-space: nowrap; }
.lg-item .dot { width:10px; height:10px; border-radius:2px; display:inline-block; }
.btn-create {
  width: 100%;
  height: 44px;
  border: 0;
  color: #fff;
  font-weight: 600;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff7ac3, #7a5cff);
  box-shadow: 0 8px 24px rgba(122, 92, 255, .25);
  cursor: pointer;
}
.priority-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(135deg,#fff4fa,#f0e8ff);
  box-shadow: 0 8px 20px rgba(122,92,255,.15);
}
.priority-card .pc-title { font-size:12px; color:#a855f7; margin-bottom:6px; }
.priority-card .pc-name { font-size:14px; font-weight:700; color:#333; }
.priority-card .pc-count { margin-top:6px; font-size:12px; color:#1967d2; }
.priority-card .pc-count.due { color:#be123c; }
.priority-card .pc-go { margin-top:8px; border:0; padding:6px 10px; border-radius:999px; background:#7a5cff; color:#fff; cursor:pointer; }
.note-list { margin-top: 16px; overflow: auto; height: calc(100% - 60px); padding-right: 6px; }
.note-item {
  position: relative;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.04);
  margin-bottom: 12px;
  cursor: pointer;
}
.note-item.active {
  background: linear-gradient(180deg, #fff, #ffe8f7);
  box-shadow: 0 12px 24px rgba(255, 122, 195, .15);
}
.item-title { font-size: 14px; font-weight: 600; color: #222; }
.item-summary { font-size: 12px; color: #666; margin-top: 6px; }
.item-delete {
  position: absolute; right: 12px; top: 14px;
  background: none; border: 0; color: #ff4dd2; cursor: pointer; font-size: 12px;
}
.badges { display:flex; gap:6px; margin-top:8px; }
.b { font-size:11px; padding:2px 8px; border-radius:999px; }
.b-important { background:#ffe3ff; color:#b400ff; }
.b-urgent { background:#ffe5e5; color:#ff2b2b; }
.b-deadline { background:#e6f4ff; color:#1967d2; }
.b-status { background:#f3f4f6; color:#4b5563; }
.empty { color: #999; text-align: center; padding: 36px 0; }

.editor { flex: 1; padding: 20px 24px; position: relative; }
.editor.placeholder { display: flex; align-items: center; justify-content: center; color: #999; }
.editor-header { margin-bottom: 8px; }
.title-row { display:flex; align-items:center; gap:8px; }
.title-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 22px;
  font-weight: 700;
  color: #222;
  background: transparent;
}
.star-btn { border:0; width:36px; height:36px; border-radius:999px; background:#f3f4f6; cursor:pointer; font-size:18px; }
.star-btn.on { background: #ffebf7; color:#ff2b89; }
.hint { color: #9aa0a6; font-size: 12px; margin: 6px 0; }
.tags-input {
  width: 100%;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 14px;
  background: #fff;
}
.toolbar { display: flex; gap: 10px; margin: 14px 0; flex-wrap: wrap; }
.pill { border: 0; border-radius: 999px; padding: 8px 12px; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,.08); }
.pill-orange { background: linear-gradient(135deg,#ffb457,#ff7571); }
.pill-purple { background: linear-gradient(135deg,#b888ff,#7a5cff); }
.pill-indigo { background: linear-gradient(135deg,#8aa7ff,#6266f1); }
.pill-blue { background: linear-gradient(135deg,#4fc3f7,#4895ef); }
.pill-teal { background: linear-gradient(135deg,#2dd4bf,#10b981); }
.pill-yellow { background: linear-gradient(135deg,#ffd166,#f6c445); color:#5c3f00; }
.pill-red { background: linear-gradient(135deg,#ff7a7a,#ff5151); }

.editor-card {
  padding: 10px;
  border-radius: 18px;
  background: linear-gradient(135deg, #e8f0ff, #ffe8f7);
  box-shadow: 0 12px 36px rgba(122, 92, 255, .12);
}
.audio-list { display:flex; flex-direction: column; gap:10px; margin-top:10px; }
.audio-item { display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #eee; padding:8px; border-radius:12px; }
.audio-item .ad { font-size:12px; color:#666; }
.audio-item .adel { border:0; padding:6px 10px; border-radius:8px; background:#fee2e2; color:#b91c1c; cursor:pointer; }
.content {
  width: 100%;
  min-height: 50vh;
  border: none;
  outline: none;
  resize: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 16px;
  line-height: 1.7;
  background: rgba(255,255,255,.7);
}

.footer {
  position: absolute; left: 0; right: 0; bottom: 10px;
  display: flex; justify-content: center; gap: 16px; padding: 8px 0;
  border-top: 1px solid #f4cfe3;
}
.btn { border: 0; border-radius: 999px; padding: 10px 20px; color: #fff; font-weight: 700; cursor: pointer; }
.btn-green { background: linear-gradient(135deg,#34d399,#10b981); box-shadow: 0 8px 18px rgba(16,185,129,.24); }
.btn-purple { background: linear-gradient(135deg,#c084fc,#7c3aed); box-shadow: 0 8px 18px rgba(124,58,237,.24); }
.btn-rec { background: linear-gradient(135deg,#fb7185,#ef4444); box-shadow: 0 8px 18px rgba(239,68,68,.24); }
.btn-rec.on { animation: pulse 1s infinite; }
.rectimer { color:#ef4444; font-weight:700; }
@keyframes pulse { 0%{ filter:brightness(1)} 50%{ filter:brightness(1.2)} 100%{ filter:brightness(1)} }

.priority-row { display:flex; align-items:center; gap:12px; margin-bottom: 10px; flex-wrap: wrap; }
.tag-btn { border:0; padding:8px 14px; border-radius:999px; background:#f3f4f6; color:#555; font-weight:600; cursor:pointer; }
.tag-btn.active { color:#fff; background: linear-gradient(135deg,#ffb3c7,#ff4dd2); box-shadow: 0 8px 16px rgba(255,77,210,.24); }
.status-row { display:flex; gap:8px; margin: 6px 0 12px; flex-wrap: wrap; }
.sp { border:0; padding:6px 10px; border-radius:999px; background:#f3f4f6; color:#555; font-weight:600; cursor:pointer; }
.sp.on { color:#fff; background: linear-gradient(135deg,#86efac,#10b981); box-shadow: 0 6px 12px rgba(16,185,129,.24); }
.deadline { display:flex; align-items:center; gap:8px; margin-left:auto; }
.deadline label { font-size:12px; color:#777; }
.deadline input { border:1px solid #eee; border-radius:10px; padding:6px 8px; }
.countdown { font-size:12px; padding:4px 8px; border-radius:999px; background:#eef6ff; color:#1967d2; }
.countdown.hot { background:#fff1f2; color:#e11d48; }
.countdown.due { background:#ffe4e6; color:#be123c; }
</style>