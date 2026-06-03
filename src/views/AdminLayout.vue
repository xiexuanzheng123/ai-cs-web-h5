<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { label: '基础看板', to: '/admin/dashboard' },
  { label: '规则配置', to: '/admin/rules' },
  { label: '知识库管理', to: '/admin/knowledge' },
  { label: 'RAG 回归集', to: '/admin/rag-eval' },
]
</script>

<template>
  <main class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <strong>客服后台</strong>
        <span>AI Customer Service</span>
      </div>
      <nav class="sidebar-nav" aria-label="后台导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          active-class="active"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
      <RouterLink class="sidebar-back" to="/">返回客服</RouterLink>
    </aside>
    <section class="admin-content">
      <RouterView />
    </section>
  </main>
</template>
