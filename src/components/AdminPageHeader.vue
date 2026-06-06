<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  breadcrumb?: string
}>()
</script>

<template>
  <div class="admin-page-header">
    <div class="header-main">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div class="header-right">
      <nav v-if="breadcrumb" aria-label="面包屑">{{ breadcrumb }}</nav>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.admin-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.header-main {
  min-width: 0;
}

.admin-page-header h2 {
  margin: 0;
  color: #334155;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
}

.admin-page-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.admin-page-header nav {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}
</style>
