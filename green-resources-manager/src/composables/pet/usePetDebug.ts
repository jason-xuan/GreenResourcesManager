/**
 * 桌宠调试模式管理 Composable
 * 负责管理调试模式的开启/关闭、区域绘制、点击标记等
 */

import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Region, ClickData } from './usePetInteraction'

export function usePetDebug(
  debugOverlayRef: Ref<HTMLElement | null>,
  petImageRef: Ref<HTMLElement | null>,
  regionConfig: Region[]
) {
  const debugMode = ref(false)
  const debugInfo = ref<{
    mode: string
    clickData: ClickData | null
    message?: string
  }>({
    mode: '关闭',
    clickData: null
  })

  // 切换调试模式
  function toggleDebugMode() {
    debugMode.value = !debugMode.value

    // 保存调试模式状态到本地存储
    try {
      localStorage.setItem('petDebugMode', String(debugMode.value))
    } catch (e) {
      console.error('保存调试模式状态失败:', e)
    }

    if (debugMode.value) {
      drawRegions()
      updateDebugInfo('调试模式已开启')
    } else {
      clearRegions()
      updateDebugInfo('调试模式已关闭')
    }
  }

  // 绘制区域边界
  function drawRegions() {
    if (!debugOverlayRef.value || !petImageRef.value) return

    clearRegions()

    regionConfig.forEach((region) => {
      const regionDiv = document.createElement('div')
      regionDiv.className = 'debug-region'
      regionDiv.style.borderColor = region.color
      regionDiv.style.left = region.x[0] * 100 + '%'
      regionDiv.style.top = region.y[0] * 100 + '%'
      regionDiv.style.width = (region.x[1] - region.x[0]) * 100 + '%'
      regionDiv.style.height = (region.y[1] - region.y[0]) * 100 + '%'

      const label = document.createElement('div')
      label.className = 'debug-region-label'
      label.textContent = region.name
      label.style.color = region.color
      regionDiv.appendChild(label)

      debugOverlayRef.value!.appendChild(regionDiv)
    })
  }

  // 清除区域边界
  function clearRegions() {
    if (!debugOverlayRef.value) return
    const regions = debugOverlayRef.value.querySelectorAll('.debug-region')
    regions.forEach((region) => region.remove())
  }

  // 显示点击标记（爱心）
  function showClickMarker(clientX: number, clientY: number, regionName: string) {
    if (!debugOverlayRef.value || !petImageRef.value) return

    const overlayRect = debugOverlayRef.value.getBoundingClientRect()
    const relativeX = clientX - overlayRect.left
    const relativeY = clientY - overlayRect.top

    const marker = document.createElement('div')
    marker.className = 'debug-click-marker'
    marker.textContent = '❤️'
    marker.style.left = relativeX + 'px'
    marker.style.top = relativeY + 'px'
    debugOverlayRef.value.appendChild(marker)

    // 2秒后移除标记
    setTimeout(() => {
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker)
      }
    }, 2000)
  }

  // 更新调试信息
  function updateDebugInfo(message: string, clickData: ClickData | null = null) {
    if (!debugMode.value) return

    debugInfo.value = {
      mode: debugMode.value ? '开启' : '关闭',
      clickData,
      message
    }
  }

  // 窗口大小改变时重新绘制区域
  function handleResize() {
    if (debugMode.value) {
      drawRegions()
    }
  }

  // 加载保存的调试模式状态
  function loadDebugModeState() {
    try {
      const savedDebugMode = localStorage.getItem('petDebugMode')
      if (savedDebugMode === 'true') {
        debugMode.value = true
        toggleDebugMode()
      }
    } catch (e) {
      console.error('加载调试模式状态失败:', e)
    }
  }

  onMounted(() => {
    loadDebugModeState()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    debugMode,
    debugInfo,
    toggleDebugMode,
    drawRegions,
    clearRegions,
    showClickMarker,
    updateDebugInfo
  }
}

