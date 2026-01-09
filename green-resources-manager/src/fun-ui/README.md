# Fun UI 组件库

Fun UI 是 Green Resources Manager 的自定义 UI 组件库，所有组件都以 `fun-` 开头。

## 📦 使用方式

组件已经全局注册，可以直接在模板中使用：

```vue
<template>
  <!-- 基础用法 -->
  <fun-button>默认按钮</fun-button>
  
  <!-- 不同类型 -->
  <fun-button type="primary">主要按钮</fun-button>
  <fun-button type="success">成功按钮</fun-button>
  <fun-button type="danger">危险按钮</fun-button>
  
  <!-- 不同尺寸 -->
  <fun-button size="small">小按钮</fun-button>
  <fun-button size="medium">中等按钮</fun-button>
  <fun-button size="large">大按钮</fun-button>
  
  <!-- 块级按钮 -->
  <fun-button block>块级按钮</fun-button>
  
  <!-- 禁用状态 -->
  <fun-button disabled>禁用按钮</fun-button>
  
  <!-- 事件处理 -->
  <fun-button @click="handleClick">点击我</fun-button>
</template>
```

## 🎨 组件列表

### Button 按钮

#### Props

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| type | 按钮类型 | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'default'` | `'default'` |
| size | 按钮尺寸 | `'small' \| 'medium' \| 'large'` | `'medium'` |
| disabled | 是否禁用 | `boolean` | `false` |
| block | 是否为块级按钮 | `boolean` | `false` |
| nativeType | 原生 button 类型 | `'button' \| 'submit' \| 'reset'` | `'button'` |

#### Events

| 事件名 | 说明 | 参数 |
|--------|------|------|
| click | 点击事件 | `(event: MouseEvent) => void` |

#### Slots

| 插槽名 | 说明 |
|--------|------|
| default | 按钮内容 |

## 🎯 设计原则

- **BEM 命名规范**：所有 CSS 类名遵循 BEM（Block Element Modifier）规范
  - Block（块）：组件名，如 `fun-button`
  - Element（元素）：块的一部分，使用 `__` 连接，如 `fun-button__icon`
  - Modifier（修饰符）：状态或变体，使用 `--` 连接，如 `fun-button--primary`
- **组件命名**：所有组件以 `fun-` 开头，如 `<fun-button>`
- **主题系统**：所有组件使用 CSS 变量（设计令牌），支持主题切换
- **技术栈**：遵循 Vue 3 Composition API 最佳实践
- **类型安全**：提供完整的 TypeScript 类型支持

### BEM 命名示例

```scss
// Block（块）
.fun-button { }

// Element（元素）
.fun-button__icon { }
.fun-button__content { }

// Modifier（修饰符）
.fun-button--primary { }
.fun-button--large { }
.fun-button--disabled { }

// 元素 + 修饰符
.fun-button__icon--left { }
```
