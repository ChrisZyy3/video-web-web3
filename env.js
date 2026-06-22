// 环境域名
const env = {
  // 开发环境
  dev: 'http://47.250.52.230:12005',
  // 生产环境
  prod: 'http://47.250.52.230:12005'
}

// 判断环境 uniapp自带判断
export const baseUrl = import.meta.env.MODE === 'development' ? env.dev : env.prod

// TRON 链节点（可在 .env 配置 VITE_TRON_RPC_HOST / VITE_TRON_API_KEY 提升限额）
export const tronRpc = {
  host: String(import.meta.env.VITE_TRON_RPC_HOST || 'https://api.trongrid.io').replace(/\/$/, ''),
  apiKey: import.meta.env.VITE_TRON_API_KEY || ''
}