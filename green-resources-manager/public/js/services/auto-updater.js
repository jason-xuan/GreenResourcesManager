/**
 * @module AutoUpdater
 * @description 管理应用程序的自动更新功能，包括更新检查、更新通知和更新安装。
 *
 * 主要功能:
 * 1. 初始化自动更新服务，配置更新服务器（GitHub）。
 * 2. 定期检查更新（启动后5秒检查一次，之后每小时检查一次）。
 * 3. 监听更新事件（检查中、有新版本、无新版本、错误）并通知渲染进程。
 * 4. 显示更新通知（通过系统托盘显示）。
 * 5. 提供手动检查更新和安装更新的功能。
 * 6. 注册与自动更新相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `initAutoUpdater(autoUpdater, getMainWindow, displayBalloon, dialog, isDev)`: 初始化自动更新服务。
 * - `registerIpcHandlers(ipcMain, autoUpdater, isDev)`: 注册 IPC 处理器。
 *
 * 内部函数:
 * - `showUpdateNotification(info, displayBalloon)`: 显示更新通知。
 * - `showUpdateReadyDialog(info, getMainWindow, dialog, autoUpdater)`: 显示更新就绪对话框。
 *
 * IPC 处理器:
 * - `check-for-updates`: 手动触发更新检查。
 * - `quit-and-install`: 立即重启并安装更新。
 *
 * 更新配置:
 * - 更新服务器：GitHub (klsdf/ButterResourcesManager)
 * - 自动下载：禁用（用户需手动下载）
 * - 自动安装：禁用（用户需手动安装）
 * - 检查间隔：应用启动后5秒检查一次，之后每小时检查一次
 */

/**
 * 显示更新通知。
 * @param {Object} info - 更新信息对象。
 * @param {Function} displayBalloon - 显示系统托盘通知的函数。
 */
function showUpdateNotification(info, displayBalloon) {
  displayBalloon({
    title: '发现新版本',
    content: `版本 ${info.version} 已发布，点击查看详情`
  })
}

/**
 * 显示更新就绪对话框。
 * @param {Object} info - 更新信息对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} dialog - Electron dialog 对象。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 */
function showUpdateReadyDialog(info, getMainWindow, dialog, autoUpdater) {
  const options = {
    type: 'info',
    title: '更新就绪',
    message: `新版本 ${info.version} 已下载完成`,
    detail: '应用将在重启后更新到最新版本。是否现在重启？',
    buttons: ['现在重启', '稍后重启'],
    defaultId: 0,
    cancelId: 1
  }

  const mainWindow = getMainWindow()
  dialog.showMessageBox(mainWindow, options).then((result) => {
    if (result.response === 0) {
      // 用户选择现在重启
      autoUpdater.quitAndInstall()
    }
  })
}

/**
 * 初始化自动更新服务。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Function} displayBalloon - 显示系统托盘通知的函数。
 * @param {Object} dialog - Electron dialog 对象。
 * @param {boolean} isDev - 是否为开发环境。
 */
function initAutoUpdater(autoUpdater, getMainWindow, displayBalloon, dialog, isDev) {
  // 配置自动更新选项 - 只检查更新，不自动下载
  autoUpdater.autoDownload = false // 禁用自动下载
  autoUpdater.autoInstallOnAppQuit = false // 禁用自动安装

  // 设置更新服务器
  try {
    // 使用正确的 GitHub 配置方式
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'klsdf',
      repo: 'ButterResourcesManager'
    })
    console.log('更新服务器已设置为 GitHub: klsdf/ButterResourcesManager')
  } catch (error) {
    console.warn('设置更新服务器失败，使用默认配置:', error.message)
  }

  // 应用启动时立即检查一次更新
  setTimeout(() => {
    console.log('应用启动后检查更新...')
    autoUpdater.checkForUpdatesAndNotify()
  }, 5000) // 延迟5秒，确保应用完全启动

  // 设置更新检查间隔（每小时检查一次）
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 60 * 60 * 1000) // 1小时 = 60 * 60 * 1000 毫秒

  // 监听更新检查事件
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking')
    }
  })

  // 监听发现新版本事件
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info)
    }

    // 显示更新通知
    showUpdateNotification(info, displayBalloon)
  })

  // 监听没有新版本事件
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本:', info.version)
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', info)
    }
  })

  // 监听更新错误事件
  autoUpdater.on('error', (err) => {
    console.error('自动更新错误:', err)
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      const errorInfo = {
        message: err.message,
        code: err.code || 'UNKNOWN',
        stack: err.stack
      }
      mainWindow.webContents.send('update-error', errorInfo)
    }
  })
}

/**
 * 注册与自动更新相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Object} autoUpdater - electron-updater 的 autoUpdater 对象。
 * @param {boolean} isDev - 是否为开发环境。
 */
function registerIpcHandlers(ipcMain, autoUpdater, isDev) {
  // 手动检查更新
  ipcMain.handle('check-for-updates', async () => {
    try {
      // 不返回 autoUpdater.checkForUpdates() 的结果，因为它包含无法序列化的对象
      // 而是通过事件监听器来处理更新检查结果
      autoUpdater.checkForUpdates()
      return { success: true, message: '更新检查已启动，请等待结果' }
    } catch (error) {
      console.error('检查更新失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 立即重启并安装更新
  ipcMain.handle('quit-and-install', async () => {
    try {
      if (!isDev) {
        autoUpdater.quitAndInstall()
        return { success: true }
      } else {
        return { success: false, error: '开发环境不支持自动更新' }
      }
    } catch (error) {
      console.error('安装更新失败:', error)
      return { success: false, error: error.message }
    }
  })
}

module.exports = {
  initAutoUpdater,
  registerIpcHandlers
}

