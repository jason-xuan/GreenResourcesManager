/**
 * 桌宠收益数据管理 Composable
 * 负责管理收益相关的数据（游戏数量等）
 */

import { ref, onMounted } from 'vue'

export function usePetEarnings() {
  const gameCount = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 加载游戏数据
  async function loadGamesData() {
    if (!window.electronAPI || !window.electronAPI.getPetGamesData) {
      error.value = 'Electron API 不可用'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.getPetGamesData()
      if (result && result.success) {
        gameCount.value = result.totalCount || 0
      } else {
        error.value = result.error || '获取游戏数据失败'
        gameCount.value = 0
      }
    } catch (err: any) {
      console.error('加载游戏数据失败:', err)
      error.value = err.message || '未知错误'
      gameCount.value = 0
    } finally {
      isLoading.value = false
    }
  }

  // 刷新数据
  async function refresh() {
    await loadGamesData()
  }

  // 组件挂载时自动加载
  onMounted(() => {
    loadGamesData()
  })

  return {
    gameCount,
    isLoading,
    error,
    loadGamesData,
    refresh
  }
}

