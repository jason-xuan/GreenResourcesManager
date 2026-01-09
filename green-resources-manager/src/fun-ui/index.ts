/**
 * Fun UI 组件库
 * 所有组件都以 fun- 开头，如 <fun-button>
 */

import type { App } from 'vue'
import FunButton from './components/Button/FunButton.vue'
import FunBusinessCard from './components/BusinessCard/FunBusinessCard.vue'
import FunRate from './components/Rate/FunRate.vue'

// 组件列表
const components = {
  FunButton,
  FunBusinessCard,
  FunRate
}

/**
 * 全局注册所有组件
 */
export function install(app: App) {
  // 注册为 fun- 格式
  app.component('fun-button', FunButton)
  app.component('fun-business-card', FunBusinessCard)
  app.component('fun-rate', FunRate)
}

// 导出所有组件
export {
  FunButton,
  FunBusinessCard,
  FunRate
}

// 默认导出（支持 app.use(FunUI)）
export default {
  install
}
