# 桌宠组件重构说明

## 概述

桌宠功能已从独立的 HTML 文件重构为 Vue 组件化架构，提升了代码的可维护性和可扩展性。

## 架构设计

### 目录结构

```
src/
├── composables/pet/          # 桌宠相关的 Composables
│   ├── usePetData.ts         # 数据管理（好感度、食欲等）
│   ├── usePetInteraction.ts  # 交互处理（点击、拖动）
│   ├── usePetDialog.ts       # 对话框管理
│   ├── usePetMenu.ts         # 菜单管理
│   ├── usePetDebug.ts        # 调试模式
│   └── usePetRegions.ts      # 区域配置
├── components/pet/           # 桌宠组件
│   ├── PetView.vue           # 主组件
│   ├── PetDialog.vue         # 对话框组件
│   ├── PetMenu.vue           # 菜单组件
│   └── PetInput.vue          # 输入框组件
└── pages/
    └── PetPage.vue           # 桌宠页面入口
```

## Composables 说明

### usePetData
管理桌宠的属性数据（好感度、食欲、睡眠欲、性欲）
- `loadPetData()` - 从文件加载数据
- `savePetData()` - 保存数据到文件
- `increaseAffection(amount)` - 增加好感度

### usePetInteraction
处理用户交互（点击、拖动）
- `handleMouseDown(e)` - 处理鼠标按下
- `handleMouseMove(e)` - 处理鼠标移动
- `handleMouseUp(e)` - 处理鼠标抬起（检测点击）
- `getRegionByClick(x, y)` - 根据坐标获取区域

### usePetDialog
管理对话框的显示和文本
- `showDialog(region)` - 显示对话框（打字机效果）
- `hideDialog()` - 隐藏对话框
- `showMessage(message)` - 显示自定义消息

### usePetMenu
管理菜单的显示/隐藏
- `toggleMenu()` - 切换菜单显示
- `showMenu()` - 显示菜单
- `hideMenu()` - 隐藏菜单

### usePetDebug
调试模式相关功能
- `toggleDebugMode()` - 切换调试模式
- `drawRegions()` - 绘制区域边界
- `showClickMarker(x, y, name)` - 显示点击标记
- `updateDebugInfo(message, clickData)` - 更新调试信息

### usePetRegions
区域配置数据
- `regionConfig` - 所有可交互区域的配置

## 组件说明

### PetView
主组件，整合所有功能
- 管理所有 composables
- 处理用户交互事件
- 协调子组件

### PetDialog
对话框组件
- 显示桌宠的对话文本
- 支持打字机效果
- 自动隐藏功能

### PetMenu
菜单组件
- 显示桌宠属性（好感度、食欲等）
- 显示调试信息（调试模式下）
- 支持滚动

### PetInput
输入框组件
- 用户输入消息
- 发送消息功能
- 菜单按钮

## 使用方法

### 开发环境
1. 启动 Vite 开发服务器：`npm run dev`
2. 桌宠窗口会自动加载 Vue 应用（通过 `pet.html`）

### 生产环境
1. 构建项目：`npm run build`
2. 桌宠窗口会加载构建后的 Vue 应用

## 优势

1. **模块化**：功能拆分为独立的 composables，易于维护
2. **组件化**：UI 拆分为多个组件，职责清晰
3. **类型安全**：使用 TypeScript，提供类型检查
4. **可扩展**：易于添加新功能和修改现有功能
5. **可测试**：composables 可以独立测试
6. **代码复用**：composables 可以在其他组件中复用

## 迁移说明

原有的 `pet.html` 文件已不再使用，但保留作为参考。所有功能已迁移到 Vue 组件中。

## 后续改进建议

1. 添加单元测试
2. 使用 Pinia 进行状态管理（如果需要全局状态）
3. 添加动画效果
4. 支持多语言
5. 添加更多交互区域和对话

