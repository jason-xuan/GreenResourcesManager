/**
 * @module Screenshot
 * @description 管理应用程序的截图功能，包括窗口截图、截图目录管理和窗口列表获取。
 *
 * 主要功能:
 * 1. 截取当前聚焦窗口的截图，支持多种格式（PNG、JPEG、WebP）和质量设置。
 * 2. 根据运行中的游戏信息自动匹配窗口标题，并按游戏名称组织截图文件夹。
 * 3. 过滤系统窗口和通知窗口，只截取应用程序窗口。
 * 4. 管理截图保存目录，支持自定义目录设置。
 * 5. 获取可用窗口列表和当前活跃窗口信息。
 * 6. 注册与截图相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `registerIpcHandlers(ipcMain, getMainWindow, app)`: 注册 IPC 处理器。
 *
 * 内部函数:
 * - `takeScreenshot(customDirectory, format, quality, runningGamesInfo, app)`: 执行截图操作。
 * - `getScreenshotsDirectory(app)`: 获取默认截图目录。
 * - `setScreenshotsDirectory(getMainWindow, dialog)`: 设置截图目录。
 * - `getAvailableWindows(desktopCapturer)`: 获取可用窗口列表。
 * - `getActiveWindow(desktopCapturer)`: 获取当前活跃窗口。
 *
 * IPC 处理器:
 * - `take-screenshot`: 执行截图操作。
 * - `get-screenshots-directory`: 获取截图保存目录。
 * - `set-screenshots-directory`: 设置截图保存目录。
 * - `get-available-windows`: 获取可用窗口列表。
 * - `get-active-window`: 获取当前活跃窗口。
 *
 * 截图功能特性:
 * - 自动识别游戏窗口（通过窗口标题匹配）。
 * - 按游戏名称或窗口名称组织截图文件夹。
 * - 支持 PNG（无损）、JPEG（有损）、WebP（有损）格式。
 * - 可配置的图片质量（仅适用于 JPEG 和 WebP）。
 * - 自动创建截图保存目录。
 * - 使用时间戳生成唯一的文件名。
 */

const { desktopCapturer, app, dialog } = require('electron')
const fs = require('fs')
const path = require('path')

/**
 * 过滤系统窗口和通知窗口，返回非系统窗口列表。
 * @param {Array} sources - 窗口源列表。
 * @returns {Array} 过滤后的非系统窗口列表。
 */
function filterSystemWindows(sources) {
  return sources.filter(source => {
    const name = source.name.toLowerCase()
    return !name.includes('desktop') &&
           !name.includes('taskbar') &&
           !name.includes('start menu') &&
           !name.includes('butter manager') &&
           !name.includes('electron') &&
           !name.includes('chrome') &&
           !name.includes('browser') &&
           !name.includes('system') &&
           !name.includes('windows') &&
           !name.includes('notification') &&
           !name.includes('通知') &&
           !name.includes('新通知') &&
           !name.includes('electron.app.electron')
  })
}

/**
 * 执行截图操作。
 * @param {string|null} customDirectory - 自定义截图目录。
 * @param {string} format - 图片格式（png、jpg、jpeg、webp）。
 * @param {number} quality - 图片质量（1-100，仅适用于 JPEG 和 WebP）。
 * @param {Object} runningGamesInfo - 运行中的游戏信息对象。
 * @param {Object} appInstance - Electron app 实例。
 * @returns {Promise<{success: boolean, filepath?: string, filename?: string, windowName?: string, gameFolder?: string, screenshotsDir?: string, matchedGame?: string, error?: string}>} 截图结果。
 */
async function takeScreenshot(customDirectory, format = 'png', quality = 90, runningGamesInfo = {}, appInstance) {
  try {
    console.log('开始截图，格式:', format, '质量:', quality, '运行中的游戏信息:', runningGamesInfo)

    // 获取所有可用的窗口源
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 }
    })

    if (sources.length === 0) {
      throw new Error('无法获取窗口源')
    }

    // 过滤掉系统窗口和通知窗口
    const nonSystemWindows = filterSystemWindows(sources)

    if (nonSystemWindows.length === 0) {
      throw new Error('未找到可截图的窗口')
    }

    // 首先获取当前聚焦的窗口（通常是第一个非系统窗口）
    const targetSource = nonSystemWindows[0]

    console.log('------------------------------')
    console.log('当前聚焦的窗口:', targetSource)
    console.log('------------------------------')

    const windowName = targetSource.name
    console.log('当前聚焦的窗口:', windowName)

    // 判断窗口是否是正在运行的游戏 - 通过窗口标题匹配
    let folderName = 'Screenshots'
    let matchedGameName = null

    // 在 runningGamesInfo 中查找匹配的窗口标题（支持多个窗口标题）
    if (windowName && Object.keys(runningGamesInfo).length > 0) {
      for (const [gameId, gameData] of Object.entries(runningGamesInfo)) {
        // 使用 windowTitles 数组进行匹配
        const titlesToCheck = gameData.windowTitles || []

        // 检查当前窗口标题是否在窗口标题列表中
        if (titlesToCheck.includes(windowName)) {
          matchedGameName = gameData.gameName
          folderName = (matchedGameName || windowName).replace(/[<>:"/\\|?*]/g, '_').trim()
          console.log('✅ 通过窗口标题匹配到运行中的游戏:', matchedGameName || gameId, '窗口标题:', windowName, '所有窗口:', titlesToCheck)
          break
        }
      }
    }

    // 如果没有匹配到游戏，使用窗口名称作为文件夹名
    if (!matchedGameName) {
      folderName = windowName.replace(/[<>:"/\\|?*]/g, '_').trim()
      console.log('⚠️ 未匹配到游戏，使用窗口名称:', windowName)
    }

    if (!folderName || folderName.trim() === '') {
      folderName = 'Screenshots'
    }

    console.log('最终选择截图窗口:', windowName, '保存文件夹:', folderName)
    const thumbnail = targetSource.thumbnail

    // 确定截图保存目录
    let baseScreenshotsDir
    if (customDirectory && customDirectory.trim()) {
      baseScreenshotsDir = customDirectory.trim()
    } else {
      baseScreenshotsDir = path.join(appInstance.getPath('documents'), 'Butter Manager', 'Screenshots')
    }

    const gameFolderName = folderName
    const screenshotsDir = path.join(baseScreenshotsDir, gameFolderName)

    // 创建截图保存目录
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true })
      console.log('创建游戏截图文件夹:', screenshotsDir)
    }

    // 生成文件名，使用匹配的游戏名称或窗口名称
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileNameBase = matchedGameName || windowName || 'Screenshot'
    const filename = `${fileNameBase.replace(/[<>:"/\\|?*]/g, '_')}_${timestamp}.${format}`
    const filepath = path.join(screenshotsDir, filename)

    // 根据格式保存截图
    let buffer
    switch (format.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        buffer = thumbnail.toJPEG(quality)
        break
      case 'webp':
        buffer = thumbnail.toWebP(quality)
        break
      case 'png':
      default:
        buffer = thumbnail.toPNG()
        break
    }

    fs.writeFileSync(filepath, buffer)

    console.log('截图已保存:', filepath, '窗口:', targetSource.name)

    return {
      success: true,
      filepath: filepath,
      filename: filename,
      windowName: windowName,
      gameFolder: gameFolderName,
      screenshotsDir: screenshotsDir,
      matchedGame: matchedGameName || null
    }
  } catch (error) {
    console.error('截图失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 获取默认截图保存目录。
 * @param {Object} appInstance - Electron app 实例。
 * @returns {string} 截图保存目录路径。
 */
function getScreenshotsDirectory(appInstance) {
  return path.join(appInstance.getPath('documents'), 'Butter Manager', 'Screenshots')
}

/**
 * 设置截图保存目录（通过对话框选择）。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} dialogInstance - Electron dialog 实例。
 * @returns {Promise<string|null>} 选择的目录路径或 null。
 */
async function setScreenshotsDirectory(getMainWindow, dialogInstance) {
  try {
    const mainWindow = getMainWindow()
    const result = await dialogInstance.showOpenDialog(mainWindow, {
      title: '选择截图保存目录',
      properties: ['openDirectory', 'createDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  } catch (error) {
    console.error('选择截图目录失败:', error)
    throw error
  }
}

/**
 * 获取可用窗口列表。
 * @returns {Promise<{success: boolean, windows?: Array, error?: string}>} 窗口列表结果。
 */
async function getAvailableWindows() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 200, height: 150 }
    })

    // 过滤掉系统窗口和通知窗口
    const windows = filterSystemWindows(sources)
      .map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }))

    return { success: true, windows }
  } catch (error) {
    console.error('获取窗口列表失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取当前激活的窗口信息。
 * @returns {Promise<{success: boolean, window?: Object, error?: string}>} 活跃窗口结果。
 */
async function getActiveWindow() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 200, height: 150 }
    })

    if (sources.length === 0) {
      return { success: false, error: '无法获取窗口信息' }
    }

    // 过滤掉系统窗口和通知窗口，选择第一个（通常是当前激活的）
    const activeWindows = filterSystemWindows(sources)

    if (activeWindows.length > 0) {
      return {
        success: true,
        window: {
          id: activeWindows[0].id,
          name: activeWindows[0].name,
          thumbnail: activeWindows[0].thumbnail.toDataURL()
        }
      }
    }

    return { success: false, error: '未找到活跃窗口' }
  } catch (error) {
    console.error('获取活跃窗口失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册与截图相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @param {Object} appInstance - Electron app 实例。
 */
function registerIpcHandlers(ipcMain, getMainWindow, appInstance) {
  // 执行截图
  ipcMain.handle('take-screenshot', async (event, customDirectory, format = 'png', quality = 90, runningGamesInfo = {}) => {
    return await takeScreenshot(customDirectory, format, quality, runningGamesInfo, appInstance)
  })

  // 获取截图保存目录
  ipcMain.handle('get-screenshots-directory', () => {
    return getScreenshotsDirectory(appInstance)
  })

  // 设置截图保存目录
  ipcMain.handle('set-screenshots-directory', async () => {
    return await setScreenshotsDirectory(getMainWindow, dialog)
  })

  // 获取可用窗口列表
  ipcMain.handle('get-available-windows', async () => {
    return await getAvailableWindows()
  })

  // 获取当前激活的窗口
  ipcMain.handle('get-active-window', async () => {
    return await getActiveWindow()
  })
}

module.exports = {
  registerIpcHandlers
}

