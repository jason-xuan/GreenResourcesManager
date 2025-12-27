/**
 * 桌宠窗口的独立 Vue 应用入口
 * 这个文件用于创建桌宠窗口的 Vue 应用实例
 */

import { createApp } from 'vue'
import PetPage from './pages/PetPage.vue'
import './pet-styles.scss'

// 创建独立的 Vue 应用实例用于桌宠窗口
const app = createApp(PetPage)

// 挂载到 #app 元素
app.mount('#app')

console.log('桌宠 Vue 应用已加载')

