/**
 * 插件导航管理器
 * 管理插件注册的导航项
 */

interface PluginNavigationItem {
  id: string
  name: string
  icon: string
  onClick: () => void
  pluginId: string
}

class PluginNavigationManager {
  private navigationItems: Map<string, PluginNavigationItem> = new Map()

  /**
   * 注册导航项
   */
  register(item: PluginNavigationItem): void {
    this.navigationItems.set(item.id, item)
    console.log(`[插件导航] 注册导航项: ${item.id} (${item.name})`)
    
    // 触发导航项更新事件
    window.dispatchEvent(new CustomEvent('plugin-navigation-updated'))
  }

  /**
   * 取消注册导航项
   */
  unregister(id: string): void {
    if (this.navigationItems.has(id)) {
      this.navigationItems.delete(id)
      console.log(`[插件导航] 取消注册导航项: ${id}`)
      
      // 触发导航项更新事件
      window.dispatchEvent(new CustomEvent('plugin-navigation-updated'))
    }
  }

  /**
   * 获取所有导航项
   */
  getNavigationItems(): PluginNavigationItem[] {
    return Array.from(this.navigationItems.values())
  }

  /**
   * 根据插件ID获取导航项
   */
  getNavigationItemsByPluginId(pluginId: string): PluginNavigationItem[] {
    return Array.from(this.navigationItems.values()).filter(item => item.pluginId === pluginId)
  }

  /**
   * 清除指定插件的所有导航项
   */
  clearByPluginId(pluginId: string): void {
    const itemsToRemove = this.getNavigationItemsByPluginId(pluginId)
    itemsToRemove.forEach(item => this.unregister(item.id))
  }
}

// 导出单例
const pluginNavigationManager = new PluginNavigationManager()
export default pluginNavigationManager

