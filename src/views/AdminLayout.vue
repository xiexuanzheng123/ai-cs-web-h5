<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterLink, RouterView } from 'vue-router'
import {
  Collection,
  DataAnalysis,
  Document,
  FolderOpened,
  HomeFilled,
  List,
  Setting,
} from '@element-plus/icons-vue'

const route = useRoute()

const navItems = [
  { label: '基础看板', to: '/admin/dashboard', icon: DataAnalysis },
  { label: '规则配置', to: '/admin/rules', icon: Setting },
  { label: '知识库管理', to: '/admin/knowledge', icon: Document },
  { label: '分类管理', to: '/admin/categories', icon: FolderOpened },
  { label: 'RAG 回归集', to: '/admin/rag-eval', icon: Collection },
  { label: '链路日志', to: '/admin/trace-logs', icon: List },
]

const activeMenu = computed(() => route.path)
</script>

<template>
  <div class="admin-layout">
    <el-container class="admin-shell">
      <el-aside width="220px" class="admin-aside">
        <div class="sidebar-brand">
          <strong>客服后台</strong>
          <span>AI Customer Service</span>
        </div>
        <el-menu :default-active="activeMenu" router class="admin-menu">
          <el-menu-item v-for="item in navItems" :key="item.to" :index="item.to">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
        <div class="sidebar-footer">
          <RouterLink class="sidebar-back" to="/">
            <el-icon><HomeFilled /></el-icon>
            <span>返回客服</span>
          </RouterLink>
        </div>
      </el-aside>
      <el-main class="admin-main">
        <RouterView />
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: var(--el-bg-color-page);
}

.admin-aside {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color);
  background: #f4f7fa;
}

.sidebar-brand {
  display: grid;
  gap: 4px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.sidebar-brand strong {
  color: #334155;
  font-size: 18px;
}

.sidebar-brand span {
  color: #64748b;
  font-size: 12px;
}

.admin-menu {
  flex: 1;
  border-right: 0;
  background: transparent;
}

.sidebar-footer {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.sidebar-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
  text-decoration: none;
  transition: color 0.15s;
}

.sidebar-back:hover {
  color: var(--el-color-primary);
}

.admin-main {
  padding: 16px 20px 24px;
  background: var(--el-bg-color-page);
}
</style>
