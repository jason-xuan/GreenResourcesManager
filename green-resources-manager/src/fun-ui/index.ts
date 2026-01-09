/**
 * Fun UI 组件库
 * 所有组件都以 fun- 开头，如 <fun-button>
 * 
 * 组件分类：
 * - basic: 基本组件（按钮、图标等）
 * - data-input: 数据录入（输入框、评分等）
 * - data-display: 数据展示（卡片、列表等）
 * - navigation: 导航组件（菜单、标签页等）
 * - feedback: 反馈组件（对话框、提示等）
 */

import type { App } from 'vue'

// Basic 基本组件
import FunButton from './basic/Button/FunButton.vue'
import FunTag from './basic/Tag/FunTag.vue'

// Data Input 数据录入
import FunRate from './data-input/Rate/FunRate.vue'

// Data Display 数据展示
import FunBusinessCard from './data-display/BusinessCard/FunBusinessCard.vue'
import FunCard from './data-display/Card/FunCard.vue'
import FunEmptyState from './data-display/EmptyState/FunEmptyState.vue'

// Navigation 导航组件
import FunPagination from './navigation/Pagination/FunPagination.vue'

// Feedback 反馈组件
import FunAlert from './feedback/Alert/FunAlert.vue'
import FunConfirmDialog from './feedback/ConfirmDialog/FunConfirmDialog.vue'

// 组件列表
const components = {
  // Basic
  FunButton,
  FunTag,
  // Data Input
  FunRate,
  // Data Display
  FunBusinessCard,
  FunCard,
  FunEmptyState,
  // Navigation
  FunPagination,
  // Feedback
  FunAlert,
  FunConfirmDialog
}

/**
 * 全局注册所有组件
 */
export function install(app: App) {
  // 注册为 fun- 格式
  app.component('fun-button', FunButton)
  app.component('fun-tag', FunTag)
  app.component('fun-rate', FunRate)
  app.component('fun-business-card', FunBusinessCard)
  app.component('fun-card', FunCard)
  app.component('fun-empty-state', FunEmptyState)
  app.component('fun-pagination', FunPagination)
  app.component('fun-alert', FunAlert)
  app.component('fun-confirm-dialog', FunConfirmDialog)
}

// 导出所有组件
export {
  // Basic
  FunButton,
  FunTag,
  // Data Input
  FunRate,
  // Data Display
  FunBusinessCard,
  FunCard,
  FunEmptyState,
  // Navigation
  FunPagination,
  // Feedback
  FunAlert,
  FunConfirmDialog
}

// 默认导出（支持 app.use(FunUI)）
export default {
  install
}
