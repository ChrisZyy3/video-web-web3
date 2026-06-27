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
  root: process.cwd()
})
