/**
 * 桌宠菜单管理 Composable
 * 负责管理菜单的显示和隐藏
 */

import { ref } from 'vue'

export function usePetMenu() {
  const isVisible = ref(false)

  // 切换菜单显示/隐藏
  function toggleMenu() {
    isVisible.value = !isVisible.value
  }

  // 显示菜单
  function showMenu() {
    isVisible.value = true
  }

  // 隐藏菜单
  function hideMenu() {
    isVisible.value = false
  }

  return {
    isVisible,
    toggleMenu,
    showMenu,
    hideMenu
  }
}

