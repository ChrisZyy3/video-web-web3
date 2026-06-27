// Environment Domains Configuration / 环境域名配置
const env = {
  // Development Environment Base URL / 开发环境基础域名（本地直连后端）
  dev: 'https://3xrs6.com',
  // Production Environment Base URL / 生产环境留空，走相对路径 /api，由 Vercel rewrites 反代到后端，浏览器同源无跨域
  prod: ''
}

// Determine current environment using Vite/UniApp meta env mode / 根据环境模式选择对应的域名，并导出供全局请求使用
export const baseUrl = import.meta.env.MODE === 'development' ? env.dev : env.prod

// WalletConnect projectId（公开值，会打进前端包；建议在 Reown Cloud 限制允许域名防盗用配额）
// 可在 .env 用 VITE_WC_PROJECT_ID 覆盖
export const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID || '11cf43f9159b72fb3a1ca6a26a599305'

// TRON 链节点（可在 .env 配置 VITE_TRON_RPC_HOST / VITE_TRON_API_KEY 提升限额）
export const tronRpc = {
  host: String(import.meta.env.VITE_TRON_RPC_HOST || 'https://api.trongrid.io').replace(/\/$/, ''),
  apiKey: import.meta.env.VITE_TRON_API_KEY || ''
}