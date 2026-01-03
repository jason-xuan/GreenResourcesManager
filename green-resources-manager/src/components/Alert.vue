<template>
  <div v-if="internalVisible" class="alert-overlay" @mousedown="handleOverlayMouseDown">
    <div class="alert-content" @mousedown.stop>
      <div class="alert-header">
        <div class="alert-icon">
          <span v-if="internalType === 'error'">❌</span>
          <span v-else-if="internalType === 'warning'">⚠️</span>
          <span v-else-if="internalType === 'success'">✅</span>
          <span v-else>ℹ️</span>
        </div>
        <h3 class="alert-title">{{ internalTitle }}</h3>
      </div>
      <div class="alert-body">
        <p class="alert-message">{{ internalMessage }}</p>
      </div>
      <div class="alert-footer">
        <button class="btn-confirm" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
type AlertType = 'info' | 'success' | 'warning' | 'error'

export default {
  name: 'Alert',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '提示'
    },
    message: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info',
      validator: (value: string) => ['info', 'success', 'warning', 'error'].includes(value)
    }
  },
  emits: ['confirm', 'close'],
  data() {
    return {
      internalVisible: false,
      internalTitle: '提示',
      internalMessage: '',
      internalType: 'info' as AlertType,
      resolveCallback: null as ((value?: void) => void) | null
    }
  },
  watch: {
    // 支持通过 props 控制（直接使用组件时）
    visible(newVal: boolean) {
      if (newVal) {
        this.internalVisible = true
        this.internalTitle = this.title
        this.internalMessage = this.message
        this.internalType = this.type as AlertType
        // 监听 ESC 键关闭
        document.addEventListener('keydown', this.handleKeydown)
      } else {
        this.internalVisible = false
        document.removeEventListener('keydown', this.handleKeydown)
      }
    }
  },
  methods: {
    // 供 AlertService 调用的方法
    showAlert(title: string, message: string, type: AlertType, resolve?: (value?: void) => void) {
      this.internalTitle = title
      this.internalMessage = message
      this.internalType = type
      this.internalVisible = true
      this.resolveCallback = resolve || null
      // 监听 ESC 键关闭
      document.addEventListener('keydown', this.handleKeydown)
    },
    handleConfirm() {
      this.internalVisible = false
      document.removeEventListener('keydown', this.handleKeydown)
      this.$emit('confirm')
      this.$emit('close')
      // 调用 resolve 回调（如果存在）
      if (this.resolveCallback) {
        this.resolveCallback()
        this.resolveCallback = null
      }
    },
    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     */
    handleOverlayMouseDown(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.handleConfirm()
      }
    },
    handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        this.handleConfirm()
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
  }
}
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.alert-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  animation: alertSlideIn 0.3s ease-out;
  border: 1px solid var(--border-color);
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-tertiary);
}

.alert-icon span {
  display: block;
}

.alert-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.alert-body {
  padding: 24px;
}

.alert-message {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-line;
}

.alert-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 80px;
}

.btn-confirm:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-confirm:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .alert-content {
    width: 95%;
    margin: 20px;
  }

  .alert-header {
    padding: 16px 20px;
  }

  .alert-body {
    padding: 20px;
  }

  .alert-footer {
    padding: 12px 20px;
  }
}
</style>

