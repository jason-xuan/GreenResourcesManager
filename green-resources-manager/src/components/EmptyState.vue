<!-- 当列表的物体为空时使用，或者当搜索结果为空时使用 -->
<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <button 
      v-if="showButton" 
      class="btn-add-first-item" 
      @click="$emit('action')"
    >
      {{ buttonText }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    icon: {
      type: String,
      default: '📦'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    showButton: {
      type: Boolean,
      default: false
    },
    buttonText: {
      type: String,
      default: '添加第一个项目'
    }
  },
  emits: ['action']
}
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column; /* 确保内容垂直排列 */
  align-items: center; /* 水平居中 */
  justify-content: center; /* 垂直居中 */
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 40px; /* 增加图标和标题之间的间距，确保明显分行 */
  opacity: 0.6;
  line-height: 1;
  display: block; /* 确保图标是块级元素，独占一行 */
}

.empty-state h3 {
  color: var(--text-primary);
  font-size: 1.5rem;
  margin-bottom: 10px;
  margin-top: 0; /* 确保标题顶部没有额外间距 */
  transition: color 0.3s ease;
  display: block; /* 确保标题是块级元素，独占一行 */
  width: 100%; /* 占据全宽，确保换行 */
}

.empty-state p {
  margin-bottom: 30px;
  transition: color 0.3s ease;
}

.btn-add-first-item {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.btn-add-first-item:hover {
  background: var(--accent-hover);
}
</style>
