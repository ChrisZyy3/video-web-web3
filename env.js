// Environment Domains Configuration / 环境域名配置
const env = {
  // Development Environment Base URL / 开发环境基础域名
  dev: 'https://3xrs6.com',
  // Production Environment Base URL / 生产环境基础域名
  prod: 'https://3xrs6.com'
}

// Determine current environment using Vite/UniApp meta env mode / 根据环境模式选择对应的域名，并导出供全局请求使用
export const baseUrl = import.meta.env.MODE === 'development' ? env.dev : env.prod

// TRON 链节点（可在 .env 配置 VITE_TRON_RPC_HOST / VITE_TRON_API_KEY 提升限额）
export const tronRpc = {
  host: String(import.meta.env.VITE_TRON_RPC_HOST || 'https://api.trongrid.io').replace(/\/$/, ''),
  apiKey: import.meta.env.VITE_TRON_API_KEY || ''
}