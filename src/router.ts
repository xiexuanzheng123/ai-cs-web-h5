import { createRouter, createWebHistory } from 'vue-router'
import ChatPage from './views/ChatPage.vue'
import DashboardPage from './views/DashboardPage.vue'
import RuleAdminPage from './views/RuleAdminPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ChatPage },
    { path: '/admin/dashboard', component: DashboardPage },
    { path: '/admin/rules', component: RuleAdminPage },
  ],
})
