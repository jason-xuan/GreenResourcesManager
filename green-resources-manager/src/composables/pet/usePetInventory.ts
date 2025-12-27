/**
 * 桌宠仓库管理 Composable
 * 负责管理仓库物品、使用物品等
 */

import { ref } from 'vue'

export interface InventoryItem {
  id: string
  name: string
  count: number
  icon: string
  usable?: boolean
  effect?: {
    affection?: number
    appetite?: number
    sleepiness?: number
    libido?: number
  }
}

export function usePetInventory() {
  // 仓库物品列表
  const inventoryItems = ref<InventoryItem[]>([])

  // 添加物品到仓库
  function addItem(shopItem: { id: string; name: string; icon: string; effect?: any }, count: number = 1) {
    const existingItem = inventoryItems.value.find(item => item.id === shopItem.id)
    if (existingItem) {
      existingItem.count += count
    } else {
      // 从商店物品数据中获取物品信息
      inventoryItems.value.push({
        id: shopItem.id,
        name: shopItem.name,
        count,
        icon: shopItem.icon,
        usable: true,
        effect: shopItem.effect
      })
    }
  }

  // 使用物品
  function useItem(item: InventoryItem): { success: boolean; effect?: InventoryItem['effect']; message?: string } {
    if (item.count <= 0) {
      return { success: false, message: '物品数量不足' }
    }

    item.count--
    if (item.count === 0) {
      const index = inventoryItems.value.findIndex(i => i.id === item.id)
      if (index > -1) {
        inventoryItems.value.splice(index, 1)
      }
    }

    return { success: true, effect: item.effect, message: `使用了 ${item.name}` }
  }

  return {
    inventoryItems,
    addItem,
    useItem
  }
}

