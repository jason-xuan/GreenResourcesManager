/**
 * 桌宠交互管理 Composable
 * 负责处理点击交互、区域检测、拖动检测等
 */

import { ref } from 'vue'
import type { Ref } from 'vue'

export interface Region {
  name: string
  x: [number, number]
  y: [number, number]
  color: string
  dialogs: string[]
}

export interface ClickData {
  region: Region
  relativeX: number
  relativeY: number
  pixelX: number
  pixelY: number
}

export function usePetInteraction(
  petImageRef: Ref<HTMLElement | null>,
  regionConfig: Region[]
) {
  const clickHistory = ref<ClickData[]>([])
  const isDragging = ref(false)
  const isWindowDragging = ref(false)

  const DRAG_THRESHOLD = 10 // 拖动阈值（像素）- 增加到10像素，避免微小移动被误判
  const CLICK_MAX_TIME = 300 // 点击最大时间（毫秒）

  let mouseDownX = 0
  let mouseDownY = 0
  let mouseDownTime = 0
  let dragStartX = 0
  let dragStartY = 0
  let windowStartX = 0
  let windowStartY = 0
  let hasStartedDragging = false // 标记是否已经开始拖动

  // 根据点击坐标判断区域
  function getRegionByClick(clientX: number, clientY: number): ClickData | null {
    if (!petImageRef.value) return null

    const imageRect = petImageRef.value.getBoundingClientRect()
    const relativeX = (clientX - imageRect.left) / imageRect.width
    const relativeY = (clientY - imageRect.top) / imageRect.height

    for (const region of regionConfig) {
      if (
        relativeX >= region.x[0] &&
        relativeX < region.x[1] &&
        relativeY >= region.y[0] &&
        relativeY < region.y[1]
      ) {
        return {
          region,
          relativeX,
          relativeY,
          pixelX: clientX - imageRect.left,
          pixelY: clientY - imageRect.top
        }
      }
    }
    return null
  }

  // 处理鼠标按下
  function handleMouseDown(e: MouseEvent) {
    mouseDownX = e.clientX
    mouseDownY = e.clientY
    mouseDownTime = Date.now()
    isDragging.value = false
    hasStartedDragging = false // 重置拖动标记

    // 记录拖动起始位置（屏幕坐标）
    dragStartX = e.screenX
    dragStartY = e.screenY

    // 获取窗口当前位置
    if (window.electronAPI && window.electronAPI.getPetWindowPosition) {
      window.electronAPI
        .getPetWindowPosition()
        .then((pos) => {
          if (pos && pos.success) {
            windowStartX = pos.x
            windowStartY = pos.y
          }
        })
        .catch((err) => console.error('获取窗口位置失败:', err))
    }
  }

  // 处理鼠标移动
  function handleMouseMove(e: MouseEvent) {
    if (mouseDownTime > 0) {
      const deltaX = Math.abs(e.clientX - mouseDownX)
      const deltaY = Math.abs(e.clientY - mouseDownY)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 只有移动距离超过阈值时，才认为是拖动
      if (distance > DRAG_THRESHOLD) {
        // 标记为拖动状态
        if (!isDragging.value) {
          isDragging.value = true
          isWindowDragging.value = true
          hasStartedDragging = true
        }

        // 只有在已经确认是拖动状态后，才移动窗口
        // 这样可以避免单击时的微小移动导致窗口移动
        if (hasStartedDragging && isWindowDragging.value && window.electronAPI && window.electronAPI.movePetWindow) {
          const deltaScreenX = e.screenX - dragStartX
          const deltaScreenY = e.screenY - dragStartY
          const newX = windowStartX + deltaScreenX
          const newY = windowStartY + deltaScreenY

          window.electronAPI.movePetWindow(newX, newY).catch((err) => {
            console.error('移动窗口失败:', err)
          })
        }
      }
    }
  }

  // 处理鼠标抬起（检测点击）
  function handleMouseUp(e: MouseEvent): ClickData | null {
    if (mouseDownTime > 0) {
      const timeDiff = Date.now() - mouseDownTime
      const deltaX = Math.abs(e.clientX - mouseDownX)
      const deltaY = Math.abs(e.clientY - mouseDownY)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // 如果是点击（不是拖动）：距离小于阈值 且 时间小于最大点击时间 且 没有开始拖动
      if (!hasStartedDragging && distance <= DRAG_THRESHOLD && timeDiff < CLICK_MAX_TIME) {
        const clickData = getRegionByClick(e.clientX, e.clientY)
        if (clickData) {
          clickHistory.value.push(clickData)
          // 保持历史记录在合理范围内
          if (clickHistory.value.length > 100) {
            clickHistory.value.shift()
          }
        }
        
        // 重置状态
        mouseDownTime = 0
        isDragging.value = false
        isWindowDragging.value = false
        hasStartedDragging = false
        
        return clickData
      }

      // 如果是拖动，不处理点击，直接重置状态
      // 重置状态
      mouseDownTime = 0
      isDragging.value = false
      isWindowDragging.value = false
      hasStartedDragging = false
    }
    return null
  }

  // 处理鼠标离开
  function handleMouseLeave() {
    mouseDownTime = 0
    isDragging.value = false
    isWindowDragging.value = false
    hasStartedDragging = false
  }

  return {
    clickHistory,
    isDragging,
    isWindowDragging,
    getRegionByClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  }
}

