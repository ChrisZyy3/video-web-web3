// Environment Domains Configuration / 环境域名配置
const env = {
  // Development Environment Base URL / 开发环境留空，走相对路径 /api
  // 配合 vite.config.js 中的 server.proxy 代理，将 /api 请求转发到 https://3xrs6.com，避免跨域
  dev: '',
  // Production Environment Base URL / 生产环境留空，走相对路径 /api，由 Vercel rewrites 反代到后端，浏览器同源无跨域
  prod: ''
}

// 媒体资源（视频、封面图）的后端域名
// API 请求走 Vite proxy 可以用相对路径，但 <video src> 是浏览器直接加载的，必须是完整 URL
const mediaEnv = {
  // 开发环境：媒体文件始终指向后端服务器（不能走 localhost，否则 video 元素报 NotSupportedError）
  dev: 'https://3xrs6.com',
  // 生产环境：与后端同域，留空走相对路径即可
  prod: ''
}


// Determine current environment using Vite/UniApp meta env mode / 根据环境模式选择对应的域名，并导出供全局请求使用
export const baseUrl = import.meta.env.MODE === 'development' ? env.dev : env.prod

// 媒体资源基础 URL（视频、封面图等需要浏览器直接加载的资源）
// 与 baseUrl 区别：baseUrl 走 Vite proxy 可以为空，而媒体 URL 由 <video> 标签直接请求，必须是完整地址
export const mediaBaseUrl = import.meta.env.MODE === 'development' ? mediaEnv.dev : mediaEnv.prod

// WalletConnect projectId（公开值，会打进前端包；建议在 Reown Cloud 限制允许域名防盗用配额）
// 可在 .env 用 VITE_WC_PROJECT_ID 覆盖
export const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID || '11cf43f9159b72fb3a1ca6a26a599305'

// TRON 链节点（可在 .env 配置 VITE_TRON_RPC_HOST / VITE_TRON_API_KEY 提升限额）
export const tronRpc = {
  host: String(import.meta.env.VITE_TRON_RPC_HOST || 'https://api.trongrid.io').replace(/\/$/, ''),
  apiKey: import.meta.env.VITE_TRON_API_KEY || ''
}