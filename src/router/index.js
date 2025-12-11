import HomePage from '../components/HomePage.vue'
import NoteEditPage from '../components/NoteEditPage.vue'
import NoteDetailPage from '../components/NoteDetailPage.vue'

export const routes = [
  { path: '/', component: HomePage },
  { path: '/edit', component: NoteEditPage },
  { path: '/edit/:id', component: NoteEditPage },
  { path: '/note/:id', component: NoteDetailPage }
]