<template>
  <div class="fun-notification-container">
    <!-- Toast 通知 -->
    <TransitionGroup name="toast" tag="div" class="fun-notification-list">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['fun-notification-toast', `fun-notification-toast--${toast.type}`]"
        @click="handleToastClick(toast)"
      >
        <div class="fun-notification-toast__icon">
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else-if="toast.type === 'error'">❌</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else-if="toast.type === 'info'">ℹ️</span>
          <span v-else>📢</span>
        </div>
        <div class="fun-notification-toast__content">
          <div class="fun-notification-toast__title">{{ toast.title }}</div>
          <div class="fun-notification-toast__message" v-if="toast.message">{{ toast.message }}</div>
        </div>
        <button class="fun-notification-toast__close" @click.stop="removeToast(toast.id)">×</button>
        <div class="fun-notification-toast__progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
      </div>
    </TransitionGroup>

    <!-- 消息中心 -->
    <div v-if="showMessageCenter" class="fun-notification-message-center-overlay" @click="closeMessageCenter" @mousedown="preventClose">
      <div class="fun-notification-message-center" @click.stop @mousedown.stop>
        <div class="fun-notification-message-center__header">
          <h3>消息中心</h3>
          <div class="fun-notification-message-center__header-actions">
            <span class="fun-notification-message-center__close-hint">按 ESC 或点击背景关闭</span>
            <button class="fun-notification-message-center__close-btn" @click="closeMessageCenter" title="关闭消息中心">×</button>
          </div>
        </div>
        <div class="fun-notification-message-center__body">
          <div class="fun-notification-message-center__tabs">
            <button 
              v-for="tab in messageTabs" 
              :key="tab.type"
              :class="['fun-notification-message-center__tab-btn', { 'fun-notification-message-center__tab-btn--active': activeTab === tab.type }]"
              @click="activeTab = tab.type"
            >
              {{ tab.label }} ({{ getMessagesByType(tab.type).length }})
            </button>
          </div>
          <div class="fun-notification-message-center__list">
            <div 
              v-for="message in getMessagesByType(activeTab)" 
              :key="message.id"
              :class="['fun-notification-message-center__item', `fun-notification-message-center__item--${message.type}`]"
            >
              <div class="fun-notification-message-center__item-icon">
                <span v-if="message.type === 'success'">✅</span>
                <span v-else-if="message.type === 'error'">❌</span>
                <span v-else-if="message.type === 'warning'">⚠️</span>
                <span v-else-if="message.type === 'info'">ℹ️</span>
                <span v-else>📢</span>
              </div>
              <div class="fun-notification-message-center__item-content">
                <div class="fun-notification-message-center__item-title">{{ message.title }}</div>
                <div class="fun-notification-message-center__item-text" v-if="message.message">{{ message.message }}</div>
                <div class="fun-notification-message-center__item-time">{{ formatTime(message.timestamp) }}</div>
              </div>
              <button class="fun-notification-message-center__item-remove" @click="removeMessage(message.id)">×</button>
            </div>
            <div v-if="getMessagesByType(activeTab).length === 0" class="fun-notification-message-center__empty">
              暂无{{ getTabLabel(activeTab) }}消息
            </div>
          </div>
        </div>
        <div class="fun-notification-message-center__footer">
          <button class="fun-notification-message-center__clear-btn" @click="clearAllMessages">清空所有消息</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

// 导出类型定义
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationOptions {
  type?: NotificationType
  title?: string
  message?: string
  duration?: number
  persistent?: boolean
}

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  duration: number
  timestamp: number
  persistent: boolean
}

export interface Message extends Omit<Notification, 'id'> {
  id: string
}

// 数据
const toasts = ref<Notification[]>([])
const messages = ref<Message[]>([])
const showMessageCenter = ref(false)
const activeTab = ref('all')
const nextId = ref(1)

const messageTabs = [
  { type: 'all', label: '全部' },
  { type: 'success', label: '成功' },
  { type: 'error', label: '错误' },
  { type: 'warning', label: '警告' },
  { type: 'info', label: '信息' }
]

// 显示 Toast 通知
const showToast = (options: NotificationOptions = {}): number => {
  const toast: Notification = {
    id: nextId.value++,
    type: options.type || 'info',
    title: options.title || '通知',
    message: options.message || '',
    duration: options.duration || 3000,
    timestamp: Date.now(),
    persistent: options.persistent || false
  }

  toasts.value.push(toast)

  // 添加到消息中心
  messages.value.unshift({
    ...toast,
    id: `msg_${toast.id}`
  })

  // 自动移除（除非是持久化消息）
  if (!toast.persistent) {
    setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration)
  }

  return toast.id
}

// 移除 Toast
const removeToast = (id: number): void => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 处理 Toast 点击
const handleToastClick = (toast: Notification): void => {
  showMessageCenter.value = true
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
}

// 关闭消息中心
const closeMessageCenter = (): void => {
  showMessageCenter.value = false
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
}

// 防止意外关闭
const preventClose = (event: Event): void => {
  event.preventDefault()
}

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closeMessageCenter()
  }
}

// 根据类型获取消息
const getMessagesByType = (type: string): Message[] => {
  if (type === 'all') {
    return messages.value
  }
  return messages.value.filter(msg => msg.type === type)
}

// 获取标签名称
const getTabLabel = (type: string): string => {
  const tab = messageTabs.find(t => t.type === type)
  return tab ? tab.label : ''
}

// 移除消息
const removeMessage = (id: string): void => {
  const index = messages.value.findIndex(m => m.id === id)
  if (index > -1) {
    messages.value.splice(index, 1)
  }
}

// 清空所有消息
const clearAllMessages = (): void => {
  messages.value = []
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }
}

// 便捷方法
const success = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'success', title, message, ...options })
}

const error = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'error', title, message, ...options })
}

const warning = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'warning', title, message, ...options })
}

const info = (title: string, message: string, options: Partial<NotificationOptions> = {}): number => {
  return showToast({ type: 'info', title, message, ...options })
}

// 组件销毁时清理事件监听
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// 暴露方法给外部调用（保持与 ToastNotification 相同的 API）
defineExpose({
  showToast,
  removeToast,
  success,
  error,
  warning,
  info,
  messages // 暴露 messages 供外部访问（如 MessageCenterView）
})
</script>

<style scoped lang="scss">
.fun-notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  pointer-events: none;
}

.fun-notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fun-notification-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color, #e0e0e0);
  min-width: 320px;
  max-width: 400px;
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  transition: all var(--transition-base, 0.3s ease);

  &:hover {
    transform: translateX(-5px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }

  &--success {
    border-left: 4px solid #10b981;
  }

  &--error {
    border-left: 4px solid #ef4444;
  }

  &--warning {
    border-left: 4px solid #f59e0b;
  }

  &--info {
    border-left: 4px solid #3b82f6;
  }
}

.fun-notification-toast__icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.fun-notification-toast__content {
  flex: 1;
  min-width: 0;
}

.fun-notification-toast__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #333333);
  margin-bottom: 4px;
  line-height: 1.4;
}

.fun-notification-toast__message {
  font-size: 13px;
  color: var(--text-secondary, #666666);
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-line;
}

.fun-notification-toast__close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-tertiary, #999999);
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base, 0.2s ease);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-primary, #333333);
  }
}

.fun-notification-toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--accent-color, #66c0f4);
  animation: fun-notification-progress linear;
}

@keyframes fun-notification-progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* Toast 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-base, 0.3s ease);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition-base, 0.3s ease);
}

/* 消息中心样式 */
.fun-notification-message-center-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20000;
  backdrop-filter: blur(4px);
  pointer-events: auto;
  overflow: hidden;
}

.fun-notification-message-center {
  background: var(--bg-secondary, #ffffff);
  border-radius: 16px;
  width: 90vw;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color, #e0e0e0);
  pointer-events: auto;
  overflow: hidden;
  position: relative;
  z-index: 20001;
}

.fun-notification-message-center__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);

  h3 {
    margin: 0;
    color: var(--text-primary, #333333);
    font-size: 18px;
    font-weight: 600;
  }
}

.fun-notification-message-center__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fun-notification-message-center__close-hint {
  font-size: 12px;
  color: var(--text-tertiary, #999999);
  white-space: nowrap;
}

.fun-notification-message-center__close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary, #666666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base, 0.2s ease);
  pointer-events: auto;
  position: relative;
  z-index: 20002;

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-primary, #333333);
  }

  &:active {
    transform: scale(0.95);
  }
}

.fun-notification-message-center__body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fun-notification-message-center__tabs {
  display: flex;
  padding: 16px 24px 0;
  gap: 8px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.fun-notification-message-center__tab-btn {
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  color: var(--text-secondary, #666666);
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-base, 0.2s ease);

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-primary, #333333);
  }

  &--active {
    background: var(--accent-color, #66c0f4);
    color: white;
  }
}

.fun-notification-message-center__list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.fun-notification-message-center__item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all var(--transition-base, 0.2s ease);

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
  }

  &:last-child {
    margin-bottom: 0;
  }

  &--success {
    border-left: 3px solid #10b981;
  }

  &--error {
    border-left: 3px solid #ef4444;
  }

  &--warning {
    border-left: 3px solid #f59e0b;
  }

  &--info {
    border-left: 3px solid #3b82f6;
  }
}

.fun-notification-message-center__item-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.fun-notification-message-center__item-content {
  flex: 1;
  min-width: 0;
}

.fun-notification-message-center__item-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #333333);
  margin-bottom: 4px;
}

.fun-notification-message-center__item-text {
  font-size: 13px;
  color: var(--text-secondary, #666666);
  line-height: 1.4;
  margin-bottom: 4px;
  word-break: break-word;
  white-space: pre-line;
}

.fun-notification-message-center__item-time {
  font-size: 12px;
  color: var(--text-tertiary, #999999);
}

.fun-notification-message-center__item-remove {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-tertiary, #999999);
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-base, 0.2s ease);
  flex-shrink: 0;

  &:hover {
    background: var(--bg-secondary, #ffffff);
    color: var(--text-primary, #333333);
  }
}

.fun-notification-message-center__empty {
  text-align: center;
  color: var(--text-tertiary, #999999);
  font-size: 14px;
  padding: 40px 20px;
}

.fun-notification-message-center__footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  text-align: center;
}

.fun-notification-message-center__clear-btn {
  background: var(--bg-tertiary, #f5f5f5);
  color: var(--text-primary, #333333);
  border: 1px solid var(--border-color, #e0e0e0);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-base, 0.2s ease);

  &:hover {
    background: var(--bg-secondary, #ffffff);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .fun-notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }
  
  .fun-notification-toast {
    min-width: auto;
    max-width: none;
  }
  
  .fun-notification-message-center {
    width: 95vw;
    max-height: 90vh;
  }
  
  .fun-notification-message-center__tabs {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .fun-notification-message-center__tab-btn {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>