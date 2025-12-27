/**
 * 桌宠缩放管理 Composable
 * 负责管理桌宠窗口的缩放功能
 */

import { ref, onMounted, onUnmounted } from 'vue'

const MIN_ZOOM = -3 // 最小缩放级别（Electron 的 zoom level）
const MAX_ZOOM = 3 // 最大缩放级别
const ZOOM_STEP = 0.1 // 每次滚轮的缩放步长

export function usePetZoom() {
  const zoomLevel = ref(0) // 当前缩放级别

  // 加载保存的缩放级别
  async function loadZoomLevel() {
    try {
      const savedZoom = localStorage.getItem('petZoomLevel')
      if (savedZoom !== null) {
        const zoom = parseFloat(savedZoom)
        if (!isNaN(zoom)) {
          await setZoomLevel(zoom)
        }
      } else if (window.electronAPI && window.electronAPI.getPetWindowZoom) {
        // 如果没有保存的值，从窗口获取当前缩放级别
        const result = await window.electronAPI.getPetWindowZoom()
        if (result && result.success) {
          zoomLevel.value = result.zoomLevel || 0
        }
      }
    } catch (error) {
      console.error('加载缩放级别失败:', error)
    }
  }

  // 设置缩放级别
  async function setZoomLevel(level: number) {
    // 限制在有效范围内
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level))
    zoomLevel.value = clampedLevel

    if (window.electronAPI && window.electronAPI.setPetWindowZoom) {
      try {
        await window.electronAPI.setPetWindowZoom(clampedLevel)
        // 保存到本地存储
        localStorage.setItem('petZoomLevel', String(clampedLevel))
      } catch (error) {
        console.error('设置缩放级别失败:', error)
      }
    }
  }

  // 调整缩放（相对调整）
  async function adjustZoom(delta: number) {
    const newLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.value + delta))
    await setZoomLevel(newLevel)
  }

  // 处理滚轮事件
  function handleWheel(e: WheelEvent) {
    // 检查是否在菜单区域（菜单在左侧 0-500px）
    const isInMenuArea = e.clientX < 500
    
    // 如果在菜单区域，不处理缩放，让菜单正常滚动
    if (isInMenuArea) {
      return
    }
    
    // 在交互区域（图片区域）进行缩放
    // 阻止默认滚动行为
    e.preventDefault()
    e.stopPropagation()

    // 计算缩放增量（向下滚动缩小，向上滚动放大）
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    adjustZoom(delta)
  }

  // 重置缩放
  async function resetZoom() {
    await setZoomLevel(0)
  }

  onMounted(() => {
    loadZoomLevel()
  })

  return {
    zoomLevel,
    setZoomLevel,
    adjustZoom,
    handleWheel,
    resetZoom
  }
}

