import { PageConfig, ResourceType } from '../types/page';
import saveManager from './SaveManager';

/**
 * 自定义页面管理器
 * 负责管理页面配置的增删改查、持久化存储以及默认页面初始化
 */
class CustomPageManager {
  private pages: PageConfig[] = [];
  private initialized = false;

  constructor() {
  }

  /**
   * 获取页面配置文件路径
   */
  private get pagesFilePath(): string {
    return `${saveManager.dataDirectories.settings}/pages.json`;
  }

  /**
   * 初始化页面管理器
   * 加载页面配置，如果不存在则创建默认配置
   */
  async init() {
    if (this.initialized) return;

    try {
      const loadedPages = await saveManager.readJsonFile(this.pagesFilePath);
      if (loadedPages && Array.isArray(loadedPages) && loadedPages.length > 0) {
        this.pages = loadedPages;
      } else {
        this.pages = this.getDefaultPages();
        await this.savePages();
      }
    } catch (error) {
      console.error('加载页面配置失败，使用默认配置:', error);
      this.pages = this.getDefaultPages();
      // 如果加载失败则尝试保存默认配置（可能是文件不存在）
      await this.savePages();
    }

    this.initialized = true;
  }

  /**
   * 获取默认页面配置
   * @returns 默认页面配置数组
   */
  getDefaultPages(): PageConfig[] {
    const now = Date.now();
    return [
      { id: 'games', name: '游戏', icon: '🎮', type: 'Game', isDefault: true, order: 1, createdAt: now, updatedAt: now },
      { id: 'images', name: '图片', icon: '🖼️', type: 'Image', isDefault: true, order: 2, createdAt: now, updatedAt: now },
      { id: 'videos', name: '视频', icon: '🎬', type: 'Video', isDefault: true, order: 3, createdAt: now, updatedAt: now },
      { id: 'novels', name: '小说', icon: '📚', type: 'Novel', isDefault: true, order: 4, createdAt: now, updatedAt: now },
      { id: 'websites', name: '网站', icon: '🌐', type: 'Website', isDefault: true, order: 5, createdAt: now, updatedAt: now },
      { id: 'audios', name: '声音', icon: '🎵', type: 'Audio', isDefault: true, order: 6, createdAt: now, updatedAt: now },
    ];
  }

  /**
   * 获取所有页面配置（按顺序排序）
   * @returns 页面配置数组
   */
  getPages(): PageConfig[] {
    return [...this.pages].sort((a, b) => a.order - b.order);
  }

  /**
   * 获取可见页面配置（过滤掉隐藏的页面）
   * @returns 可见页面配置数组
   */
  getVisiblePages(): PageConfig[] {
    return this.getPages().filter(p => !p.isHidden);
  }

  /**
   * 根据ID获取页面配置
   * @param id 页面ID
   * @returns 页面配置或undefined
   */
  getPage(id: string): PageConfig | undefined {
    return this.pages.find(p => p.id === id);
  }

  /**
   * 添加新页面
   * @param page 页面配置（不包含id、order、createdAt、updatedAt）
   * @returns 新创建的页面配置
   */
  async addPage(page: Omit<PageConfig, 'id' | 'order' | 'createdAt' | 'updatedAt'>): Promise<PageConfig> {
    const now = Date.now();
    const newPage: PageConfig = {
      ...page,
      id: `custom-${now}`,
      order: this.pages.length + 1,
      createdAt: now,
      updatedAt: now
    };
    this.pages.push(newPage);
    await this.savePages();
    return newPage;
  }

  /**
   * 更新页面配置
   * @param id 页面ID
   * @param updates 要更新的字段
   */
  async updatePage(id: string, updates: Partial<PageConfig>) {
    const index = this.pages.findIndex(p => p.id === id);
    if (index !== -1) {
      const page = this.pages[index];

      this.pages[index] = {
        ...page,
        ...updates,
        updatedAt: Date.now(),
        // 确保id、type和isDefault不会被意外更改
        id: page.id,
        type: page.type,
        isDefault: page.isDefault
      };
      await this.savePages();
    }
  }

  /**
   * 删除页面
   * @param id 页面ID
   * @throws 如果尝试删除默认页面则抛出错误
   */
  async deletePage(id: string) {
    const page = this.pages.find(p => p.id === id);
    if (!page) return;

    if (page.isDefault) {
      throw new Error('无法删除默认页面');
    }

    this.pages = this.pages.filter(p => p.id !== id);
    await this.savePages();

    // 删除该页面的数据目录
    await saveManager.deletePageData(id);
  }

  /**
   * 重新排序页面
   * @param newOrderIds 新的页面ID顺序数组
   */
  async reorderPages(newOrderIds: string[]) {
    const orderMap = new Map(newOrderIds.map((id, index) => [id, index + 1]));

    let changed = false;
    this.pages.forEach(page => {
      const newOrder = orderMap.get(page.id);
      if (newOrder !== undefined && page.order !== newOrder) {
        page.order = newOrder;
        changed = true;
      }
    });

    if (changed) {
      await this.savePages();
    }
  }

  /**
   * 保存页面配置到文件
   */
  private async savePages() {
    await saveManager.writeJsonFile(this.pagesFilePath, this.pages);
  }
}

// 创建单例实例
export const customPageManager = new CustomPageManager();
export default customPageManager;
