/**
 * 桌宠商店管理 Composable
 * 负责管理商店物品、购买逻辑等
 */

import { ref } from 'vue'
import type { Ref } from 'vue'

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  icon: string
  effect?: {
    affection?: number
    appetite?: number
    sleepiness?: number
    libido?: number
  }
}

export function usePetShop(coins: Ref<number>) {
  // 商店物品列表
  const shopItems = ref<ShopItem[]>([
    {
      id: 'food-1',
      name: '美味食物',
      description: '增加食欲 +10',
      price: 50,
      icon: '🍎',
      effect: { appetite: 10 }
    },
    {
      id: 'gift-1',
      name: '精美礼物',
      description: '增加好感度 +5',
      price: 100,
      icon: '🎁',
      effect: { affection: 5 }
    },
    {
      id: 'sleep-1',
      name: '安眠药',
      description: '增加睡眠欲 +10',
      price: 60,
      icon: '💊',
      effect: { sleepiness: 10 }
    }
  ])

  // 购买物品
  function buyItem(item: ShopItem): { success: boolean; message?: string } {
    if (coins.value < item.price) {
      return { success: false, message: '金币不足' }
    }

    coins.value -= item.price
    return { success: true, message: `成功购买 ${item.name}` }
  }

  return {
    shopItems,
    buyItem
  }
}

