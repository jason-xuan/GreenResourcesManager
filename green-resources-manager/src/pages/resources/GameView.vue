<template>
  <BaseView ref="baseView" :items="games" :filtered-items="filteredGames" :empty-state-config="emptyStateConfig"
    :toolbar-config="toolbarConfig" :context-menu-items="contextMenuItems"
    :pagination-config="paginationConfig" :sort-by="sortBy" :search-query="searchQuery"
    :scale="scale" :show-layout-control="true" @update:scale="updateScale"
    @empty-state-action="handleEmptyStateAction" @add-item="showAddDialogHandler" @sort-changed="handleSortChanged"
    @search-query-changed="handleSearchQueryChanged" @sort-by-changed="handleSortByChanged"
    @context-menu-click="handleContextMenuClick" @page-change="handlePageChange">
    <!-- 主内容区域 -->
    <div class="game-content" @drop="handleDrop" @dragover="handleDragOver" @dragenter="handleDragEnter"
      @dragleave="handleDragLeave" :class="{ 'drag-over': dragDropComposable?.isDragOver || false }">


      <!-- 游戏网格 -->
      <GameGrid 
        :games="paginatedItems"
        :is-game-running="isGameRunning"
        :is-electron-environment="isElectronEnvironment"
        :scale="scale"
        :layout-styles="layoutStyles"
        @game-click="showGameDetail"
        @game-contextmenu="handleGameContextMenu"
        @game-action="launchGame"
      />


      <!-- 添加游戏对话框 -->
      <AddGameDialog 
        :visible="showAddDialog" 
        :is-electron-environment="isElectronEnvironment"
        :available-tags="allTags"
        @close="closeAddDialog"
        @confirm="handleAddGameConfirm"
      />

      <!-- 编辑游戏对话框 -->
      <EditGameDialog 
        :visible="showEditDialog" 
        :game="editForm"
        :is-electron-environment="isElectronEnvironment"
        :available-tags="allTags"
        @close="closeEdit"
        @confirm="handleEditGameConfirm"
      />

      <!-- 游戏详情页面 -->
      <GameDetailPanel 
        :visible="showDetailDialog && !!selectedItem" 
        :game="selectedItem"
        :is-running="selectedItem ? isGameRunning(selectedItem) : false"
        @close="closeDetail"
        @action="handleDetailAction"
        @update-rating="handleUpdateRating"
        @update-comment="handleUpdateComment"
        @toggle-favorite="handleToggleFavorite"
      />


      <!-- 路径更新确认对话框 -->
      <PathUpdateDialog :visible="showPathUpdateDialog" title="更新游戏路径" description="发现同名但路径不同的游戏文件："
        item-name-label="游戏名称" :item-name="pathUpdateInfo.existingItem?.name || ''"
        :old-path="pathUpdateInfo.existingItem?.executablePath || ''" :new-path="pathUpdateInfo.newPath || ''"
        missing-label="文件丢失" found-label="文件存在" question="是否要更新游戏路径？" @confirm="confirmPathUpdate"
        @cancel="closePathUpdateDialog" />

      <!-- 强制结束游戏确认对话框 -->
      <div v-if="showTerminateConfirmDialog" class="modal-overlay" @click="closeTerminateConfirmDialog">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>强制结束游戏</h3>
            <button class="btn-close" @click="closeTerminateConfirmDialog">✕</button>
          </div>
          <div class="modal-body">
            <p>确定要强制结束游戏 <strong>{{ gameToTerminate?.name }}</strong> 吗？</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
              此操作将立即终止游戏进程，未保存的数据可能会丢失。
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeTerminateConfirmDialog">取消</button>
            <button class="btn-confirm" @click="confirmTerminateGame" style="background: #ef4444;">确认结束</button>
          </div>
        </div>
      </div>

      <!-- 密码输入对话框 -->
      <PasswordInputDialog
        :visible="showPasswordDialog"
        :title="passwordDialogTitle"
        :message="passwordDialogMessage"
        @confirm="handlePasswordConfirm"
        @cancel="handlePasswordCancel"
      />
    </div>
  </BaseView>
</template>

<script lang="ts">
import BaseView from '../../components/BaseView.vue'
import MediaCard from '../../components/MediaCard.vue'
import FormField from '../../components/FormField.vue'
import PathUpdateDialog from '../../components/PathUpdateDialog.vue'
import PasswordInputDialog from '../../components/PasswordInputDialog.vue'
import AddGameDialog from '../../components/game/AddGameDialog.vue'
import EditGameDialog from '../../components/game/EditGameDialog.vue'
import GameDetailPanel from '../../components/game/GameDetailPanel.vue'
import GameGrid from '../../components/game/GameGrid.vue'

import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'
import alertService from '../../utils/AlertService.ts'
import confirmService from '../../utils/ConfirmService.ts'
import { ref, toRefs, PropType } from 'vue'
import { PageConfig } from '../../types/page'
import { GameSortBy } from '../../types/game'
import { useGameFilter } from '../../composables/game/useGameFilter'
import { useGameManagement } from '../../composables/game/useGameManagement'
import { useGameScreenshot } from '../../composables/game/useGameScreenshot'
import { useGameRunning } from '../../composables/game/useGameRunning'
import { useGamePlayTime } from '../../composables/game/useGamePlayTime'
import { useGameDragAndDrop } from '../../composables/game/useGameDragAndDrop'
import { useArchive, type ArchiveItem, isArchiveFile } from '../../composables/useArchive'
import { useGameRunningStore } from '../../stores/game-running'
import { createResourcePage } from '../../composables/createResourcePage'
import { formatPlayTime, formatLastPlayed, formatFirstPlayed } from '../../utils/formatters'

export default {
  name: 'GameView',
  components: {
    BaseView,
    MediaCard,
    FormField,
    PathUpdateDialog,
    AddGameDialog,
    EditGameDialog,
    GameDetailPanel,
    GameGrid
  },
  props: {
    pageConfig: {
      type: Object as PropType<PageConfig>,
      default: () => ({ id: 'games', type: 'Game' })
    }
  },
  emits: ['filter-data-updated'],
  setup(props) {
    // 响应式数据
    const games = ref([])
    const isElectronEnvironment = ref(false)
    const searchQuery = ref('')
    const sortBy = ref<GameSortBy>('name-asc')

    // 获取父组件方法的辅助函数（在 Options API 中通过 this.$parent 访问）
    // 注意：这些函数会在组件实例化后通过 methods 中的包装方法设置
    let getRunningGamesFn: () => Map<string, any> = () => gameRunningStore.getRunningGamesMap()
    let isGameRunningFn: (gameId: string) => boolean = (gameId) => gameRunningStore.isGameRunning(gameId)

    // 创建用于筛选的 isGameRunning 函数（接受 Game 对象）
    // 直接使用 store，确保总是获取最新的运行状态
    const isGameRunningForFilter = (game: any) => {
      return gameRunningStore.isGameRunning(game.id)
    }

    // 使用筛选 composable
    const filterComposable = useGameFilter(games, searchQuery, sortBy, isGameRunningForFilter)

    // 使用管理 composable
    const managementComposable = useGameManagement(
      games,
      filterComposable.extractAllTags,
      isElectronEnvironment,
      props.pageConfig.id
    )

    // 使用游戏运行状态 store（暴露给组件使用）
    const gameRunningStore = useGameRunningStore()

    // 获取父组件方法的辅助函数（在 Options API 中通过 this.$parent 访问）
    // 注意：这些函数会在组件实例化后通过 methods 中的包装方法设置
    let addRunningGameFn: (gameInfo: any) => void = (gameInfo) => gameRunningStore.addRunningGame(gameInfo)
    let removeRunningGameFn: (gameId: string) => void = (gameId) => gameRunningStore.removeRunningGame(gameId)

    // 使用截图 composable
    const screenshotComposable = useGameScreenshot(
      isElectronEnvironment,
      () => getRunningGamesFn(),
      // 截图成功后的回调：如果游戏没有封面图，自动设置为截图
      async (result) => {
        if (!result.gameId || !result.filepath) return
        
        // 在 games 数组中查找对应的游戏
        const game = games.value.find((g: any) => g.id === result.gameId)
        if (!game) {
          console.log('未找到对应的游戏，无法设置封面图')
          return
        }
        
        // 检查游戏是否已有封面图
        if (!game.image || game.image.trim() === '') {
          try {
            // 更新游戏封面图
            await managementComposable.updateGame(game.id, { image: result.filepath })
            console.log(`✅ 已自动将截图设置为游戏 "${game.name}" 的封面图`)
            
            // 显示提示（可选）
            notify.toast('success', '封面已更新', `已自动将截图设置为 "${game.name}" 的封面图`)
          } catch (error: any) {
            console.error('设置封面图失败:', error)
          }
        } else {
          console.log(`游戏 "${game.name}" 已有封面图，跳过自动设置`)
        }
      }
    )

    // 使用运行状态 composable
    const runningComposable = useGameRunning(
      games,
      () => getRunningGamesFn(),
      (gameInfo) => addRunningGameFn(gameInfo),
      (gameId) => removeRunningGameFn(gameId)
    )

    // 使用游戏时长 composable
    const playTimeComposable = useGamePlayTime(
      games,
      managementComposable.updateGamePlayTime,
      managementComposable.updateGame,
      managementComposable.checkGameTimeAchievements,
      (gameId) => removeRunningGameFn(gameId)
    )

    // ========== 工具函数 ==========
    const formatDateUtil = (dateString: string) => {
      if (!dateString) return '未知'
      try {
        return new Date(dateString).toLocaleDateString('zh-CN')
      } catch {
        return '未知'
      }
    }

    // ========== 使用工厂函数创建资源页面 ==========
    // 注意：contextMenuHandlers 需要在 setup 中定义，但某些处理器需要访问组件方法
    // 所以先创建占位函数，在 methods 中会重新设置
    const resourcePage = createResourcePage({
      pageConfig: {
        pageType: 'games',
        itemType: '游戏',
        defaultPageSize: 20,
        defaultSortBy: 'name-asc'
      },
      items: games,
      filteredItems: filterComposable.filteredGames,
      searchQuery: searchQuery,
      sortBy: sortBy,
      crudConfig: {
        items: games,
        onAdd: async (gameData: any) => {
          return await managementComposable.addGame(gameData as any)
        },
        onUpdate: async (id: string, updates: any) => {
          await managementComposable.updateGame(id, updates)
        },
        onDelete: async (id: string) => {
          await managementComposable.removeGame(id)
        },
        onLoad: managementComposable.loadGames,
        onSave: async () => {
          await managementComposable.saveGames()
        },
        getItemName: (game: any) => game.name,
        itemType: '游戏'
      },
      contextMenuItems: [
        { key: 'detail', icon: '👁️', label: '查看详情' },
        { key: 'launch', icon: '▶️', label: '启动游戏' },
        { key: 'folder', icon: '📁', label: '打开文件夹' },
        { key: 'screenshot-folder', icon: '📸', label: '打开截图文件夹' },
        { key: 'update-folder-size', icon: '📊', label: '更新文件夹大小' },
        { 
          key: 'compress', 
          icon: '🗜️', 
          label: '压缩文件',
          children: [
            { key: 'compress-to', icon: '🗜️', label: '压缩到指定目录...' },
            { key: 'compress-here', icon: '🗜️', label: '压缩到当前目录' }
          ]
        },
        { 
          key: 'extract', 
          icon: '📦', 
          label: '解压文件',
          children: [
            { key: 'extract', icon: '📦', label: '解压到指定目录...' },
            { key: 'extract-here', icon: '📦', label: '解压到当前目录' }
          ]
        },
        { key: 'edit', icon: '✏️', label: '编辑信息' },
        { key: 'remove', icon: '🗑️', label: '删除游戏' }
      ],
      contextMenuHandlers: {
        detail: (game: any) => {
          // 这个会在 methods 中被覆盖
          resourcePage.showDetail(game)
        },
        launch: (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        folder: (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        'screenshot-folder': (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        'update-folder-size': (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        'compress-to': (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        'compress-here': (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        extract: (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        'extract-here': (game: any) => {
          // 这个会在 methods 中被覆盖
        },
        edit: (game: any) => resourcePage.showEdit(game),
        remove: (game: any) => resourcePage.deleteItem(game)
      },
      emptyState: {
        icon: '🎮',
        title: '你的游戏库是空的',
        description: '点击"添加游戏"按钮来添加你的第一个游戏，或直接拖拽游戏文件（.exe、.swf、.bat）或压缩包（.zip、.rar、.7z 等）到此处',
        buttonText: '添加第一个游戏',
        buttonAction: 'showAddGameDialog'
      },
      toolbar: {
        addButtonText: '添加游戏',
        searchPlaceholder: '搜索游戏...',
        sortOptions: [
          { value: 'name-asc', label: '按名称排序（升序）' },
          { value: 'name-desc', label: '按名称排序（降序）' },
          { value: 'lastPlayed-asc', label: '按最后游玩时间（升序）' },
          { value: 'lastPlayed-desc', label: '按最后游玩时间（降序）' },
          { value: 'playTime-asc', label: '按游戏时长（升序）' },
          { value: 'playTime-desc', label: '按游戏时长（降序）' },
          { value: 'added-asc', label: '按添加时间（升序）' },
          { value: 'added-desc', label: '按添加时间（降序）' }
        ]
      },
      displayLayout: {
        minWidth: 80,
        maxWidth: 400
      },
      getStats: (game: any) => [
        { label: '开发商', value: game.developer || '未知' },
        { label: '发行商', value: game.publisher || '未知' },
        { label: '引擎', value: game.engine || '未知' },
        { label: '游戏时长', value: formatPlayTime(game.playTime || 0) },
        { label: '游玩次数', value: `${game.playCount || 0} 次` },
        { label: '最后游玩', value: formatLastPlayed(game.lastPlayed) },
        { label: '首次游玩', value: formatFirstPlayed(game.firstPlayed) },
        { label: '添加时间', value: formatDateUtil(game.added) }
      ],
      getActions: (game: any) => {
        // 注意：isGameRunning 函数会在组件实例化后设置，这里先使用 store
        const isRunning = gameRunningStore.isGameRunning(game.id)
        const actions = [
          { key: 'launch', icon: '▶️', label: isRunning ? '游戏运行中' : '启动游戏', class: 'btn-launch' },
          { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
          { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
          { key: 'remove', icon: '🗑️', label: '删除游戏', class: 'btn-remove' }
        ]
        
        // 如果游戏正在运行，添加终止按钮
        if (isRunning) {
          actions.splice(1, 0, { key: 'terminate', icon: '⏹️', label: '结束游戏', class: 'btn-terminate' })
        }
        
        return actions
      }
    })

    // 拖拽相关函数（需要在组件实例化后设置）
    let showPathUpdateDialogFn: (info: { existingGame: any; newPath: string; newFileName: string }) => void = () => {}
    let addGameFn: (game: any) => Promise<void> = async () => {}

    // 使用拖拽 composable（延迟初始化，因为需要访问组件方法）
    const dragDropComposable = ref<ReturnType<typeof useGameDragAndDrop> | null>(null)

    // 使用压缩/解压 composable（通用功能）
    // 注意：密码对话框的状态在组件中管理，通过回调函数传递给 composable
    const archiveComposable = useArchive({
      isElectronEnvironment,
      onShowPasswordDialog: (config) => {
        // 这个回调会在 methods 中设置，用于显示密码对话框
        // 暂时留空，在 mounted 中会设置
      }
    })

    return {
      // 工具函数
      formatDateUtil,
      // 数据
      games,
      isElectronEnvironment,
      searchQuery,
      sortBy,
      // 筛选相关
      ...toRefs(filterComposable),
      ...filterComposable,
      // 管理相关
      ...toRefs(managementComposable),
      ...managementComposable,
      // 截图相关
      ...toRefs(screenshotComposable),
      ...screenshotComposable,
      // 运行状态相关
      ...runningComposable,
      // 游戏时长相关
      ...playTimeComposable,
      // 暴露 gameRunningStore 供组件使用
      gameRunningStore,
      // 资源页面（使用工厂函数创建，包含分页、CRUD、右键菜单、配置等）
      ...resourcePage,
      // 压缩/解压相关
      ...archiveComposable,
      // 拖拽相关（延迟初始化）
      dragDropComposable,
      // 内部函数设置器（供 mounted 使用）
      _setDragDropFunctions: (functions: {
        showPathUpdateDialog: (info: { existingGame: any; newPath: string; newFileName: string }) => void
        addGame: (game: any) => Promise<void>
      }) => {
        showPathUpdateDialogFn = functions.showPathUpdateDialog
        addGameFn = functions.addGame
        
        // 初始化拖拽 composable（传入响应式的 games）
        dragDropComposable.value = useGameDragAndDrop({
          games: games, // 传入 ref，composable 内部会处理
          onAddGame: addGameFn,
          onShowPathUpdateDialog: (info: any) => {
            // 适配器：将 game 类型的 PathUpdateInfo 转换为通用类型
            resourcePage.showPathUpdateDialogHandler({
              existingItem: info.existingGame || info.existingItem,
              newPath: info.newPath,
              newFileName: info.newFileName || info.newPath?.split(/[/\\]/).pop() || ''
            })
          },
          isElectronEnvironment: isElectronEnvironment.value
        })
      },
      _setParentFunctions: (functions: {
        getRunningGames: () => Map<string, any>
        addRunningGame: (gameInfo: any) => void
        removeRunningGame: (gameId: string) => void
        isGameRunning: (gameId: string) => boolean
      }) => {
        const store = gameRunningStore
        getRunningGamesFn = () => store.getRunningGamesMap()
        addRunningGameFn = (gameInfo: any) => store.addRunningGame(gameInfo)
        removeRunningGameFn = (gameId: string) => store.removeRunningGame(gameId)
        isGameRunningFn = (gameId: string) => store.isGameRunning(gameId)
      },
      // 暴露资源页面引用，供 methods 中更新 contextMenuHandlers
      _resourcePage: resourcePage,
      // 暴露压缩/解压 composable 引用，供 mounted 中设置密码对话框回调
      _archiveComposable: archiveComposable
    }
  },
  data() {
    return {
      // 对话框状态已移至工厂函数（showAddDialog, showEditDialog, showDetailDialog, selectedItem, editForm）
      // 事件处理器（用于清理）
      handleGamePlaytimeUpdate: null as ((event: CustomEvent) => void) | null,
      handleGamePlaytimeSave: null as ((event: CustomEvent) => void) | null,
      handleRequestUpdatePlaytime: null as ((event: CustomEvent) => void) | null,
      handleRequestFinalPlaytime: null as ((event: CustomEvent) => void) | null,
      // 存储游戏启动时的初始 playTime（Map<gameId, initialPlayTime>）
      gameInitialPlayTimes: null as Map<string, number> | null,
      // 密码输入对话框
      showPasswordDialog: false,
      passwordDialogTitle: '输入密码',
      passwordDialogMessage: '该压缩包需要密码，请输入密码：',
      passwordDialogCallback: null, // 存储密码确认后的回调函数
      passwordDialogGame: null, // 存储需要解压的游戏
      passwordDialogOutputDir: null, // 存储输出目录
      passwordDialogTriedPasswords: [], // 存储已尝试的密码
      // 强制结束游戏确认对话框
      showTerminateConfirmDialog: false,
      gameToTerminate: null
      // 路径更新对话框已移至工厂函数（showPathUpdateDialog, pathUpdateInfo）
      // 空状态配置已移至工厂函数（emptyStateConfig）
      // 工具栏配置已移至工厂函数（toolbarConfig）
      // 右键菜单配置已移至工厂函数（contextMenuItems）
    }
  },
  computed: {
    // paginatedGames 现在通过工厂函数的 paginatedItems 访问
    paginatedGames() {
      return this.paginatedItems || []
    }
    // filteredGames 已移至 useGameFilter composable
    // paginationConfig 已移至工厂函数
    // contextMenuItems 已移至工厂函数
    // emptyStateConfig 已移至工厂函数
    // toolbarConfig 已移至工厂函数
  },
  methods: {
    // checkGameCollectionAchievements 和 checkGameTimeAchievements 已移至 useGameManagement composable
    // showAddGameDialog 和 closeAddGameDialog 已移至工厂函数（showAddDialogHandler, closeAddDialog）
    async handleAddGameConfirm(game) {
      await this.handleAddConfirm(game)
    },
    async launchGame(game) {
      try {
        // 检查是否为压缩包，压缩包不能运行
        const isArchive = game.isArchive || (game.executablePath && isArchiveFile(game.executablePath))
        if (isArchive) {
          notify.toast('warning', '无法运行', `压缩包文件无法直接运行。请先解压后再运行游戏。`)
          return
        }

        // 检查游戏是否正在运行
        if (this.isGameRunning(game)) {
          // 如果游戏正在运行，显示确认对话框
          this.showTerminateConfirmDialog = true
          this.gameToTerminate = game
          return
        }

        console.log('启动游戏:', game.name, game.executablePath)
        console.log('更新前 - lastPlayed:', game.lastPlayed)
        console.log('更新前 - playCount:', game.playCount)

        // 更新游戏统计（启动时也更新 lastPlayed，记录开始游玩的时间）
        const updates: any = {
          lastPlayed: new Date().toISOString(),
          playCount: (game.playCount || 0) + 1
        }

        // 如果是第一次启动，记录第一次游玩时间
        if (!game.firstPlayed) {
          updates.firstPlayed = new Date().toISOString()
          console.log(`游戏 ${game.name} 第一次启动，记录时间:`, updates.firstPlayed)
        }

        await this.updateGame(game.id, updates)
        console.log('更新后 - lastPlayed:', updates.lastPlayed)
        console.log('更新后 - playCount:', updates.playCount)
        console.log('游戏数据已保存')

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.launchGame) {
          console.log('使用 Electron API 启动游戏')
          const result = await window.electronAPI.launchGame(game.executablePath, game.name)

          if (result.success) {
            console.log('------------------------------')
            console.log('游戏启动成功，进程ID:', result.pid)
            console.log('游戏窗口标题列表:', result.windowTitles)
            console.log('------------------------------')

            // 将游戏添加到全局运行列表中（包含完整信息）
            this.addRunningGame({
              id: game.id,
              pid: result.pid,
              windowTitles: result.windowTitles || [],
              gameName: game.name
            })
            
            // 保存游戏启动时的初始 playTime
            if (!this.gameInitialPlayTimes) {
              this.gameInitialPlayTimes = new Map()
            }
            this.gameInitialPlayTimes.set(game.id, game.playTime || 0)

            // 显示成功提示
            notify.toast('success', '游戏启动成功', `${game.name} 已启动`)
          } else {
            console.error('游戏启动失败:', result.error)
            notify.toast('error', '游戏启动失败', `启动游戏失败: ${result.error}`)
            return
          }
        } else {
          // 提供更详细的错误信息
          let errorMessage = `无法启动游戏: ${game.name}\n\n`
          if (!this.isElectronEnvironment) {
            errorMessage += `❌ 错误：未检测到 Electron 环境\n`
            errorMessage += `当前环境：${navigator.userAgent.includes('Electron') ? 'Electron 但 API 未加载' : '浏览器环境'}\n\n`
            errorMessage += `解决方案：\n`
            errorMessage += `1. 确保在打包后的应用中运行\n`
            errorMessage += `2. 检查 preload.js 是否正确加载\n`
            errorMessage += `3. 重新构建应用\n\n`
          } else {
            errorMessage += `❌ 错误：Electron API 不可用\n`
            errorMessage += `请检查应用是否正确打包\n\n`
          }
          errorMessage += `游戏路径: ${game.executablePath}`
          notify.toast('error', '游戏启动失败', errorMessage)
          return
        }

        // 关闭详情页面
        this.closeGameDetail()
      } catch (error) {
        console.error('启动游戏失败:', error)
        notify.toast('error', '游戏启动失败', `启动游戏失败: ${error.message}`)
      }
    },
    
    showGameDetail(game) {
      this.showDetail(game)
      // 关闭上下文菜单（如果存在）
      if (this.$refs.baseView) {
        (this.$refs.baseView as any).showContextMenu = false
      }
    },
    // closeGameDetail 已移至工厂函数（closeDetail）
    handleGameContextMenu(event, game) {
      (this.$refs.baseView as any).showContextMenuHandler(event, game)
    },
    handleDetailAction(actionKey, game) {
      switch (actionKey) {
        case 'launch':
          this.launchGame(game)
          break
        case 'terminate':
          // 显示确认对话框
          this.showTerminateConfirmDialog = true
          this.gameToTerminate = game
          break
        case 'folder':
          this.openGameFolder(game)
          break
        case 'edit':
          this.editGame(game)
          break
        case 'remove':
          this.deleteItem(game)
          break
      }
    },
    /**
     * 右键菜单点击事件处理
     * 注意：工厂函数已经提供了 handleContextMenuClick，但我们需要在 mounted 中更新 contextMenuHandlers
     * 以支持游戏特有的菜单项（screenshot-folder, update-folder-size, compress, extract 等）
     */
    async handleUpdateRating(rating, game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        await this.updateGame(game.id, { rating })
        // 更新当前游戏对象，以便详情面板立即显示新星级
        if (this.selectedItem && this.selectedItem.id === game.id) {
          this.selectedItem.rating = rating
        }
      } catch (error: any) {
        console.error('更新星级失败:', error)
        await alertService.error('更新星级失败: ' + error.message, '错误')
      }
    },
    async handleUpdateComment(comment, game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        await this.updateGame(game.id, { comment })
        // 更新当前游戏对象，以便详情面板立即显示新评论
        if (this.selectedItem && this.selectedItem.id === game.id) {
          this.selectedItem.comment = comment
        }
      } catch (error: any) {
        console.error('更新评论失败:', error)
        await alertService.error('更新评论失败: ' + error.message, '错误')
      }
    },
    async handleToggleFavorite(game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        const newFavoriteStatus = !game.isFavorite
        await this.updateGame(game.id, { isFavorite: newFavoriteStatus })
        // 更新当前游戏对象，以便详情面板立即显示新状态
        if (this.selectedItem && this.selectedItem.id === game.id) {
          this.selectedItem.isFavorite = newFavoriteStatus
        }
      } catch (error: any) {
        console.error('切换收藏状态失败:', error)
        await alertService.error('切换收藏状态失败: ' + error.message, '错误')
      }
    },
    editGame(game) {
      this.showEdit(game)
      // 关闭上下文菜单（如果存在）
      if (this.$refs.baseView) {
        (this.$refs.baseView as any).showContextMenu = false
      }
    },
    // closeEditGameDialog 已移至工厂函数（closeEdit）
    async handleEditGameConfirm(updatedGame) {
      // 使用工厂函数提供的 handleEditConfirm，但需要保留业务特定逻辑
      const updates = {
        name: updatedGame.name,
        developer: updatedGame.developer,
        publisher: updatedGame.publisher,
        engine: updatedGame.engine,
        description: updatedGame.description,
        tags: updatedGame.tags,
        executablePath: updatedGame.executablePath,
        image: updatedGame.image
      }
      await this.handleEditConfirm({ ...updatedGame, ...updates })
    },
    // handleRemoveGame 已移至工厂函数（deleteItem）
    // 格式化函数已在 setup 中通过工厂函数使用，这里不再需要暴露
    // loadGames 已移至 useGameManagement composable
    async loadGamesWithChecks() {
      // 调用 composable 的 loadGames（从 setup 返回，方法名是 loadGames）
      if (typeof (this as any).loadGames === 'function') {
        await (this as any).loadGames()
      }

      this.updateFilterData()

      // 检测文件存在性（仅在应用启动时检测一次）
      if ((this.$root as any).shouldCheckFileLoss && (this.$root as any).shouldCheckFileLoss()) {
        // 标记为已开始检测，避免其它页面重复发起检测
        ;(this.$root as any).markFileLossChecked()
        Promise.resolve()
          .then(() => this.checkFileExistence())
          .catch((e) => {
            console.warn('[GameView] 后台检测文件存在性失败:', e)
          })
          .finally(() => {
            // 检测完成后，刷新筛选器
            this.updateFilterData()
          })
      }

      // 为现有游戏计算文件夹大小（如果还没有的话）
      Promise.resolve()
        .then(() => this.updateExistingGamesFolderSize())
        .catch((e) => {
          console.warn('[GameView] 后台计算文件夹大小失败:', e)
        })

      // 分页信息会自动更新（usePagination composable 会监听 filteredGames 的变化）
      // 如果需要手动触发，可以使用 this.updatePagination()

      Promise.resolve()
        .then(() => this.checkGameCollectionAchievements())
        .catch((e) => {
          console.warn('[GameView] 后台成就检测失败(checkGameCollectionAchievements):', e)
        })

      Promise.resolve()
        .then(() => this.checkGameTimeAchievements())
        .catch((e) => {
          console.warn('[GameView] 后台成就检测失败(checkGameTimeAchievements):', e)
        })
    },
    // updateExistingGamesFolderSize 和 checkFileExistence 已移至 useGameManagement composable

    // 显示丢失文件提醒
    showMissingFilesAlert(missingFiles) {
      // 构建文件列表文本
      const fileList = missingFiles.map(file =>
        `• ${file.name}${file.path !== '未设置路径' && file.path !== '路径检测失败' ? ` (${file.path})` : ''}`
      ).join('\n')

      // 显示 toast 通知，包含详细信息
      notify.toast(
        'warning',
        '游戏文件丢失提醒',
        `发现 ${missingFiles.length} 个游戏文件丢失：\n${fileList}\n\n请检查文件路径或重新添加这些游戏。`
      )

      // 在控制台输出详细信息
      console.warn('📋 丢失的游戏文件列表:')
      missingFiles.forEach((file, index) => {
        console.warn(`${index + 1}. ${file.name}`)
        if (file.path !== '未设置路径' && file.path !== '路径检测失败') {
          console.warn(`   路径: ${file.path}`)
        }
      })
    },

    async updateGameFolderSize(game) {
      try {
        await this.updateGameFolderSize(game.id)
      } catch (error: any) {
        console.error(`❌ 更新游戏 ${game.name} 文件夹大小失败:`, error)
      }
    },
    // extractAllTags 已移至 useGameFilter composable
    // filterByTag, excludeByTag, clearTagFilter, filterByDeveloper, excludeByDeveloper, clearDeveloperFilter 已移至 useGameFilter composable
    // 这些方法现在直接从 composable 中获取，只需要在调用后更新筛选器数据
    handleFilterByTag(tagName: string) {
      this.filterByTag(tagName)
      this.updateFilterData()
    },
    handleExcludeByTag(tagName: string) {
      this.excludeByTag(tagName)
      this.updateFilterData()
    },
    handleClearTagFilter() {
      this.clearTagFilter()
      this.updateFilterData()
    },
    handleFilterByDeveloper(developerName: string) {
      this.filterByDeveloper(developerName)
      this.updateFilterData()
    },
    handleExcludeByDeveloper(developerName: string) {
      this.excludeByDeveloper(developerName)
      this.updateFilterData()
    },
    handleClearDeveloperFilter() {
      this.clearDeveloperFilter()
      this.updateFilterData()
    },
    handleFilterByPublisher(publisherName: string) {
      this.filterByPublisher(publisherName)
      this.updateFilterData()
    },
    handleExcludeByPublisher(publisherName: string) {
      this.excludeByPublisher(publisherName)
      this.updateFilterData()
    },
    handleClearPublisherFilter() {
      this.clearPublisherFilter()
      this.updateFilterData()
    },
    handleFilterByEngine(engineName: string) {
      this.filterByEngine(engineName)
      this.updateFilterData()
    },
    handleExcludeByEngine(engineName: string) {
      this.excludeByEngine(engineName)
      this.updateFilterData()
    },
    handleClearEngineFilter() {
      this.clearEngineFilter()
      this.updateFilterData()
    },
    handleFilterByOther(otherName: string) {
      this.filterByOther(otherName)
      this.updateFilterData()
    },
    handleExcludeByOther(otherName: string) {
      this.excludeByOther(otherName)
      this.updateFilterData()
    },
    handleClearOtherFilter() {
      this.clearOtherFilter()
      this.updateFilterData()
    },
    // 处理来自 App.vue 的筛选器事件
    handleFilterEvent(event, data) {
      console.log('GameView handleFilterEvent:', event, data)
      switch (event) {
        case 'filter-select':
          if (data.filterKey === 'tags') {
            this.handleFilterByTag(data.itemName)
          } else if (data.filterKey === 'developers') {
            this.handleFilterByDeveloper(data.itemName)
          } else if (data.filterKey === 'publishers') {
            this.handleFilterByPublisher(data.itemName)
          } else if (data.filterKey === 'engines') {
            this.handleFilterByEngine(data.itemName)
          } else if (data.filterKey === 'others') {
            this.handleFilterByOther(data.itemName)
          }
          break
        case 'filter-exclude':
          if (data.filterKey === 'tags') {
            this.handleExcludeByTag(data.itemName)
          } else if (data.filterKey === 'developers') {
            this.handleExcludeByDeveloper(data.itemName)
          } else if (data.filterKey === 'publishers') {
            this.handleExcludeByPublisher(data.itemName)
          } else if (data.filterKey === 'engines') {
            this.handleExcludeByEngine(data.itemName)
          } else if (data.filterKey === 'others') {
            this.handleExcludeByOther(data.itemName)
          }
          break
        case 'filter-clear':
          if (data === 'tags') {
            this.handleClearTagFilter()
          } else if (data === 'developers') {
            this.handleClearDeveloperFilter()
          } else if (data === 'publishers') {
            this.handleClearPublisherFilter()
          } else if (data === 'engines') {
            this.handleClearEngineFilter()
          } else if (data === 'others') {
            this.handleClearOtherFilter()
          }
          break
      }
    },
    // 更新筛选器数据到 App.vue
    updateFilterData() {
      const filterData = this.getFilterData()
      this.$emit('filter-data-updated', filterData)
    },
    // updateGamePlayTime 已移至 useGamePlayTime composable
    async updateGamePlayTime(data) {
      // 调用 composable 的方法（注意：方法名相同，但 this.updateGamePlayTime 指向 composable 的方法）
      await (this as any).updateGamePlayTime(data)
    },
    // isGameRunning 已移至 useGameRunning composable
    isGameRunning(game) {
      // 调用 composable 的方法
      return (this as any).isGameRunning(game)
    },
    async terminateGame(game) {
      try {
        console.log('[DEBUG] 🛑 开始强制结束游戏:', game.name, game.executablePath)
        
        if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.terminateGame) {
          notify.toast('error', '操作失败', '当前环境不支持强制结束游戏功能')
          return
        }

        const result = await window.electronAPI.terminateGame(game.executablePath)
        
        if (result.success) {
          console.log('[DEBUG] ✅ 游戏已强制结束，PID:', result.pid, '运行时长:', result.playTime, '秒')
          notify.toast('success', '游戏已结束', `${game.name} 已强制结束`)
        } else {
          console.warn('[DEBUG] ⚠️ 强制结束游戏失败:', result.error)
          
          // 检查错误信息是否包含"未找到运行中的游戏进程"
          const isProcessNotFound = result.error && (
            result.error.includes('未找到') || 
            result.error.includes('运行中的游戏进程') ||
            result.error.includes('not found') ||
            result.error.includes('process not found')
          )
          
          if (isProcessNotFound) {
            // 如果未找到进程，显示警告并从运行列表中移除
            console.warn('[DEBUG] ⚠️ 游戏进程未找到，从运行列表中移除:', game.id)
            notify.toast('warning', '游戏已停止', `未找到 ${game.name} 的运行进程，已将其标记为已停止`)
            
            // 检查游戏是否在运行列表中，如果在则移除
            if (this.isGameRunning(game)) {
              this.removeRunningGame(game.id)
              console.log('[DEBUG] ✅ 已从运行列表中移除游戏:', game.id)
            }
          } else {
            // 其他错误，显示错误提示
            notify.toast('error', '操作失败', `强制结束游戏失败: ${result.error}`)
          }
        }
      } catch (error) {
        console.error('[DEBUG] ❌ 强制结束游戏异常:', error)
        
        // 检查错误信息是否包含"未找到运行中的游戏进程"
        const errorMessage = error.message || String(error)
        const isProcessNotFound = errorMessage.includes('未找到') || 
          errorMessage.includes('运行中的游戏进程') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('process not found')
        
        if (isProcessNotFound) {
          // 如果未找到进程，显示警告并从运行列表中移除
          console.warn('[DEBUG] ⚠️ 游戏进程未找到，从运行列表中移除:', game.id)
          notify.toast('warning', '游戏已停止', `未找到 ${game.name} 的运行进程，已将其标记为已停止`)
          
          // 检查游戏是否在运行列表中，如果在则移除
          if (this.isGameRunning(game)) {
            this.removeRunningGame(game.id)
            console.log('[DEBUG] ✅ 已从运行列表中移除游戏:', game.id)
          }
        } else {
          notify.toast('error', '操作失败', `强制结束游戏失败: ${errorMessage}`)
        }
      }
    },
    closeTerminateConfirmDialog() {
      this.showTerminateConfirmDialog = false
      this.gameToTerminate = null
    },
    async confirmTerminateGame() {
      if (this.gameToTerminate) {
        await this.terminateGame(this.gameToTerminate)
        this.closeTerminateConfirmDialog()
      }
    },
    // 密码输入对话框处理方法
    handlePasswordConfirm(password) {
      this.showPasswordDialog = false
      if (this.passwordDialogCallback) {
        this.passwordDialogCallback(password)
      }
      // 清理状态
      this.passwordDialogCallback = null
      this.passwordDialogGame = null
      this.passwordDialogOutputDir = null
      this.passwordDialogTriedPasswords = []
    },
    handlePasswordCancel() {
      this.showPasswordDialog = false
      if (this.passwordDialogCallback) {
        // 传递 null 表示取消
        this.passwordDialogCallback(null)
      }
      // 清理状态
      this.passwordDialogCallback = null
      this.passwordDialogGame = null
      this.passwordDialogOutputDir = null
      this.passwordDialogTriedPasswords = []
    },



    // playScreenshotSound 和 takeScreenshot 已移至 useGameScreenshot composable
    playScreenshotSound() {
      this.playScreenshotSound()
    },
    async takeScreenshot() {
      await this.takeScreenshot()
    },
    // 应用内快捷键功能已禁用，只使用全局快捷键
    // handleKeyDown(event) {
    //   // 获取用户设置的截图快捷键
    //   const settings = JSON.parse(localStorage.getItem('butter-manager-settings') || '{}')
    //   const screenshotKey = settings.screenshotKey || 'F12'
    //   
    //   // 检查是否匹配用户设置的快捷键
    //   if (this.isKeyMatch(event, screenshotKey)) {
    //     event.preventDefault()
    //     this.takeScreenshot()
    //   }
    // },
    // isKeyMatch(event, keySetting) {
    //   // 只支持F12键
    //   if (keySetting === 'F12') {
    //     return event.key === 'F12' && !event.ctrlKey && !event.altKey && !event.shiftKey
    //   }
    //   
    //   return false
    // },
    // initializeGlobalShortcut 已移至 useGameScreenshot composable
    async initializeGlobalShortcut() {
      await this.initializeGlobalShortcut()
    },

    // SaveManager 相关方法
    async exportGames() {
      try {
        const success = await saveManager.exportData('games')
        if (success) {
          notify.native('导出成功', '游戏数据已导出到文件')
        } else {
          notify.native('导出失败', '游戏数据导出失败')
        }
      } catch (error) {
        console.error('导出游戏数据失败:', error)
        notify.native('导出失败', `导出失败: ${error.message}`)
      }
    },

    async getStorageInfo() {
      const info = await saveManager.getStorageInfo()
      if (info) {
        const sizeKB = Math.round(info.total.size / 1024)
        const sizeMB = Math.round(sizeKB / 1024 * 100) / 100
        return {
          totalSize: sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`,
          gameCount: info.games.count,
          settingsCount: info.settings.count,
          backupCount: info.backup.count
        }
      }
      return null
    },

    async parseGameSaveFile(file) {
      try {
        const content = await file.text()
        const result = saveManager.parseGameSaveFile(content)
        if (result.success) {
          console.log('游戏存档解析成功:', result.slots)
          return result
        } else {
          console.error('游戏存档解析失败:', result.error)
          return null
        }
      } catch (error) {
        console.error('读取游戏存档文件失败:', error)
        return null
      }
    },

    async openGameFolder(game) {
      try {
        if (!game.executablePath) {
          await alertService.warning('游戏文件路径不存在', '提示')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.openFileFolder) {
          const result = await window.electronAPI.openFileFolder(game.executablePath)
          if (result.success) {
            console.log('已打开游戏文件夹:', result.folderPath)

          } else {
            console.error('打开文件夹失败:', result.error)
            await alertService.error(`打开文件夹失败: ${result.error}`, '错误')
          }
        } else {
          // 降级处理：在浏览器中显示路径
          await alertService.info(`游戏文件位置:\n${game.executablePath}`, '文件位置')
        }
      } catch (error) {
        console.error('打开游戏文件夹失败:', error)
        await alertService.error(`打开文件夹失败: ${error.message}`, '错误')
      }
    },
    // openGameScreenshotFolder 已移至 useGameScreenshot composable
    async openGameScreenshotFolder(game) {
      await this.openGameScreenshotFolder(game)
    },
    // 压缩/解压相关方法已移至 useArchive composable（通用功能）
    // compressFile, compressFileToCurrentDir, extractArchive, extractArchiveToCurrentDir, performCompression, performExtraction
    // 拖拽处理方法
    // 拖拽相关方法已移至 useGameDragAndDrop composable
    handleDragOver(event) {
      if (this.dragDropComposable?.handleDragOver) {
        this.dragDropComposable.handleDragOver(event)
      }
    },

    handleDragEnter(event) {
      if (this.dragDropComposable?.handleDragEnter) {
        this.dragDropComposable.handleDragEnter(event)
      }
    },

    handleDragLeave(event) {
      if (this.dragDropComposable?.handleDragLeave) {
        this.dragDropComposable.handleDragLeave(event)
      }
    },

    async handleDrop(event) {
      if (this.dragDropComposable?.handleDrop) {
        await this.dragDropComposable.handleDrop(event)
      }
    },

    // 旧的 handleDrop 方法已移除，现在使用 useGameDragAndDrop composable

    // 检查是否在 Electron 环境中
    checkElectronEnvironment() {
      this.isElectronEnvironment = !!(window.electronAPI && typeof window.electronAPI === 'object')

      if (this.isElectronEnvironment) {
        console.log('✅ 检测到 Electron 环境')
      } else {
        console.log('❌ 未检测到 Electron 环境，可能是浏览器环境或 API 未正确加载')
        console.log('当前环境信息:')
        console.log('- userAgent:', navigator.userAgent)
        console.log('- location:', window.location.href)
        console.log('- process:', typeof process !== 'undefined' ? process.versions : 'undefined')
      }
    },

    // 路径更新相关方法
    closePathUpdateDialog() {
      this.showPathUpdateDialog = false
      this.pathUpdateInfo = {
        existingGame: null,
        newPath: '',
        newFileName: ''
      }
    },

    async confirmPathUpdate() {
      try {
        const { existingItem, newPath } = this.pathUpdateInfo

        if (!existingItem || !newPath) {
          console.error('路径更新信息不完整')
          return
        }

        console.log(`更新游戏 "${existingItem.name}" 的路径:`)
        console.log(`旧路径: ${existingItem.executablePath}`)
        console.log(`新路径: ${newPath}`)

        // 更新游戏路径
        existingItem.executablePath = newPath
        existingItem.fileExists = true

        // 重新计算文件夹大小
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.getFolderSize) {
          try {
            const result = await window.electronAPI.getFolderSize(newPath)
            if (result.success) {
              existingItem.folderSize = result.size
              console.log(`游戏 ${existingItem.name} 文件夹大小: ${result.size} 字节`)
            }
          } catch (error) {
            console.error('获取文件夹大小失败:', error)
          }
        }

        // 保存更新后的数据
        await this.saveGames()

        // 关闭对话框
        this.closePathUpdateDialog()

        // 显示成功通知
        notify.toast(
          'success',
          '路径更新成功',
          `游戏 "${existingItem.name}" 的路径已更新`
        )

        console.log(`游戏 "${existingItem.name}" 路径更新完成`)

      } catch (error) {
        console.error('更新游戏路径失败:', error)
        notify.toast('error', '更新失败', `更新游戏路径失败: ${error.message}`)
      }
    },
    // handleSortChanged, loadSortSetting 已移至工厂函数
    // handlePageChange 已移至工厂函数
    // handleEmptyStateAction 已移至工厂函数
    // handleSearchQueryChanged, handleSortByChanged 已移至工厂函数
  },
  watch: {
    // 监听搜索和排序变化，重置到第一页（已在工厂函数中处理，但这里保留以兼容旧代码）
    searchQuery() {
      if (this.resetToFirstPage) {
        this.resetToFirstPage()
      }
    },
    sortBy() {
      if (this.resetToFirstPage) {
        this.resetToFirstPage()
      }
    }
  },
  async mounted() {
    // 设置父组件函数引用（在 Options API 中通过 this.$root 访问）
    if ((this as any)._setParentFunctions && this.$root) {
      (this as any)._setParentFunctions({
        getRunningGames: () => (this.$root as any).runningGames || new Map(),
        addRunningGame: (gameInfo: any) => (this.$root as any).addRunningGame(gameInfo),
        removeRunningGame: (gameId: string) => (this.$root as any).removeRunningGame(gameId),
        isGameRunning: (gameId: string) => (this.$root as any).isGameRunning(gameId)
      })
    }

    // 更新工厂函数的 contextMenuHandlers，添加游戏特有的处理
    if ((this as any)._resourcePage) {
      const resourcePage = (this as any)._resourcePage
      // 更新右键菜单处理器
      resourcePage.contextMenuHandlers = {
        ...resourcePage.contextMenuHandlers,
        detail: (game: any) => this.showGameDetail(game),
        launch: (game: any) => this.launchGame(game),
        folder: (game: any) => this.openGameFolder(game),
        'screenshot-folder': (game: any) => this.openGameScreenshotFolder(game),
        'update-folder-size': (game: any) => this.updateGameFolderSize(game),
        'compress-to': (game: any) => {
          this.compressFile({ name: game.name, path: game.executablePath })
        },
        'compress-here': (game: any) => {
          this.compressFileToCurrentDir({ name: game.name, path: game.executablePath })
        },
        extract: (game: any) => {
          this.extractArchive({ name: game.name, path: game.executablePath, isArchive: game.isArchive })
        },
        'extract-here': (game: any) => {
          this.extractArchiveToCurrentDir({ name: game.name, path: game.executablePath, isArchive: game.isArchive })
        }
      }
    }

    // 设置压缩/解压 composable 的密码对话框回调
    if ((this as any)._archiveComposable) {
      const archiveComposable = (this as any)._archiveComposable
      // 设置密码对话框回调
      if (archiveComposable.setPasswordDialogCallback) {
        archiveComposable.setPasswordDialogCallback((config: any) => {
          this.passwordDialogTitle = config.title
          this.passwordDialogMessage = config.message
          this.passwordDialogCallback = async (password: string | null) => {
            await config.onConfirm(password)
          }
          this.showPasswordDialog = true
        })
      }
    }

    // 设置拖拽函数
    if ((this as any)._setDragDropFunctions) {
      (this as any)._setDragDropFunctions({
        showPathUpdateDialog: (info: any) => {
          this.showPathUpdateDialogHandler({
            existingItem: info.existingGame || info.existingItem,
            newPath: info.newPath,
            newFileName: info.newFileName || info.newPath?.split(/[/\\]/).pop() || ''
          })
        },
        addGame: async (game: any) => {
          await this.addGame(game)
        }
      })
    }

    this.checkElectronEnvironment()
    
    // 移除等待逻辑，因为 ResourceView 仅在 App.vue 初始化完成后才渲染
    console.log('✅ 存档系统已初始化，开始加载游戏数据')
    
    await this.loadGamesWithChecks()
    
    // 加载分页设置（使用工厂函数的方法）
    await this.loadPaginationSettings('games')
    
    // 加载排序设置（使用工厂函数的方法，但需要兼容旧格式）
    try {
      const savedSortBy = await saveManager.getSortSetting('games')
      if (savedSortBy) {
        // 兼容旧的排序值，转换为新格式
        let normalizedSortBy = savedSortBy
        if (!savedSortBy.includes('-')) {
          // 旧的排序值（如 'name'），默认转换为升序
          normalizedSortBy = `${savedSortBy}-asc`
        }
        
        if (normalizedSortBy !== this.sortBy) {
          this.sortBy = normalizedSortBy as GameSortBy
          console.log('✅ 已加载游戏页面排序方式:', normalizedSortBy)
        }
      }
    } catch (error) {
      console.warn('加载排序方式失败:', error)
    }

    // 游戏运行状态现在由 App.vue 全局管理，无需在此处处理

    // 监听游戏时长更新事件（接收总时长，直接设置）
    this.handleGamePlaytimeUpdate = (event: CustomEvent) => {
      const { gameId, totalPlayTime, shouldSave } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game) {
        // 直接设置总时长，不累加
        game.playTime = totalPlayTime
        console.log(`[GameView] 游戏 ${game.name} 时长已更新: ${game.playTime} 秒`)
        
        if (shouldSave) {
          // 游戏结束时保存
          this.saveGames()
          console.log(`[GameView] 游戏 ${game.name} 时长已保存`)
        }
      }
    }
    
    // 初始化游戏初始时长存储
    if (!this.gameInitialPlayTimes) {
      this.gameInitialPlayTimes = new Map()
    }
    
    // 监听请求更新游戏时长事件（App.vue 定时触发）
    this.handleRequestUpdatePlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game && this.gameRunningStore && this.gameInitialPlayTimes) {
        // 如果还没有保存初始值，先保存（第一次更新时）
        if (!this.gameInitialPlayTimes.has(gameId)) {
          this.gameInitialPlayTimes.set(gameId, game.playTime || 0)
        }
        
        // 获取初始 playTime（启动时的值）
        const initialPlayTime = this.gameInitialPlayTimes.get(gameId) || 0
        // 计算当前总时长 = 初始时长 + 会话时长
        const totalPlayTime = this.gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新游戏时长（用于显示）
        game.playTime = totalPlayTime
        console.log(`[GameView] 游戏 ${game.name} 时长已更新: ${totalPlayTime} 秒 (初始: ${initialPlayTime}, 会话: ${totalPlayTime - initialPlayTime})`)
      }
    }
    
    // 监听请求最终游戏时长事件（游戏结束时）
    this.handleRequestFinalPlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game && this.gameRunningStore && this.gameInitialPlayTimes) {
        // 获取初始 playTime（从保存的初始值获取，如果不存在则使用当前值）
        const initialPlayTime = this.gameInitialPlayTimes.get(gameId) || game.playTime || 0
        // 计算最终总时长
        const totalPlayTime = this.gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新并保存
        game.playTime = totalPlayTime
        // 清除保存的初始值
        this.gameInitialPlayTimes.delete(gameId)
        this.saveGames()
        console.log(`[GameView] 游戏 ${game.name} 最终时长已保存: ${totalPlayTime} 秒`)
      }
    }
    
    // 监听游戏时长保存事件
    this.handleGamePlaytimeSave = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game) {
        this.saveGames()
        console.log(`[GameView] 游戏 ${game.name} 时长已保存`)
      }
    }
    
    window.addEventListener('game-playtime-update', this.handleGamePlaytimeUpdate as EventListener)
    window.addEventListener('game-playtime-save', this.handleGamePlaytimeSave as EventListener)
    window.addEventListener('game-request-update-playtime', this.handleRequestUpdatePlaytime as EventListener)
    window.addEventListener('game-request-final-playtime', this.handleRequestFinalPlaytime as EventListener)

    // 加载游戏分页设置（使用 composable 的方法）
    if (this.loadPaginationSettings) {
      await this.loadPaginationSettings('game')
    }

    // 初始化拖拽 composable
    if (this._setDragDropFunctions) {
      this._setDragDropFunctions({
        showPathUpdateDialog: (info) => {
          this.pathUpdateInfo = {
            existingGame: info.existingGame,
            newPath: info.newPath,
            newFileName: info.newFileName
          }
          this.showPathUpdateDialog = true
        },
        addGame: this.addGame
      })
    }

    // 加载排序设置
    await this.loadSortSetting()

    // 初始化筛选器数据
    this.updateFilterData()


    // 监听游戏进程结束事件
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onGameProcessEnded) {
      console.log('[DEBUG] 🎧 注册 game-process-ended 事件监听器')
      window.electronAPI.onGameProcessEnded((event, data) => {
        console.log('[DEBUG] 📥 收到 game-process-ended 事件，数据:', data)
        this.updateGamePlayTime(data)
      })
    } else {
      console.log('[DEBUG] ⚠️ 无法注册 game-process-ended 事件监听器')
    }

    // 监听全局截图触发事件（只使用全局快捷键）
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onGlobalScreenshotTrigger) {
      window.electronAPI.onGlobalScreenshotTrigger(() => {
        console.log('全局快捷键触发截图')
        this.takeScreenshot()
      })
    } else {
      // 应用内快捷键功能已禁用
      console.log('全局快捷键不可用，应用内快捷键已禁用')
    }

    // 监听 Flash 播放器错误事件
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onFlashPlayerError) {
      window.electronAPI.onFlashPlayerError((event, data) => {
        console.error('Flash 播放器错误:', data)
        if (data.type === 'no-path') {
          // 未指定路径，使用 alertService
          alertService.error(data.message, 'Flash 播放器错误')
        } else {
          // 其他错误，使用 toast
          notify.toast('error', 'Flash 播放器错误', data.message)
        }
      })
    }

    // 初始化全局快捷键
    this.initializeGlobalShortcut()
  },
  beforeUnmount() {
    // 清理游戏时长更新事件监听
    if (this.handleGamePlaytimeUpdate) {
      window.removeEventListener('game-playtime-update', this.handleGamePlaytimeUpdate as EventListener)
    }
    if (this.handleGamePlaytimeSave) {
      window.removeEventListener('game-playtime-save', this.handleGamePlaytimeSave as EventListener)
    }
    if (this.handleRequestInitialPlaytime) {
      window.removeEventListener('game-request-initial-playtime', this.handleRequestInitialPlaytime as EventListener)
    }
    
    // 应用内快捷键功能已禁用，无需清理
    // document.removeEventListener('keydown', this.handleKeyDown)

    // 清理全局截图事件监听器
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeGlobalScreenshotListener) {
      // 移除全局截图事件监听器
      window.electronAPI.removeGlobalScreenshotListener()
      console.log('清理全局截图事件监听器')
    } else if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeAllListeners) {
      // 降级方案：移除所有监听器
      window.electronAPI.removeAllListeners('global-screenshot-trigger')
      console.log('清理所有全局截图事件监听器')
    }

    // 清理 Flash 播放器错误事件监听器
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeFlashPlayerErrorListener) {
      window.electronAPI.removeFlashPlayerErrorListener()
      console.log('清理 Flash 播放器错误事件监听器')
    } else if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeAllListeners) {
      window.electronAPI.removeAllListeners('flash-player-error')
      console.log('清理 Flash 播放器错误事件监听器（降级方案）')
    }
  }
}
</script>

<style lang="scss" scoped>
// 游戏主内容区域
.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--spacing-xl);
  height: 100%;
  overflow-y: auto;
  position: relative;
  transition: all var(--transition-base);
  box-sizing: border-box;

  // 拖拽样式
  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed var(--accent-color);
    border-radius: var(--radius-xl);

    &::before {
      content: '拖拽游戏文件到这里添加游戏 (.exe / .swf / .bat / .zip / .rar / .7z 等)';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--accent-color);
      color: white;
      padding: var(--spacing-xl) calc(var(--spacing-xl) * 2);
      border-radius: var(--radius-xl);
      font-size: 18px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    }
  }
}

// 游戏网格样式已移至 GameGrid.vue 组件

// 强制结束游戏确认对话框样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color var(--transition-base);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);

  h3 {
    color: var(--text-primary);
    margin: 0;
    transition: color var(--transition-base);
  }
}


.modal-body {
  padding: var(--spacing-xl);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-secondary);
  }
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  transition: background var(--transition-base);

  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: var(--spacing-xl);
  }

  .detail-body {
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .detail-image {
    width: 100%;
    height: 250px;
  }

  .detail-stats {
    grid-template-columns: 1fr;
  }

  .detail-actions {
    flex-direction: column;
  }
}
</style>
