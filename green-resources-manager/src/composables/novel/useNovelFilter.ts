/**
 * 小说筛选 Composable
 * 负责搜索、排序、标签和作者筛选逻辑
 */
import { ref, computed, type Ref } from 'vue'
import type { Novel, NovelSortBy, FilterItem } from '../../types/novel'

export interface NovelFilterOptions {
  /**
   * 小说列表的响应式引用
   */
  novels: Ref<Novel[]>
  
  /**
   * 更新筛选器数据的回调函数（用于通知父组件）
   */
  onFilterDataUpdated?: (data: {
    filters: Array<{
      key: string
      title: string
      items: FilterItem[]
      selected: string[]
      excluded: string[]
    }>
  }) => void
}

/**
 * 小说筛选 Composable
 */
export function useNovelFilter(options: NovelFilterOptions) {
  const { novels } = options
  
  // 使用 ref 存储回调，以便动态更新
  const filterDataUpdatedCallback = ref(options.onFilterDataUpdated)

  // 筛选状态
  const searchQuery = ref('')
  const sortBy = ref<NovelSortBy>('name')
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedAuthors = ref<string[]>([])
  const excludedAuthors = ref<string[]>([])
  const selectedOthers = ref<string[]>([])
  const excludedOthers = ref<string[]>([])

  /**
   * 提取所有标签（带统计）
   */
  const allTags = computed<FilterItem[]>(() => {
    const tagCount: Record<string, number> = {}
    
    novels.value.forEach(novel => {
      if (novel.tags && Array.isArray(novel.tags)) {
        novel.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
    })
    
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取所有作者（带统计）
   */
  const allAuthors = computed<FilterItem[]>(() => {
    const authorCount: Record<string, number> = {}
    
    novels.value.forEach(novel => {
      if (novel.author) {
        authorCount[novel.author] = (authorCount[novel.author] || 0) + 1
      }
    })
    
    return Object.entries(authorCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  /**
   * 提取其他筛选选项（带统计）
   */
  const allOthers = computed<FilterItem[]>(() => {
    let missingResourcesCount = 0
    
    novels.value.forEach(novel => {
      // 统计丢失的资源
      if (novel.fileExists === false) {
        missingResourcesCount++
      }
    })
    
    const result: FilterItem[] = []
    if (missingResourcesCount > 0) {
      result.push({
        name: '丢失的资源',
        count: missingResourcesCount
      })
    }
    
    return result
  })

  /**
   * 筛选后的小说列表
   */
  const filteredNovels = computed<Novel[]>(() => {
    let filtered = novels.value
    
    // 标签筛选 - 必须包含所有选中的标签（AND逻辑）
    if (selectedTags.value.length > 0) {
      filtered = filtered.filter(novel => 
        novel.tags && selectedTags.value.every(tag => novel.tags.includes(tag))
      )
    }
    
    // 排除标签
    if (excludedTags.value.length > 0) {
      filtered = filtered.filter(novel => 
        !(novel.tags && excludedTags.value.some(tag => novel.tags.includes(tag)))
      )
    }
    
    // 作者筛选
    if (selectedAuthors.value.length > 0) {
      filtered = filtered.filter(novel => 
        selectedAuthors.value.includes(novel.author || '')
      )
    }
    
    // 排除作者
    if (excludedAuthors.value.length > 0) {
      filtered = filtered.filter(novel => 
        !excludedAuthors.value.includes(novel.author || '')
      )
    }
    
    // 其他筛选
    if (selectedOthers.value.length > 0) {
      filtered = filtered.filter(novel => 
        selectedOthers.value.some(other => {
          if (other === '丢失的资源') {
            return novel.fileExists === false
          }
          return false
        })
      )
    }
    if (excludedOthers.value.length > 0) {
      filtered = filtered.filter(novel => 
        !excludedOthers.value.some(other => {
          if (other === '丢失的资源') {
            return novel.fileExists === false
          }
          return false
        })
      )
    }
    
    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(novel => 
        novel.name.toLowerCase().includes(query) ||
        (novel.author && novel.author.toLowerCase().includes(query)) ||
        (novel.genre && novel.genre.toLowerCase().includes(query)) ||
        (novel.description && novel.description.toLowerCase().includes(query)) ||
        (novel.tags && novel.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'author':
          return (a.author || '').localeCompare(b.author || '')
        case 'readProgress':
          return (b.readProgress || 0) - (a.readProgress || 0)
        case 'added':
          return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime()
        default:
          return 0
      }
    })
    
    return filtered
  })

  /**
   * 标签筛选方法
   * 支持三种状态切换：未选中 -> 选中 -> 排除 -> 未选中
   */
  function filterByTag(tagName: string) {
    if (selectedTags.value.includes(tagName)) {
      // 如果当前是选中状态，则取消选择
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
    } else if (excludedTags.value.includes(tagName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
      selectedTags.value = [...selectedTags.value, tagName]
    } else {
      // 否则直接设置为选中状态
      selectedTags.value = [...selectedTags.value, tagName]
    }
    updateFilterData()
  }

  /**
   * 排除标签
   * 支持三种状态切换：未选中 -> 排除 -> 选中 -> 未选中
   */
  function excludeByTag(tagName: string) {
    if (excludedTags.value.includes(tagName)) {
      // 如果已经是排除状态，则取消排除
      excludedTags.value = excludedTags.value.filter(tag => tag !== tagName)
    } else if (selectedTags.value.includes(tagName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedTags.value = selectedTags.value.filter(tag => tag !== tagName)
      excludedTags.value = [...excludedTags.value, tagName]
    } else {
      // 否则直接设置为排除状态
      excludedTags.value = [...excludedTags.value, tagName]
    }
    updateFilterData()
  }

  /**
   * 清除标签筛选
   */
  function clearTagFilter() {
    selectedTags.value = []
    excludedTags.value = []
    updateFilterData()
  }

  /**
   * 作者筛选方法
   * 支持三种状态切换：未选中 -> 选中 -> 排除 -> 未选中
   */
  function filterByAuthor(authorName: string) {
    if (selectedAuthors.value.includes(authorName)) {
      // 如果当前是选中状态，则取消选择
      selectedAuthors.value = selectedAuthors.value.filter(author => author !== authorName)
    } else if (excludedAuthors.value.includes(authorName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedAuthors.value = excludedAuthors.value.filter(author => author !== authorName)
      selectedAuthors.value = [...selectedAuthors.value, authorName]
    } else {
      // 否则直接设置为选中状态
      selectedAuthors.value = [...selectedAuthors.value, authorName]
    }
    updateFilterData()
  }

  /**
   * 排除作者
   * 支持三种状态切换：未选中 -> 排除 -> 选中 -> 未选中
   */
  function excludeByAuthor(authorName: string) {
    if (excludedAuthors.value.includes(authorName)) {
      // 如果已经是排除状态，则取消排除
      excludedAuthors.value = excludedAuthors.value.filter(author => author !== authorName)
    } else if (selectedAuthors.value.includes(authorName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedAuthors.value = selectedAuthors.value.filter(author => author !== authorName)
      excludedAuthors.value = [...excludedAuthors.value, authorName]
    } else {
      // 否则直接设置为排除状态
      excludedAuthors.value = [...excludedAuthors.value, authorName]
    }
    updateFilterData()
  }

  /**
   * 清除作者筛选
   */
  function clearAuthorFilter() {
    selectedAuthors.value = []
    excludedAuthors.value = []
    updateFilterData()
  }

  /**
   * 其他筛选方法
   */
  function filterByOther(otherName: string) {
    if (selectedOthers.value.includes(otherName)) {
      // 如果当前是选中状态，则取消选择
      selectedOthers.value = selectedOthers.value.filter(other => other !== otherName)
    } else if (excludedOthers.value.includes(otherName)) {
      // 如果当前是排除状态，则切换为选中状态
      excludedOthers.value = excludedOthers.value.filter(other => other !== otherName)
      selectedOthers.value = [...selectedOthers.value, otherName]
    } else {
      // 否则直接设置为选中状态
      selectedOthers.value = [...selectedOthers.value, otherName]
    }
    updateFilterData()
  }

  /**
   * 排除其他筛选
   */
  function excludeByOther(otherName: string) {
    if (excludedOthers.value.includes(otherName)) {
      // 如果已经是排除状态，则取消排除
      excludedOthers.value = excludedOthers.value.filter(other => other !== otherName)
    } else if (selectedOthers.value.includes(otherName)) {
      // 如果当前是选中状态，则切换为排除状态
      selectedOthers.value = selectedOthers.value.filter(other => other !== otherName)
      excludedOthers.value = [...excludedOthers.value, otherName]
    } else {
      // 否则直接设置为排除状态
      excludedOthers.value = [...excludedOthers.value, otherName]
    }
    updateFilterData()
  }

  /**
   * 清除其他筛选
   */
  function clearOtherFilter() {
    selectedOthers.value = []
    excludedOthers.value = []
    updateFilterData()
  }

  /**
   * 处理来自 App.vue 的筛选器事件
   * @param event - 事件类型：'filter-select' | 'filter-exclude' | 'filter-clear'
   * @param data - 事件数据
   */
  function handleFilterEvent(
    event: 'filter-select' | 'filter-exclude' | 'filter-clear',
    data: { filterKey?: string; itemName?: string } | string
  ) {
    switch (event) {
      case 'filter-select':
        if (typeof data === 'object' && data.filterKey) {
          if (data.filterKey === 'tags' && data.itemName) {
            filterByTag(data.itemName)
          } else if (data.filterKey === 'authors' && data.itemName) {
            filterByAuthor(data.itemName)
          } else if (data.filterKey === 'others' && data.itemName) {
            filterByOther(data.itemName)
          }
        }
        break
      case 'filter-exclude':
        if (typeof data === 'object' && data.filterKey) {
          if (data.filterKey === 'tags' && data.itemName) {
            excludeByTag(data.itemName)
          } else if (data.filterKey === 'authors' && data.itemName) {
            excludeByAuthor(data.itemName)
          } else if (data.filterKey === 'others' && data.itemName) {
            excludeByOther(data.itemName)
          }
        }
        break
      case 'filter-clear':
        if (data === 'tags') {
          clearTagFilter()
        } else if (data === 'authors') {
          clearAuthorFilter()
        } else if (data === 'others') {
          clearOtherFilter()
        }
        break
    }
  }

  /**
   * 更新筛选器数据（用于传递给父组件/FilterSidebar）
   */
  function updateFilterData() {
    if (filterDataUpdatedCallback.value) {
      filterDataUpdatedCallback.value({
        filters: [
          {
            key: 'tags',
            title: '标签筛选',
            items: allTags.value,
            selected: selectedTags.value,
            excluded: excludedTags.value
          },
          {
            key: 'authors',
            title: '作者筛选',
            items: allAuthors.value,
            selected: selectedAuthors.value,
            excluded: excludedAuthors.value
          },
          {
            key: 'others',
            title: '其他筛选',
            items: allOthers.value,
            selected: selectedOthers.value,
            excluded: excludedOthers.value
          }
        ]
      })
    }
  }

  /**
   * 设置筛选器数据更新回调（用于 Options API 中动态设置）
   */
  function setFilterDataUpdatedCallback(callback: (data: {
    filters: Array<{
      key: string
      title: string
      items: FilterItem[]
      selected: string[]
      excluded: string[]
    }>
  }) => void) {
    filterDataUpdatedCallback.value = callback
  }

  return {
    // 状态
    searchQuery,
    sortBy,
    selectedTags,
    excludedTags,
    selectedAuthors,
    excludedAuthors,
    selectedOthers,
    excludedOthers,

    // 计算属性
    allTags,
    allAuthors,
    allOthers,
    filteredNovels,

    // 方法
    filterByTag,
    excludeByTag,
    clearTagFilter,
    filterByAuthor,
    excludeByAuthor,
    clearAuthorFilter,
    filterByOther,
    excludeByOther,
    clearOtherFilter,
    handleFilterEvent,
    updateFilterData,
    setFilterDataUpdatedCallback
  }
}

