/**
 * 桌宠对话框管理 Composable
 * 负责管理对话框的显示、隐藏和文本内容
 */

import { ref } from 'vue'
import type { Region } from './usePetInteraction'

const defaultDialogTexts = [
  '你好！我是你的桌宠～',
  '今天也要加油哦！',
  '有什么需要帮助的吗？',
  '记得多休息，不要太累～',
  '工作/学习辛苦了！',
  '保持好心情，一切都会好起来的！',
  '我在这里陪伴你～',
  '点击我可以看到不同的消息哦！'
]

export function usePetDialog() {
  const isVisible = ref(false)
  const text = ref('')
  const isTyping = ref(false)

  let currentTextIndex = 0
  let dialogAutoHideTimer: NodeJS.Timeout | null = null
  let typeInterval: NodeJS.Timeout | null = null

  // 显示对话框（打字机效果）
  function showDialog(region: Region | null = null) {
    // 清除之前的定时器
    if (dialogAutoHideTimer) {
      clearTimeout(dialogAutoHideTimer)
      dialogAutoHideTimer = null
    }
    if (typeInterval) {
      clearInterval(typeInterval)
      typeInterval = null
    }

    let dialogText: string

    // 如果指定了区域，从该区域的对话数组中随机选择
    if (region && region.dialogs && region.dialogs.length > 0) {
      const randomIndex = Math.floor(Math.random() * region.dialogs.length)
      dialogText = region.dialogs[randomIndex]
      console.log(`区域 "${region.name}" 的对话:`, dialogText)
    } else {
      // 否则使用默认对话
      dialogText = defaultDialogTexts[currentTextIndex % defaultDialogTexts.length]
      currentTextIndex++
      console.log('默认对话:', dialogText)
    }

    // 打字机效果显示文本
    text.value = ''
    isVisible.value = true
    isTyping.value = true

    let charIndex = 0
    typeInterval = setInterval(() => {
      if (charIndex < dialogText.length) {
        text.value += dialogText[charIndex]
        charIndex++
      } else {
        clearInterval(typeInterval!)
        typeInterval = null
        isTyping.value = false
        // 打字机效果完成后，3秒后自动隐藏
        dialogAutoHideTimer = setTimeout(() => {
          hideDialog()
          dialogAutoHideTimer = null
        }, 3000)
      }
    }, 50) // 每个字符间隔50ms
  }

  // 隐藏对话框
  function hideDialog() {
    // 清除定时器
    if (dialogAutoHideTimer) {
      clearTimeout(dialogAutoHideTimer)
      dialogAutoHideTimer = null
    }
    if (typeInterval) {
      clearInterval(typeInterval)
      typeInterval = null
    }
    isVisible.value = false
    text.value = ''
    isTyping.value = false
  }

  // 显示自定义消息（用于输入框发送的消息）
  function showMessage(message: string) {
    // 清除之前的定时器
    if (dialogAutoHideTimer) {
      clearTimeout(dialogAutoHideTimer)
      dialogAutoHideTimer = null
    }
    if (typeInterval) {
      clearInterval(typeInterval)
      typeInterval = null
    }

    text.value = message
    isVisible.value = true
    isTyping.value = false

    // 3秒后自动隐藏
    dialogAutoHideTimer = setTimeout(() => {
      hideDialog()
      dialogAutoHideTimer = null
    }, 3000)
  }

  return {
    isVisible,
    text,
    isTyping,
    showDialog,
    hideDialog,
    showMessage
  }
}

