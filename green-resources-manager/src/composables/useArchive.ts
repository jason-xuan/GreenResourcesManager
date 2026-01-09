/**
 * 通用压缩/解压功能 Composable
 * 处理文件和文件夹的压缩和解压操作，包括密码处理
 */
import { type Ref } from 'vue'
import notify from '../utils/NotificationService'
import confirmService from '../utils/ConfirmService'

/**
 * 压缩包文件扩展名列表
 */
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz']

/**
 * 检查文件是否为压缩包
 * @param filePath - 文件路径或文件名
 * @returns 是否为压缩包
 */
export function isArchiveFile(filePath: string): boolean {
  const fileName = filePath.toLowerCase()
  return ARCHIVE_EXTENSIONS.some(ext => fileName.endsWith(ext))
}

/**
 * 文件项接口（通用）
 */
export interface ArchiveItem {
  name: string
  path: string
  isArchive?: boolean
}

export interface ArchiveOptions {
  isElectronEnvironment: Ref<boolean>
  onShowPasswordDialog?: (config: {
    title: string
    message: string
    onConfirm: (password: string | null) => Promise<void>
  }) => void
}

/**
 * 通用压缩/解压功能
 */
export function useArchive(options: ArchiveOptions) {
  const { isElectronEnvironment } = options
  
  // 密码对话框回调（可以在运行时设置）
  let passwordDialogCallback: ((config: {
    title: string
    message: string
    onConfirm: (password: string | null) => Promise<void>
  }) => void) | null = options.onShowPasswordDialog || null

  /**
   * 设置密码对话框回调
   */
  function setPasswordDialogCallback(callback: (config: {
    title: string
    message: string
    onConfirm: (password: string | null) => Promise<void>
  }) => void) {
    passwordDialogCallback = callback
  }

  /**
   * 显示密码对话框（内部方法）
   */
  function showPasswordDialog(config: {
    title: string
    message: string
    onConfirm: (password: string | null) => Promise<void>
  }) {
    if (passwordDialogCallback) {
      passwordDialogCallback(config)
    } else {
      console.warn('密码对话框回调未设置')
    }
  }

  /**
   * 获取要压缩的文件夹路径
   */
  async function getFolderToCompress(filePath: string): Promise<string> {
    let folderToCompress = filePath
    let isFile = false

    // 检查路径是文件还是文件夹
    if (window.electronAPI && window.electronAPI.getFileStats) {
      const statsResult = await window.electronAPI.getFileStats(filePath)
      if (statsResult.success) {
        isFile = statsResult.isFile === true
        if (statsResult.isFile) {
          // 如果是文件，获取其所在文件夹
          const lastBackslash = filePath.lastIndexOf('\\')
          const lastSlash = filePath.lastIndexOf('/')
          const lastSeparator = Math.max(lastBackslash, lastSlash)
          
          if (lastSeparator >= 0) {
            folderToCompress = filePath.substring(0, lastSeparator)
          }
        }
      }
    }

    // 如果 getFileStats 失败，通过文件扩展名判断（后备方案）
    if (!isFile) {
      const commonExtensions = ['.exe', '.swf', '.bat', '.cmd', '.com', '.scr', '.msi', '.zip', '.rar', '.7z']
      const lowerPath = filePath.toLowerCase()
      const hasExtension = commonExtensions.some(ext => lowerPath.endsWith(ext))
      
      if (hasExtension) {
        // 看起来是文件，获取其所在文件夹
        const lastBackslash = filePath.lastIndexOf('\\')
        const lastSlash = filePath.lastIndexOf('/')
        const lastSeparator = Math.max(lastBackslash, lastSlash)
        
        if (lastSeparator >= 0) {
          folderToCompress = filePath.substring(0, lastSeparator)
        }
      }
    }

    return folderToCompress
  }

  /**
   * 执行压缩操作
   */
  async function performCompression(item: ArchiveItem, sourcePath: string, archivePath: string): Promise<void> {
    try {
      // 显示压缩中提示
      notify.toast('info', '正在压缩', `正在压缩 ${item.name}...`)

      // 调用压缩 API（sourcePath 是要压缩的文件夹路径）
      if (window.electronAPI && window.electronAPI.compressFile) {
        const result = await window.electronAPI.compressFile(sourcePath, archivePath)

        if (result.success) {
          notify.toast('success', '压缩成功', `文件夹已压缩到: ${archivePath}`)
          console.log('✅ 压缩成功:', result.archivePath)
        } else {
          notify.toast('error', '压缩失败', result.error || '压缩过程中发生错误')
          console.error('❌ 压缩失败:', result.error)
        }
      } else {
        notify.toast('error', '压缩失败', '压缩功能不可用')
      }
    } catch (error: any) {
      console.error('执行压缩操作异常:', error)
      notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
    }
  }

  /**
   * 压缩文件（选择目录）
   */
  async function compressFile(item: ArchiveItem): Promise<void> {
    try {
      // 检查文件是否存在
      if (!item.path) {
        notify.toast('error', '压缩失败', '文件路径不存在')
        return
      }

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.checkFileExists) {
        const existsResult = await window.electronAPI.checkFileExists(item.path)
        if (!existsResult.success || !existsResult.exists) {
          notify.toast('error', '压缩失败', '文件不存在或无法访问')
          return
        }
      }

      // 让用户选择压缩包保存位置和名称
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.selectFolder) {
        notify.toast('error', '压缩失败', '当前环境不支持选择文件夹')
        return
      }

      // 获取要压缩的文件夹路径
      const folderToCompress = await getFolderToCompress(item.path)

      // 让用户选择保存位置
      const folderResult = await window.electronAPI.selectFolder()
      if (!folderResult.success || !folderResult.path) {
        // 用户取消了选择
        return
      }

      const outputDir = folderResult.path
      const pathSeparator = outputDir.includes('\\') ? '\\' : '/'
      const archivePath = outputDir + (outputDir.endsWith('\\') || outputDir.endsWith('/') ? '' : pathSeparator) + item.name + '.zip'

      // 确认压缩
      const confirmMessage = `确定要压缩 ${item.name} 的文件夹吗？\n\n压缩包保存位置: ${archivePath}`
      const confirmed = await confirmService.confirm(confirmMessage, '确认压缩')
      if (!confirmed) {
        return
      }

      // 执行压缩
      await performCompression(item, folderToCompress, archivePath)
    } catch (error: any) {
      console.error('压缩文件异常:', error)
      notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
    }
  }

  /**
   * 压缩到当前目录
   */
  async function compressFileToCurrentDir(item: ArchiveItem): Promise<void> {
    try {
      // 检查文件是否存在
      if (!item.path) {
        notify.toast('error', '压缩失败', '文件路径不存在')
        return
      }

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.checkFileExists) {
        const existsResult = await window.electronAPI.checkFileExists(item.path)
        if (!existsResult.success || !existsResult.exists) {
          notify.toast('error', '压缩失败', '文件不存在或无法访问')
          return
        }
      }

      // 获取要压缩的文件夹路径和压缩包保存目录
      let folderToCompress = await getFolderToCompress(item.path)
      let currentDir = item.path

      // 检查路径是文件还是文件夹
      let isFile = false
      if (window.electronAPI && window.electronAPI.getFileStats) {
        const statsResult = await window.electronAPI.getFileStats(item.path)
        if (statsResult.success) {
          isFile = statsResult.isFile === true
          if (statsResult.isFile) {
            // 如果是文件，获取其所在文件夹
            const filePath = item.path
            const lastBackslash = filePath.lastIndexOf('\\')
            const lastSlash = filePath.lastIndexOf('/')
            const lastSeparator = Math.max(lastBackslash, lastSlash)
            
            if (lastSeparator >= 0) {
              folderToCompress = filePath.substring(0, lastSeparator)
              currentDir = folderToCompress
            }
          }
        }
      }

      // 如果 getFileStats 失败，通过文件扩展名判断（后备方案）
      if (!isFile) {
        const filePath = item.path
        const commonExtensions = ['.exe', '.swf', '.bat', '.cmd', '.com', '.scr', '.msi', '.zip', '.rar', '.7z']
        const lowerPath = filePath.toLowerCase()
        const hasExtension = commonExtensions.some(ext => lowerPath.endsWith(ext))
        
        if (hasExtension) {
          // 看起来是文件，获取其所在文件夹
          const lastBackslash = filePath.lastIndexOf('\\')
          const lastSlash = filePath.lastIndexOf('/')
          const lastSeparator = Math.max(lastBackslash, lastSlash)
          
          if (lastSeparator >= 0) {
            folderToCompress = filePath.substring(0, lastSeparator)
            currentDir = folderToCompress
          }
        }
      }

      // 创建压缩包路径（在当前目录）
      const pathSeparator = currentDir.includes('\\') ? '\\' : '/'
      const archivePath = currentDir + (currentDir.endsWith('\\') || currentDir.endsWith('/') ? '' : pathSeparator) + item.name + '.zip'

      // 确认压缩
      const confirmMessage = `确定要将 ${item.name} 的文件夹压缩到当前目录吗？\n\n压缩包保存位置: ${archivePath}`
      const confirmed = await confirmService.confirm(confirmMessage, '确认压缩')
      if (!confirmed) {
        return
      }

      // 执行压缩
      await performCompression(item, folderToCompress, archivePath)
    } catch (error: any) {
      console.error('压缩文件异常:', error)
      notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
    }
  }

  /**
   * 执行解压操作（通用方法）
   */
  async function performExtraction(
    item: ArchiveItem,
    outputDir: string,
    password: string | null = null,
    triedPasswords: string[] = []
  ): Promise<boolean> {
    try {
      console.log('=== 开始解压操作 ===')
      console.log('文件名称:', item.name)
      console.log('压缩包路径:', item.path)
      console.log('输出目录:', outputDir)
      console.log('是否提供密码:', password ? '是' : '否')
      console.log('已尝试的密码数量:', triedPasswords.length)
      
      // 如果还没有尝试过密码，先尝试常用密码（避免 WinRAR.exe 弹出密码输入框）
      if (!password && triedPasswords.length === 0) {
        console.log('📋 首次解压，先尝试常用密码...')
        let commonPasswords: string[] = []
        let passwordFileCreated = false
        if (window.electronAPI && window.electronAPI.readArchivePasswords) {
          const passwordsResult = await window.electronAPI.readArchivePasswords()
          if (passwordsResult.success && passwordsResult.passwords) {
            commonPasswords = passwordsResult.passwords
            passwordFileCreated = passwordsResult.fileCreated || false
            console.log('📋 读取到常用密码列表，共', commonPasswords.length, '个密码')
            
            // 如果密码文件是新创建的，告知用户并直接弹出密码输入框
            if (passwordFileCreated) {
              notify.toast('info', '密码文件已创建', '已创建 SaveData/passwords.txt 文件，请编辑添加常用密码。现在请手动输入密码。')
              // 显示密码输入对话框
              showPasswordDialog({
                title: '输入密码',
                message: '该压缩包需要密码，请输入密码：',
                onConfirm: async (userPassword) => {
                  if (userPassword) {
                    await performExtraction(item, outputDir, userPassword, triedPasswords)
                  } else {
                    notify.toast('error', '解压取消', '未输入密码，解压已取消')
                  }
                }
              })
              return false
            }
          }
        }
        
        // 如果有常用密码，先尝试常用密码（使用测试命令，避免弹出 GUI）
        if (commonPasswords.length > 0) {
          console.log('🔑 开始测试常用密码，共', commonPasswords.length, '个密码')
          // 提示用户检测到密码，正在使用密码本
          notify.toast('info', '检测到密码', `该压缩包需要密码，正在使用默认密码本尝试解密（共 ${commonPasswords.length} 个密码）...`)
          let triedCount = 0
          let correctPassword: string | null = null
          
          // 先测试所有密码，找到正确的密码
          for (let i = 0; i < commonPasswords.length; i++) {
            const commonPassword = commonPasswords[i]
            triedCount++
            console.log(`🔑 [${triedCount}/${commonPasswords.length}] 测试密码:`, commonPassword.replace(/./g, '*'))
            
            // 跳过已经尝试过的密码
            if (triedPasswords.includes(commonPassword)) {
              console.log('⏭️ 密码已尝试过，跳过')
              continue
            }
            
            triedPasswords.push(commonPassword)
            
            // 使用测试命令验证密码（不实际解压，避免弹出 GUI）
            if (window.electronAPI && window.electronAPI.testArchivePassword) {
              const testResult = await window.electronAPI.testArchivePassword(item.path, commonPassword)
              console.log(`🔑 [${triedCount}/${commonPasswords.length}] 密码测试结果:`, testResult.passwordCorrect ? '✅ 正确' : '❌ 错误')
              
              if (testResult.success && testResult.passwordCorrect) {
                // 找到正确密码
                correctPassword = commonPassword
                console.log('✅ 找到正确密码，已尝试', triedCount, '个密码')
                break // 找到正确密码，退出循环
              }
              // 密码错误，继续尝试下一个
              console.log(`❌ [${triedCount}/${commonPasswords.length}] 密码错误，继续测试下一个...`)
            } else {
              // 如果测试 API 不可用，降级到直接解压的方式
              console.log('⚠️ 测试 API 不可用，降级到直接解压方式')
              const tryResult = await window.electronAPI.extractArchive(item.path, outputDir, commonPassword)
              
              if (tryResult.success) {
                notify.toast('success', '解压成功', `使用常用密码成功解压到: ${outputDir}`)
                console.log('✅ 使用常用密码解压成功，已尝试', triedCount, '个密码')
                return true
              } else {
                const errorMsg = tryResult.error || ''
                const errorMsgLower = errorMsg.toLowerCase()
                const exitCodeMatch = errorMsg.match(/退出码:\s*(\d+)/)
                const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : null
                const isWinRARExitCode11 = exitCode === 11
                const isPasswordError = tryResult.requiresPassword || 
                                       errorMsgLower.includes('password') || 
                                       errorMsgLower.includes('密码') ||
                                       isWinRARExitCode11
                
                if (!isPasswordError) {
                  console.log('❌ 不是密码错误，解压失败:', errorMsg.substring(0, 200))
                  notify.toast('error', '解压失败', errorMsg || '解压过程中发生错误')
                  return false
                }
                console.log(`❌ [${triedCount}/${commonPasswords.length}] 密码错误，继续尝试下一个...`)
              }
            }
          }
          
          // 如果找到了正确密码，使用它进行解压
          if (correctPassword) {
            console.log('🔑 使用找到的正确密码进行解压:', correctPassword.replace(/./g, '*'))
            notify.toast('success', '密码验证成功', `已在密码本中找到正确密码（第 ${triedCount}/${commonPasswords.length} 个），开始解压...`)
            
            // 使用正确密码解压
            const extractResult = await window.electronAPI.extractArchive(item.path, outputDir, correctPassword)
            if (extractResult.success) {
              notify.toast('success', '解压成功', `使用密码本中的密码成功解压到: ${outputDir}`)
              console.log('✅ 解压成功')
              return true
            } else {
              notify.toast('error', '解压失败', extractResult.error || '解压过程中发生错误')
              console.error('❌ 解压失败:', extractResult.error)
              return false
            }
          } else {
            console.log('❌ 所有常用密码都失败了，共测试了', triedCount, '个密码')
            notify.toast('warning', '密码本解密失败', `已尝试密码本中的 ${triedCount} 个密码，均不正确。请手动输入密码。`)
          }
        }
      }
      
      // 显示解压中提示
      if (password) {
        notify.toast('info', '正在解压', `正在尝试密码解压 ${item.name}...`)
      } else {
        notify.toast('info', '正在解压', `正在解压 ${item.name}...`)
      }

      // 调用解压 API
      if (window.electronAPI && window.electronAPI.extractArchive) {
        const result = await window.electronAPI.extractArchive(item.path, outputDir, password)
        console.log('解压 API 返回结果:', result.success ? '成功' : '失败', result.error || '', result.requiresPassword ? '(需要密码)' : '')

        if (result.success) {
          if (password) {
            notify.toast('success', '解压成功', `使用密码成功解压到: ${outputDir}`)
          } else {
            notify.toast('success', '解压成功', `文件已解压到: ${outputDir}`)
          }
          console.log('✅ 解压成功:', result.outputDir)
          return true
        } else {
          // 检查是否需要密码
          const errorMsg = result.error || ''
          const needsPassword = result.requiresPassword || 
                               errorMsg.toLowerCase().includes('password') || 
                               errorMsg.toLowerCase().includes('密码') ||
                               errorMsg.toLowerCase().includes('wrong password') ||
                               errorMsg.toLowerCase().includes('incorrect password')
          
          console.log('检查是否需要密码:', needsPassword, '错误信息:', errorMsg.substring(0, 200))
          
          if (needsPassword && !password) {
            // 常用密码已经在前面尝试过了，如果到这里说明都失败了
            console.log('❌ 常用密码都失败了，提示用户输入密码')
            
            // 如果常用密码都失败了，提示用户输入密码
            showPasswordDialog({
              title: '输入密码',
              message: '该压缩包需要密码，常用密码已尝试失败。请输入密码：',
              onConfirm: async (userPassword) => {
                if (userPassword) {
                  await performExtraction(item, outputDir, userPassword, triedPasswords)
                } else {
                  notify.toast('error', '解压取消', '未输入密码，解压已取消')
                }
              }
            })
            return false
          } else {
            notify.toast('error', '解压失败', result.error || '解压过程中发生错误')
            console.error('❌ 解压失败:', result.error)
            return false
          }
        }
      } else {
        notify.toast('error', '解压失败', '解压功能不可用')
        return false
      }
    } catch (error: any) {
      console.error('执行解压操作异常:', error)
      notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
      return false
    }
  }

  /**
   * 解压压缩包文件（选择目录）
   */
  async function extractArchive(item: ArchiveItem): Promise<void> {
    try {
      // 检查是否为压缩包
      const isArchive = item.isArchive || (item.path && isArchiveFile(item.path))
      if (!isArchive) {
        notify.toast('warning', '无法解压', '选中的文件不是压缩包文件')
        return
      }

      // 检查文件是否存在
      if (!item.path) {
        notify.toast('error', '解压失败', '文件路径不存在')
        return
      }

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.checkFileExists) {
        const existsResult = await window.electronAPI.checkFileExists(item.path)
        if (!existsResult.success || !existsResult.exists) {
          notify.toast('error', '解压失败', '压缩包文件不存在或无法访问')
          return
        }
      }

      // 让用户选择解压目录
      if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.selectFolder) {
        notify.toast('error', '解压失败', '当前环境不支持选择文件夹')
        return
      }

      const folderResult = await window.electronAPI.selectFolder()
      if (!folderResult.success || !folderResult.path) {
        // 用户取消了选择
        return
      }

      const outputDir = folderResult.path

      // 执行解压
      await performExtraction(item, outputDir)
    } catch (error: any) {
      console.error('解压文件异常:', error)
      notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
    }
  }

  /**
   * 解压到压缩包所在目录（创建同名子文件夹）
   */
  async function extractArchiveToCurrentDir(item: ArchiveItem): Promise<void> {
    try {
      // 检查是否为压缩包
      const isArchive = item.isArchive || (item.path && isArchiveFile(item.path))
      if (!isArchive) {
        notify.toast('warning', '无法解压', '选中的文件不是压缩包文件')
        return
      }

      // 检查文件是否存在
      if (!item.path) {
        notify.toast('error', '解压失败', '文件路径不存在')
        return
      }

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.checkFileExists) {
        const existsResult = await window.electronAPI.checkFileExists(item.path)
        if (!existsResult.success || !existsResult.exists) {
          notify.toast('error', '解压失败', '压缩包文件不存在或无法访问')
          return
        }
      }

      // 获取压缩包所在目录和文件名
      const archivePath = item.path
      // 使用字符串操作获取目录路径（兼容 Windows 和 Unix 路径）
      const lastBackslash = archivePath.lastIndexOf('\\')
      const lastSlash = archivePath.lastIndexOf('/')
      const lastSeparator = Math.max(lastBackslash, lastSlash)
      const archiveDir = lastSeparator >= 0 ? archivePath.substring(0, lastSeparator) : archivePath
      
      // 获取压缩包文件名（不含扩展名）
      const fileName = lastSeparator >= 0 ? archivePath.substring(lastSeparator + 1) : archivePath
      // 移除扩展名（支持多种压缩格式，按长度从长到短排序，优先匹配长扩展名如 .tar.gz）
      const archiveExtensions = ['.tar.gz', '.tar.bz2', '.tar.xz', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']
      let fileNameWithoutExt = fileName
      for (const ext of archiveExtensions) {
        if (fileNameWithoutExt.toLowerCase().endsWith(ext.toLowerCase())) {
          fileNameWithoutExt = fileNameWithoutExt.substring(0, fileNameWithoutExt.length - ext.length)
          break
        }
      }
      
      // 创建子文件夹路径（Windows 使用反斜杠）
      const pathSeparator = archivePath.includes('\\') ? '\\' : '/'
      const outputDir = archiveDir + (archiveDir.endsWith('\\') || archiveDir.endsWith('/') ? '' : pathSeparator) + fileNameWithoutExt
      
      // 确认是否解压到当前目录的子文件夹
      const confirmMessage = `确定要将 ${item.name} 解压到当前目录吗？\n\n解压位置: ${outputDir}\n\n注意：将在压缩包所在目录创建同名子文件夹。`
      const confirmed = await confirmService.confirm(confirmMessage, '确认解压')
      if (!confirmed) {
        return
      }

      // 执行解压（会自动创建目录）
      await performExtraction(item, outputDir)
    } catch (error: any) {
      console.error('解压文件异常:', error)
      notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
    }
  }

  return {
    compressFile,
    compressFileToCurrentDir,
    extractArchive,
    extractArchiveToCurrentDir,
    performCompression,
    performExtraction,
    setPasswordDialogCallback
  }
}
