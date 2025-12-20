<template>
  <div class="settings-section">
    <div class="settings-grid">
      <!-- 网站相关设置可以在这里添加 -->
      <div class="empty-state">
        <div class="empty-icon">🌐</div>
        <h4>网站设置</h4>
        <p>网站相关的设置选项将在这里显示</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'WebsiteSettings',
  props: {
    settings: {
      type: Object,
      required: true
    }
  },
  emits: ['update:settings']
}
</script>

<style scoped>
.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 500;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}
</style>

