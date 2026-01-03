<template>
  <div v-if="internalVisible" class="confirm-overlay" @mousedown="handleOverlayMouseDown">
    <div class="confirm-content" @mousedown.stop>
      <div class="confirm-header">
        <div class="confirm-icon">
          <span>❓</span>
        </div>
        <h3 class="confirm-title">{{ internalTitle }}</h3>
      </div>
      <div class="confirm-body">
        <p class="confirm-message">{{ internalMessage }}</p>
      </div>
      <div class="confirm-footer">
        <button class="btn-confirm" @click="handleConfirm" ref="confirmButton">确定</button>
        <button class="btn-cancel" @click="handleCancel" ref="cancelButton" autofocus>取消</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ConfirmDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '确认'
    },
    message: {
      type: String,
      default: ''
    }
  },
  emits: ['confirm', 'cancel', 'close'],
  data() {
    return {
      internalVisible: false,
      internalTitle: '确认',
      internalMessage: '',
      resolveCallback: null as ((value: boolean) => void) | null
    }
  },
  watch: {
    // 支持通过 props 控制（直接使用组件时）
    visible(newVal: boolean) {
      if (newVal) {
        this.internalVisible = true
        this.internalTitle = this.title
        this.internalMessage = this.message
        // 监听 ESC 键关闭
        document.addEventListener('keydown', this.handleKeydown)
        // 在下一个 tick 让取消按钮获得焦点（默认高亮）
        this.$nextTick(() => {
          const cancelButton = this.$refs.cancelButton as HTMLButtonElement
          if (cancelButton) {
            cancelButton.focus()
          }
        })
      } else {
        this.internalVisible = false
        document.removeEventListener('keydown', this.handleKeydown)
      }
    }
  },
  methods: {
    // 供 ConfirmService 调用的方法
    showConfirm(title: string, message: string, resolve?: (value: boolean) => void) {
      this.internalTitle = title
      this.internalMessage = message
      this.internalVisible = true
      this.resolveCallback = resolve || null
      // 监听 ESC 键关闭
      document.addEventListener('keydown', this.handleKeydown)
      // 在下一个 tick 让取消按钮获得焦点（默认高亮）
      this.$nextTick(() => {
        const cancelButton = this.$refs.cancelButton as HTMLButtonElement
        if (cancelButton) {
          cancelButton.focus()
        }
      })
    },
    handleConfirm() {
      this.internalVisible = false
      document.removeEventListener('keydown', this.handleKeydown)
      this.$emit('confirm')
      this.$emit('close')
      // 调用 resolve 回调（如果存在）
      if (this.resolveCallback) {
        this.resolveCallback(true)
        this.resolveCallback = null
      }
    },
    handleCancel() {
      this.internalVisible = false
      document.removeEventListener('keydown', this.handleKeydown)
      this.$emit('cancel')
      this.$emit('close')
      // 调用 resolve 回调（如果存在）
      if (this.resolveCallback) {
        this.resolveCallback(false)
        this.resolveCallback = null
      }
    },
    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     */
    handleOverlayMouseDown(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        this.handleCancel()
      }
    },
    handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        this.handleCancel()
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeydown)
  }
}
</script>

<style scoped>
.confirm-overlay {
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

.confirm-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 20px 40px var(--shadow-medium);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  animation: confirmSlideIn 0.3s ease-out;
  border: 1px solid var(--border-color);
}

@keyframes confirmSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.confirm-icon {
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

.confirm-icon span {
  display: block;
}

.confirm-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.confirm-body {
  padding: 24px;
}

.confirm-message {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-line;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 80px;
}

/* 确认按钮（次要按钮，在左边） */
.btn-confirm {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-confirm:hover {
  background: var(--bg-secondary);
  border-color: var(--accent-color);
}

.btn-confirm:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 取消按钮（主要按钮，在右边，默认高亮） */
.btn-cancel {
  background: var(--accent-color);
  color: white;
}

.btn-cancel:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-cancel:focus {
  outline: none;
  background: var(--accent-hover);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3), 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-cancel:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .confirm-content {
    width: 95%;
    margin: 20px;
  }

  .confirm-header {
    padding: 16px 20px;
  }

  .confirm-body {
    padding: 20px;
  }

  .confirm-footer {
    padding: 12px 20px;
  }
}
</style>

