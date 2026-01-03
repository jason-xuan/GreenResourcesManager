/**
 * 插件 API
 * 提供给插件使用的安全 API 接口
 */

import notificationService from './NotificationService'
import pluginNavigationManager from './PluginNavigationManager'

interface PluginAPI {
  // UI API
  ui: {
    showNotification: (title: string, type: string, options?: any) => void
    showCustomView: (config: { title: string; content: string; onMount?: (container: HTMLElement) => void }) => void
  }
  
  // 存储 API（使用 localStorage）
  storage: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    remove: (key: string) => Promise<void>
  }
  
  // 导航 API（占位，未来实现）
  navigation: {
    register: (config: any) => void
    unregister: (id: string) => void
  }
}

class PluginAPIImplementation implements PluginAPI {
  private pluginId: string

  constructor(pluginId: string) {
    this.pluginId = pluginId
  }

  ui = {
    showNotification: (title: string, type: string = 'info', options: any = {}) => {
      try {
        const message = options.message || ''
        notificationService.show(type, title, message, options)
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 显示通知失败:`, error)
      }
    },
    
    showCustomView: (config: { title: string; content: string; onMount?: (container: HTMLElement) => void }) => {
      try {
        // 通过全局事件触发显示插件视图
        window.dispatchEvent(new CustomEvent('plugin-show-custom-view', {
          detail: {
            pluginId: this.pluginId,
            title: config.title,
            content: config.content,
            onMount: config.onMount
          }
        }))
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 显示自定义视图失败:`, error)
      }
    }
  }

  storage = {
    get: async (key: string): Promise<any> => {
      try {
        // 使用插件ID作为前缀，避免键名冲突
        const storageKey = `plugin-${this.pluginId}-${key}`
        const stored = localStorage.getItem(storageKey)
        if (stored === null) {
          return null
        }
        return JSON.parse(stored)
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 读取存储失败:`, error)
        return null
      }
    },

    set: async (key: string, value: any): Promise<void> => {
      try {
        const storageKey = `plugin-${this.pluginId}-${key}`
        localStorage.setItem(storageKey, JSON.stringify(value))
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 写入存储失败:`, error)
        throw error
      }
    },

    remove: async (key: string): Promise<void> => {
      try {
        const storageKey = `plugin-${this.pluginId}-${key}`
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 删除存储失败:`, error)
        throw error
      }
    }
  }

  navigation = {
    register: (config: any) => {
      try {
        pluginNavigationManager.register({
          id: config.id || `plugin-${this.pluginId}-nav`,
          name: config.name || '未命名',
          icon: config.icon || '📦',
          onClick: config.onClick || (() => {}),
          pluginId: this.pluginId
        })
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 注册导航项失败:`, error)
      }
    },

    unregister: (id: string) => {
      try {
        pluginNavigationManager.unregister(id)
      } catch (error) {
        console.error(`[插件 ${this.pluginId}] 取消注册导航项失败:`, error)
      }
    }
  }
}

/**
 * 创建插件 API 实例
 */
export function createPluginAPI(pluginId: string): PluginAPI {
  return new PluginAPIImplementation(pluginId)
}

