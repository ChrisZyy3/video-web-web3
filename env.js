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
  // 视频/封面始终由 <video>/<image> 浏览器直连后端 Caddy（3xrs6.com），不走任何代理。
  // 开发环境：不能走 Vite 代理——代理流为 HTTP/1.1 + connection:close、无 HTTP/2，H5 <video> 解封装报 DEMUXER_ERROR_COULD_NOT_OPEN。
  // 生产环境：不能走 Vercel CDN（www.3xrs6.com）——Vercel 会缓存 Range 分片再回放，导致后续 Range 请求 416。
  // 后端返回 ACAO:*，跨域直连 Caddy 可正常播放。
  dev: 'https://3xrs6.com',
  prod: 'https://3xrs6.com'
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