import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from './views/AdminLayout.vue'
import ChatPage from './views/ChatPage.vue'
import DashboardPage from './views/DashboardPage.vue'
import CategoryAdminPage from './views/CategoryAdminPage.vue'
import KnowledgeAdminPage from './views/KnowledgeAdminPage.vue'
import RAGEvalAdminPage from './views/RAGEvalAdminPage.vue'
import RuleAdminPage from './views/RuleAdminPage.vue'
import TraceLogPage from './views/TraceLogPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ChatPage },
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/dashboard',
      children: [
        { path: 'dashboard', component: DashboardPage },
        { path: 'knowledge', component: KnowledgeAdminPage },
        { path: 'categories', component: CategoryAdminPage },
        { path: 'rag-eval', component: RAGEvalAdminPage },
        { path: 'trace-logs', component: TraceLogPage },
        { path: 'rules', component: RuleAdminPage },
      ],
    },
  ],
})
