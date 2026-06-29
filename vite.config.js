import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    uni(),
    // WalletConnect 依赖 Node 内置模块（Buffer/process/global 等），H5 打包需注入 polyfill，否则运行时报错
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true }
    })
  ],
  define: {
    global: 'globalThis'
  },
  root: process.cwd(),
  server: {
    proxy: {
      // 将本地 /api 请求全部代理转发到后端服务器，解决开发环境跨域（CORS）问题
      // 代理规则：/api/** → https://3xrs6.com/api/**
      '/api': {
        target: 'https://3xrs6.com',   // 后端服务器地址
        changeOrigin: true,             // 修改请求头 Origin，使服务器认为请求来自同域
        secure: false,                  // 允许代理 HTTPS（忽略证书错误，适合开发）
        rewrite: (path) => path         // 保持路径不变（/api/... 原样转发）
      }
    }
  }
})
