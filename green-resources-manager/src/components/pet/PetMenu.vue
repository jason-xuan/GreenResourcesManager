<template>
  <div id="menu" :class="{ show: isVisible, hidden: !isVisible }" class="pet-menu">
    <div id="menu-header" class="menu-header">
      <div id="menu-title" class="menu-title">桌宠菜单</div>
    </div>
    <div id="menu-content" class="menu-content">
      <div class="menu-section">
        <div class="affection-display">
          <span class="affection-label">好感度：</span>
          <span class="affection-value">{{ affection }}</span>
        </div>
      </div>
      <div class="menu-section">
        <div class="affection-display">
          <span class="affection-label">食欲：</span>
          <span class="affection-value">{{ appetite }}</span>
        </div>
      </div>
      <div class="menu-section">
        <div class="affection-display">
          <span class="affection-label">睡眠欲：</span>
          <span class="affection-value">{{ sleepiness }}</span>
        </div>
      </div>
      <div class="menu-section">
        <div class="affection-display">
          <span class="affection-label">性欲：</span>
          <span class="affection-value">{{ libido }}</span>
        </div>
      </div>
      <!-- 调试信息面板 -->
      <div v-if="debugMode" class="menu-section" id="debug-info-section">
        <div class="menu-section-title">调试信息</div>
        <div class="debug-info-panel" id="debug-info-panel">
          <div class="debug-info-item">
            <span class="debug-info-label">调试模式：</span>{{ debugInfo.mode }}
          </div>
          <div v-if="debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">点击坐标：</span>({{ debugInfo.clickData.pixelX.toFixed(0) }},
            {{ debugInfo.clickData.pixelY.toFixed(0) }})
          </div>
          <div v-if="debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">相对坐标：</span>({{ (debugInfo.clickData.relativeX * 100).toFixed(1) }}%,
            {{ (debugInfo.clickData.relativeY * 100).toFixed(1) }}%)
          </div>
          <div v-if="debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">区域：</span>{{ debugInfo.clickData.region.name }}
          </div>
          <div v-if="debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">区域范围：</span>X: [{{ (debugInfo.clickData.region.x[0] * 100).toFixed(1) }}%,
            {{ (debugInfo.clickData.region.x[1] * 100).toFixed(1) }}%], Y: [{{ (debugInfo.clickData.region.y[0] * 100).toFixed(1) }}%,
            {{ (debugInfo.clickData.region.y[1] * 100).toFixed(1) }}%]
          </div>
          <div v-if="!debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">点击坐标：</span>未点击
          </div>
          <div v-if="!debugInfo.clickData" class="debug-info-item">
            <span class="debug-info-label">区域：</span>无
          </div>
          <div v-if="debugInfo.message" class="debug-info-item" style="margin-top: 10px; color: #4a90e2">
            {{ debugInfo.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean
  affection: number
  appetite: number
  sleepiness: number
  libido: number
  debugMode: boolean
  debugInfo: {
    mode: string
    clickData: any
    message?: string
  }
}>()
</script>

<style scoped>
.pet-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  z-index: 0;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  pointer-events: auto;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  border-right: 2px solid #e0e0e0;
}

.pet-menu.show {
  transform: translateX(0);
  opacity: 1;
  transition: all 0.3s ease;
}

.pet-menu.hidden {
  pointer-events: none;
  opacity: 0;
  transition: all 0.3s ease;
}

.menu-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

.menu-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.menu-content {
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: #c0c0c0 #f0f0f0;
}

.menu-content::-webkit-scrollbar {
  width: 8px;
}

.menu-content::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.menu-content::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 4px;
}

.menu-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.menu-section {
  margin-bottom: 25px;
}

.menu-section-title {
  font-size: 14px;
  font-weight: bold;
  color: #666;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.affection-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}

.affection-label {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.affection-value {
  font-size: 20px;
  font-weight: bold;
  color: #4a90e2;
}

.debug-info-panel {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-size: 12px;
  font-family: monospace;
  margin-top: 10px;
}

.debug-info-item {
  margin-bottom: 5px;
  line-height: 1.4;
}

.debug-info-label {
  color: #4a90e2;
  font-weight: bold;
}
</style>

