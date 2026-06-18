// 环境域名
const env = {
  // 开发环境
  dev: 'http://47.250.52.230:12005',
  // 生产环境
  prod: 'https://api.xxx.com'
}

// 判断环境 uniapp自带判断
export const baseUrl = import.meta.env.MODE === 'development' ? env.dev : env.prod