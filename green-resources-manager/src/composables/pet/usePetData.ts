/**
 * 桌宠数据管理 Composable
 * 负责管理桌宠的属性数据（好感度、食欲、睡眠欲、性欲）的加载和保存
 */

import { ref, computed } from 'vue'

export interface PetData {
  affection: number
  appetite: number
  sleepiness: number
  libido: number
}

export function usePetData() {
  const affection = ref(0)
  const appetite = ref(0)
  const sleepiness = ref(0)
  const libido = ref(0)

  // 加载桌宠数据
  async function loadPetData() {
    if (window.electronAPI && window.electronAPI.getPetData) {
      try {
        const result = await window.electronAPI.getPetData()
        if (result && result.success !== false) {
          affection.value = result.affection || 0
          appetite.value = result.appetite || 0
          sleepiness.value = result.sleepiness || 0
          libido.value = result.libido || 0
        }
      } catch (error) {
        console.error('加载桌宠数据失败:', error)
      }
    }
  }

  // 保存桌宠数据
  async function savePetData() {
    if (window.electronAPI && window.electronAPI.savePetData) {
      try {
        await window.electronAPI.savePetData({
          affection: affection.value,
          appetite: appetite.value,
          sleepiness: sleepiness.value,
          libido: libido.value
        })
      } catch (error) {
        console.error('保存桌宠数据失败:', error)
      }
    }
  }

  // 增加好感度
  async function increaseAffection(amount = 1) {
    affection.value = Math.min(100, affection.value + amount)
    await savePetData()
  }

  // 更新属性值（带范围限制）
  function updateAttribute(
    attribute: 'affection' | 'appetite' | 'sleepiness' | 'libido',
    value: number
  ) {
    const clampedValue = Math.max(0, Math.min(100, value))
    switch (attribute) {
      case 'affection':
        affection.value = clampedValue
        break
      case 'appetite':
        appetite.value = clampedValue
        break
      case 'sleepiness':
        sleepiness.value = clampedValue
        break
      case 'libido':
        libido.value = clampedValue
        break
    }
    savePetData()
  }

  return {
    affection,
    appetite,
    sleepiness,
    libido,
    loadPetData,
    savePetData,
    increaseAffection,
    updateAttribute
  }
}

