import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pet: resolve(__dirname, 'pet.html'),
        'video-player': resolve(__dirname, 'public/html/video-player.html')
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 5173,
    host: '0.0.0.0', // 允许局域网访问，手机可以通过电脑的局域网IP访问
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
    open: false // 不自动打开浏览器
  }
})
