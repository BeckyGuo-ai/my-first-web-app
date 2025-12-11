import axios from 'axios'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

const client = axios.create({
  baseURL: DEEPSEEK_API_URL,
  headers: {
    'Authorization': apiKey ? `Bearer ${apiKey}` : '',
    'Content-Type': 'application/json'
  }
})

async function callChatAPI(payload) {
  if (!apiKey) throw new Error('Missing DEEPSEEK API key')
  const response = await client.post('', payload)
  return response.data
}

export const deepseekAPI = {
  async generateSummary(content) {
    const prompt = `请为以下内容生成一个简洁的摘要（不超过100字）：\n\n${content}\n摘要：`
    const data = await callChatAPI({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.3
    })
    return { summary: data.choices[0].message.content.trim() }
  },

  async generateTags(content) {
    const prompt = `请为以下内容生成3-5个相关标签，用中文逗号分隔：\n\n${content}\n标签：`
    const data = await callChatAPI({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.5
    })
    const tagsText = data.choices[0].message.content.trim()
    const tags = tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    return { tags: tags.slice(0, 5) }
  },

  async chatWithAI(message, notesContext = '') {
    const prompt = `你是一个智能笔记助手。用户说："${message}"\n\n${notesContext ? `相关笔记信息：${notesContext}` : ''}\n请以有帮助的、简洁的方式回复，并提供实用的建议。`
    const data = await callChatAPI({
      model: 'deepseek-chat',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
    return { response: data.choices[0].message.content.trim() }
  }
}