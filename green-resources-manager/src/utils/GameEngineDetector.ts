/**
 * 游戏引擎检测工具
 * 用于根据游戏目录结构自动识别游戏引擎
 */

/**
 * 检测游戏引擎
 * @param gamePath - 游戏可执行文件路径
 * @returns Promise<string | null> - 检测到的引擎名称，如果无法识别则返回 null
 */
export async function detectGameEngine(gamePath: string): Promise<string | null> {
  try {
    // 检查 Electron API 是否可用
    if (!window.electronAPI || !window.electronAPI.listFiles) {
      console.warn('Electron API 不可用，无法检测游戏引擎')
      return null
    }

    // 获取游戏文件所在目录（使用字符串操作，避免 require('path')）
    const lastSeparator = Math.max(gamePath.lastIndexOf('\\'), gamePath.lastIndexOf('/'))
    const gameDir = lastSeparator >= 0 ? gamePath.substring(0, lastSeparator) : gamePath
    const fileNameWithExt = lastSeparator >= 0 ? gamePath.substring(lastSeparator + 1) : gamePath
    const lastDot = fileNameWithExt.lastIndexOf('.')
    const gameFileName = lastDot >= 0 ? fileNameWithExt.substring(0, lastDot) : fileNameWithExt
    
    // 检查是否为 Flash 游戏
    if (gamePath.toLowerCase().endsWith('.swf')) {
      return 'Flash/ActionScript'
    }

    // 列出目录中的文件和文件夹
    const listResult = await window.electronAPI.listFiles(gameDir)
    if (!listResult.success || !listResult.files) {
      return null
    }

    // listFiles 可能返回字符串数组或对象数组
    const files = Array.isArray(listResult.files) 
      ? listResult.files.map((f: any) => typeof f === 'string' ? f : (f?.name || String(f)))
      : []
    const fileNames = files.map(f => f.toLowerCase())
    const pathSeparator = gameDir.includes('\\') ? '\\' : '/'
    const filePaths = files.map(f => `${gameDir}${pathSeparator}${f}`.toLowerCase())

    // 检查 Unity 引擎特征
    // Unity 通常有 UnityPlayer.dll 和 [GameName]_Data 文件夹
    const hasUnityPlayer = fileNames.some(f => f.includes('unityplayer.dll'))
    const hasUnityData = fileNames.some(f => f.includes('_data') && f.includes(gameFileName.toLowerCase()))
    if (hasUnityPlayer || hasUnityData) {
      return 'Unity'
    }

    // 检查 Unreal Engine 特征
    // Unreal Engine 通常有 Engine 文件夹或 .uproject 文件
    const hasEngineFolder = fileNames.some(f => f === 'engine' || f.includes('engine'))
    const hasUproject = fileNames.some(f => f.endsWith('.uproject'))
    if (hasEngineFolder || hasUproject) {
      return 'Unreal Engine'
    }

    // 检查 Godot 特征
    // Godot 通常有 .pck 文件或 godot 可执行文件
    const hasGodotPck = fileNames.some(f => f.endsWith('.pck'))
    const hasGodotExe = fileNames.some(f => f.includes('godot'))
    if (hasGodotPck || hasGodotExe) {
      return 'Godot'
    }

    // 检查 RPG Maker 特征（需要区分不同版本）
    // 首先检查项目文件（最准确的方法）
    const hasRpgProject = fileNames.some(f => f.endsWith('.rpgproject')) // MV
    const hasRmmzProject = fileNames.some(f => f.endsWith('.rmmzproject')) // MZ
    const hasRvproj2 = fileNames.some(f => f.endsWith('.rvproj2')) // VX Ace
    
    // 检查文件夹和文件结构
    const hasWwwFolder = fileNames.some(f => f === 'www' || f === 'www/')
    const hasPackageJson = filePaths.some(f => f.endsWith('package.json')) || fileNames.some(f => f === 'package.json')
    const hasIndexHtml = filePaths.some(f => f.endsWith('index.html')) || fileNames.some(f => f === 'index.html')
    const hasGameIni = fileNames.some(f => f === 'game.ini')
    const hasGraphicsFolder = fileNames.some(f => f === 'graphics' || f === 'graphics/') // VX Ace 使用 Graphics（大写）
    
    // 如果找到项目文件，直接返回
    if (hasRvproj2) {
      return 'RPG Maker VX Ace'
    }
    if (hasRmmzProject) {
      return 'RPG Maker MZ'
    }
    if (hasRpgProject) {
      return 'RPG Maker MV'
    }
    
    // 如果没有项目文件，通过文件夹结构判断
    // VX Ace 特征：Game.ini + Graphics 文件夹 + 没有 www 文件夹
    if (hasGameIni && hasGraphicsFolder && !hasWwwFolder) {
      return 'RPG Maker VX Ace'
    }
    
    // MV/MZ 特征：www 文件夹 + package.json + index.html
    if (hasWwwFolder && hasPackageJson && hasIndexHtml) {
      // 需要检查 js 文件夹中的核心文件来区分 MV 和 MZ
      try {
        const wwwJsPath = `${gameDir}${pathSeparator}www${pathSeparator}js`
        const jsResult = await window.electronAPI.listFiles(wwwJsPath)
        if (jsResult.success && Array.isArray(jsResult.files)) {
          const jsFiles = jsResult.files.map((f: any) => typeof f === 'string' ? f : (f?.name || String(f))).map((f: string) => f.toLowerCase())
          const hasRmmzCore = jsFiles.some(f => f.includes('rmmz_core.js'))
          const hasRpgCore = jsFiles.some(f => f.includes('rpg_core.js'))
          if (hasRmmzCore) {
            return 'RPG Maker MZ'
          }
          if (hasRpgCore) {
            return 'RPG Maker MV'
          }
        }
      } catch (error) {
        console.warn('检查 www/js 文件夹失败:', error)
      }
      // 如果无法检查 js 文件，默认返回 MV（较常见）
      return 'RPG Maker MV'
    }

    // 检查 GameMaker Studio 特征
    // GameMaker 通常有 data.win, options.ini 等文件
    const hasDataWin = fileNames.some(f => f === 'data.win' || f === 'game.unx')
    const hasOptionsIni = fileNames.some(f => f === 'options.ini')
    if (hasDataWin || hasOptionsIni) {
      return 'GameMaker Studio'
    }

    // 检查 TyranoBuilder 特征
    // TyranoBuilder 通常有 *_tyrano_data.* 文件（如 game_tyrano_data.sav）
    const hasTyranoData = fileNames.some(f => f.includes('tyrano_data') || f.includes('tyranodata'))
    if (hasTyranoData) {
      return 'TyranoBuilder'
    }

    // 检查 Ren'Py 特征
    // Ren'Py 通常有 renpy 文件夹和 game 文件夹
    const hasRenpyFolder = fileNames.some(f => f === 'renpy' || f.includes('renpy'))
    const hasGameFolder = fileNames.some(f => f === 'game')
    if (hasRenpyFolder && hasGameFolder) {
      return "Ren'Py"
    }

    // 检查 Construct 特征
    // Construct 通常有 data.js, main.js 等文件
    const hasConstructFiles = fileNames.some(f => f.includes('construct') || (f === 'data.js' && fileNames.includes('main.js')))
    if (hasConstructFiles) {
      return 'Construct'
    }

    // 检查 Love2D 特征
    // Love2D 通常有 main.lua 文件
    const hasMainLua = fileNames.some(f => f === 'main.lua')
    if (hasMainLua) {
      return 'Love2D'
    }

    // 检查 Python/Pygame 特征
    // Python 游戏通常有 .py 文件或 pygame 相关文件
    const hasPythonFiles = fileNames.some(f => f.endsWith('.py'))
    if (hasPythonFiles && fileNames.some(f => f.includes('pygame'))) {
      return 'Python/Pygame'
    }

    // 检查 Java 特征
    // Java 游戏通常有 .jar 文件
    const hasJarFiles = fileNames.some(f => f.endsWith('.jar'))
    if (hasJarFiles) {
      return 'Java'
    }

    return null
  } catch (error) {
    console.error('检测游戏引擎时出错:', error)
    return null
  }
}

