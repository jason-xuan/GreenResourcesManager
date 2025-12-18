/**
 * ============================================================================
 * 视频播放窗口管理模块 (Video Window Manager)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块负责创建和管理独立的视频播放窗口，用于在应用中播放视频文件。
 * 支持多种视频格式，包含完整的视频播放器功能。
 * 
 * 主要功能：
 * 1. 创建独立的视频播放窗口（可同时打开多个）
 * 2. 生成视频播放器 HTML 页面（包含完整的播放器 UI 和逻辑）
 * 3. 支持多种视频格式（mp4, webm, avi, mkv, mov, flv, wmv 等）
 * 4. 视频播放控制（播放、暂停、进度控制）
 * 5. 键盘快捷键支持（空格播放/暂停、左右箭头快进/快退、ESC 退出全屏）
 * 6. 错误处理和降级方案（支持使用外部播放器打开）
 * 7. 管理视频窗口生命周期（创建、关闭、清理）
 * 
 * 导出的函数：
 * - openVideoWindow()          打开视频播放窗口
 * - getAllVideoWindows()       获取所有视频窗口实例
 * - registerIpcHandlers()      注册视频窗口相关的 IPC 处理器
 * 
 * 内部函数：
 * - generateVideoHtml()         生成视频播放器 HTML 模板
 * 
 * IPC 处理器：
 * - open-video-window           打开视频播放窗口
 * 
 * 视频播放器特性：
 * - 支持多种视频格式和 MIME 类型
 * - 自动检测视频格式并设置正确的 MIME 类型
 * - 处理中文路径和特殊字符
 * - 完整的错误处理机制
 * - 支持使用外部播放器作为降级方案
 * - 键盘快捷键控制
 * 
 * ============================================================================
 */

const { BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

// 持有视频窗口的全局引用，防止被垃圾回收
const videoWindows = []

/**
 * 生成视频播放器的 HTML 模板
 * @param {string} filePath - 视频文件路径
 * @param {Object} options - 选项
 * @param {string} options.title - 窗口标题
 * @returns {string} HTML 字符串
 */
function generateVideoHtml(filePath, options = {}) {
  // 转义文件路径中的特殊字符，防止 XSS
  const escapedPath = filePath.replace(/\\/g, '/').replace(/'/g, "\\'").replace(/"/g, '&quot;')
  const title = (options.title || '视频播放器').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: #000;
            height: 100vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .video-container {
            position: relative;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            outline: none;
        }
        
        .error-message {
            color: white;
            text-align: center;
            padding: 20px;
        }
        
        .loading-message {
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="video-container">
        <div id="loadingMessage" class="loading-message">正在加载视频...</div>
        <video id="videoPlayer" controls style="display: none;">
            <source id="videoSource" src="" type="">
            <source id="videoSourceFallback" src="" type="">
            您的浏览器不支持视频播放。
        </video>
    </div>
    
    <script>
        const video = document.getElementById('videoPlayer');
        const videoSource = document.getElementById('videoSource');
        const videoSourceFallback = document.getElementById('videoSourceFallback');
        const loadingMessage = document.getElementById('loadingMessage');
        
        // 获取视频文件路径
        const videoPath = '${escapedPath}';
        console.log('视频文件路径:', videoPath);
        
        // 检查视频格式支持
        function checkVideoFormatSupport(filePath) {
            const extension = filePath.toLowerCase().split('.').pop();
            const supportedFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv'];
            return supportedFormats.includes(extension);
        }
        
        // 获取视频MIME类型
        function getVideoMimeType(filePath) {
            const extension = filePath.toLowerCase().split('.').pop();
            const mimeTypes = {
                'mp4': 'video/mp4',
                'webm': 'video/webm',
                'ogg': 'video/ogg',
                'avi': 'video/x-msvideo',
                'mov': 'video/quicktime',
                'mkv': 'video/x-matroska',
                'flv': 'video/x-flv',
                'wmv': 'video/x-ms-wmv',
                'm4v': 'video/mp4',
                '3gp': 'video/3gpp',
                'ogv': 'video/ogg'
            };
            return mimeTypes[extension] || 'video/mp4'; // 默认使用mp4
        }
        
        // 构建正确的 file:// URL
        function buildFileUrl(filePath) {
            try {
                // 将反斜杠转换为正斜杠，并确保路径以 / 开头
                const normalized = filePath.replace(/\\\\/g, '/').replace(/^([A-Za-z]:)/, '/$1');
                
                // 对路径进行编码，处理中文和特殊字符
                const encoded = normalized.split('/').map(seg => {
                    if (seg.includes(':')) {
                        // 处理 Windows 盘符（如 C:）
                        return seg;
                    }
                    return encodeURIComponent(seg);
                }).join('/');
                
                const fileUrl = 'file://' + encoded;
                console.log('构建的 file:// URL:', fileUrl);
                return fileUrl;
            } catch (error) {
                console.error('构建文件URL失败:', error);
                return filePath; // 降级返回原始路径
            }
        }
        
        // 设置视频源
        function setupVideoSource() {
            try {
                console.log('开始设置视频源...');
                
                // 检查文件格式
                if (!checkVideoFormatSupport(videoPath)) {
                    const extension = videoPath.toLowerCase().split('.').pop();
                    showError('不支持的视频格式: ' + extension + '\\n\\n建议使用外部播放器播放此文件');
                    return;
                }
                
                // 构建正确的 file:// URL
                const videoUrl = buildFileUrl(videoPath);
                const mimeType = getVideoMimeType(videoPath);
                console.log('设置视频URL:', videoUrl);
                console.log('视频MIME类型:', mimeType);
                
                // 使用 source 元素设置视频源
                videoSource.src = videoUrl;
                videoSource.type = mimeType;
                
                // 设置备用source（使用通用MIME类型）
                videoSourceFallback.src = videoUrl;
                videoSourceFallback.type = 'video/*';
                
                // 显示视频元素
                video.style.display = 'block';
                loadingMessage.style.display = 'none';
                
                // 重新加载视频
                video.load();
                
                console.log('✅ 视频源设置完成');
            } catch (error) {
                console.error('设置视频源失败:', error);
                showError('设置视频源失败: ' + error.message);
            }
        }
        
        // 显示错误信息
        function showError(message) {
            const errorHtml = '<div class="error-message">' +
                '<h3>❌ 视频播放失败</h3>' +
                '<p>' + message.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>' +
                '<div style="margin-top: 20px;">' +
                    '<button onclick="openWithExternalPlayer()" style="' +
                        'background: #007acc;' +
                        'color: white;' +
                        'border: none;' +
                        'padding: 10px 20px;' +
                        'border-radius: 5px;' +
                        'cursor: pointer;' +
                        'margin-right: 10px;' +
                    '">使用外部播放器打开</button>' +
                    '<button onclick="window.close()" style="' +
                        'background: #666;' +
                        'color: white;' +
                        'border: none;' +
                        'padding: 10px 20px;' +
                        'border-radius: 5px;' +
                        'cursor: pointer;' +
                    '">关闭窗口</button>' +
                '</div>' +
            '</div>';
            document.body.innerHTML = errorHtml;
        }
        
        // 使用外部播放器打开视频
        function openWithExternalPlayer() {
            try {
                // 通过 Electron API 打开外部播放器
                if (window.electronAPI && window.electronAPI.openExternal) {
                    window.electronAPI.openExternal(videoPath);
                    window.close();
                } else {
                    alert('无法打开外部播放器，请手动打开文件: ' + videoPath);
                }
            } catch (error) {
                console.error('打开外部播放器失败:', error);
                alert('打开外部播放器失败: ' + error.message);
            }
        }
        
        
        // 视频加载完成
        video.addEventListener('loadedmetadata', () => {
            console.log('视频元数据加载完成');
            console.log('视频时长:', video.duration, '秒');
        });
        
        // 视频可以播放
        video.addEventListener('canplay', () => {
            console.log('视频可以开始播放');
        });
        
        // 视频开始播放
        video.addEventListener('play', () => {
            console.log('视频开始播放');
        });
        
        // 视频错误处理
        video.addEventListener('error', (e) => {
            console.error('视频播放错误:', e);
            console.error('错误详情:', video.error);
            let errorMessage = '视频加载失败';
            let suggestion = '';
            
            if (video.error) {
                switch(video.error.code) {
                    case 1:
                        errorMessage = '视频加载被中止';
                        suggestion = '请检查网络连接或文件是否被占用';
                        break;
                    case 2:
                        errorMessage = '网络错误导致视频下载失败';
                        suggestion = '请检查网络连接或文件路径是否正确';
                        break;
                    case 3:
                        errorMessage = '视频解码错误';
                        suggestion = '视频文件可能损坏，建议使用外部播放器';
                        break;
                    case 4:
                        errorMessage = '视频格式不支持或文件损坏';
                        suggestion = '此视频格式不被浏览器支持，建议使用外部播放器';
                        break;
                    default:
                        errorMessage = '未知的视频播放错误';
                        suggestion = '请尝试使用外部播放器';
                }
            }
            
            const fullMessage = errorMessage + '\\n\\n' + suggestion + '\\n\\n请检查：\\n1. 文件是否存在\\n2. 文件格式是否支持\\n3. 文件是否损坏';
            showError(fullMessage);
        });
        
        // source 元素错误处理
        videoSource.addEventListener('error', (e) => {
            console.error('主视频源加载错误:', e);
            console.log('尝试的源URL:', videoSource.src);
            console.log('尝试的MIME类型:', videoSource.type);
            console.log('🔄 主source失败，浏览器将尝试备用source');
        });
        
        // 备用source元素错误处理
        videoSourceFallback.addEventListener('error', (e) => {
            console.error('备用视频源加载错误:', e);
            console.log('尝试的备用源URL:', videoSourceFallback.src);
            console.log('尝试的备用MIME类型:', videoSourceFallback.type);
            
            // 如果所有source都失败，尝试直接设置video.src作为最后的降级方案
            console.log('🔄 所有source元素都失败，尝试直接设置video.src作为最后降级方案');
            try {
                video.src = videoSource.src;
                video.load();
            } catch (fallbackError) {
                console.error('最后降级方案也失败:', fallbackError);
                showError('所有视频源加载失败，无法播放此文件\\n\\n建议使用外部播放器');
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
                case 'ArrowLeft':
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'ArrowRight':
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
            }
        });
        
        // 页面加载完成后设置视频源
        document.addEventListener('DOMContentLoaded', () => {
            console.log('视频播放器页面已加载');
            setupVideoSource();
        });
    </script>
</body>
</html>`
}

/**
 * 打开视频播放窗口
 * @param {string} filePath - 视频文件路径
 * @param {Object} options - 窗口选项
 * @returns {Promise<Object>} 结果对象
 */
async function openVideoWindow(filePath, options = {}) {
  try {
    console.log('=== Electron: 开始打开视频播放窗口 ===')
    console.log('视频文件路径:', filePath)
    console.log('窗口选项:', options)
    
    if (!filePath) {
      console.log('❌ 视频文件路径为空')
      return { success: false, error: '无效的视频文件路径' }
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log('❌ 视频文件不存在:', filePath)
      return { success: false, error: '视频文件不存在' }
    }
    
    // 创建视频播放窗口
    const videoWindow = new BrowserWindow({
      width: options.width || 1200,
      height: options.height || 800,
      minWidth: 800,
      minHeight: 600,
      title: options.title || '视频播放器',
      resizable: options.resizable !== false,
      minimizable: options.minimizable !== false,
      maximizable: options.maximizable !== false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: false, // 允许访问本地文件
        allowRunningInsecureContent: true, // 允许不安全内容
        preload: path.join(__dirname, '../../preload.js')
      },
      icon: path.join(__dirname, '../../butter-icon.ico'),
      show: true
    })
    
    // 保持全局引用，防止被GC
    videoWindows.push(videoWindow)
    
    // 生成视频播放页面HTML
    const videoHtml = generateVideoHtml(filePath, options)
    
    // 加载视频播放页面
    await videoWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(videoHtml)}`)
    console.log('✅ 视频播放窗口已创建并开始加载内容')
    
    // 窗口关闭时清理
    videoWindow.on('closed', () => {
      console.log('视频播放窗口已关闭')
      const index = videoWindows.indexOf(videoWindow)
      if (index > -1) {
        videoWindows.splice(index, 1)
      }
    })
    
    return { success: true }
  } catch (error) {
    console.error('❌ 打开视频播放窗口失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 获取所有视频窗口
 * @returns {BrowserWindow[]} 视频窗口数组
 */
function getAllVideoWindows() {
  return videoWindows.filter(w => w && !w.isDestroyed())
}

/**
 * 注册视频窗口相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC Main 对象
 */
function registerIpcHandlers(ipcMain) {
  ipcMain.handle('open-video-window', async (event, filePath, options = {}) => {
    return await openVideoWindow(filePath, options)
  })
}

module.exports = {
  openVideoWindow,
  getAllVideoWindows,
  registerIpcHandlers
}

