<template>
  <div class="menu-shop">
    <div class="shop-header">
      <h3 class="shop-title">商店</h3>
      <p class="shop-subtitle">购买物品来提升桌宠属性</p>
    </div>
    
    <div class="shop-items">
      <div class="shop-item" v-for="item in shopItems" :key="item.id">
        <!-- 第一行：icon 和名字 -->
        <div class="item-header">
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
        </div>
        <!-- 第二行：描述 -->
        <div class="item-description">{{ item.description }}</div>
        <!-- 第三行：价格和购买按钮 -->
        <div class="item-footer">
          <div class="item-price">
            <span class="price-label">价格：</span>
            <span class="price-value">{{ item.price }} 金币</span>
          </div>
          <button 
            class="buy-button" 
            :disabled="!canAfford(item.price)"
            @click="buyItem(item)"
          >
            购买
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="shopItems.length === 0" class="empty-state">
      <p>商店暂未开放</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ShopItem {
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

const props = defineProps<{
  coins?: number
}>()

const emit = defineEmits<{
  buy: [item: ShopItem]
}>()

// 商店物品列表（示例数据）
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
  }
])

function canAfford(price: number): boolean {
  return (props.coins || 0) >= price
}

function buyItem(item: ShopItem) {
  if (canAfford(item.price)) {
    emit('buy', item)
  }
}
</script>

<style scoped>
.menu-shop {
  padding: 10px 0;
}

.shop-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.shop-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.shop-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.shop-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shop-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.shop-item:hover {
  background: #f0f0f0;
  border-color: #4a90e2;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.item-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.item-description {
  font-size: 12px;
  color: #666;
  padding-left: 32px; /* 与 icon 对齐 */
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 32px; /* 与 icon 对齐 */
}

.item-price {
  font-size: 12px;
}

.price-label {
  color: #999;
}

.price-value {
  color: #ff9800;
  font-weight: bold;
}

.buy-button {
  padding: 6px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.buy-button:hover:not(:disabled) {
  background: #357abd;
  transform: translateY(-1px);
}

.buy-button:active:not(:disabled) {
  transform: translateY(0);
}

.buy-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
</style>

