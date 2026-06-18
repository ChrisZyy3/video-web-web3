import { baseUrl } from '@/env'

// 请求白名单（不需要携带token的接口）
const whiteList = ['/login', '/register']

/**
 * 统一请求方法
 * @param {Object} options 请求配置
 */
const request = async (options) => {
  // 拼接完整地址
  const url = baseUrl + options.url
  // 请求头
  const header = {
    'Content-Type': 'application/json;charset=UTF-8',
    // 携带token
    // token: uni.getStorageSync('token') || ''
  }

  // 白名单接口清空token
  // const isWhite = whiteList.some(item => url.includes(item))
  // if (isWhite) header.token = ''

  // 开启加载提示
  if (options.loading !== false) {
    uni.showLoading({ title: options.loadText || '', mask: true })
  }

  try {
    // 发起请求
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url,
        method: options.method || 'GET',
        data: options.data || {},
        header,
        timeout: 10000,
        success: resolve,
        fail: reject
      })
    })

    // 关闭loading
    uni.hideLoading()

    // 网络请求成功，业务状态码处理
    const { statusCode, data } = res
    // 200 接口正常返回
    if (statusCode === 200) {
      // 自定义后端code规则，按需修改
      return data
    } else {
      // http状态码异常 404/500等
      uni.showToast({ title: `${statusCode}`, icon: 'none' })
      return Promise.reject(res)
    }
  } catch (err) {
    // 网络超时、断网
    uni.hideLoading()
    uni.showToast({ title: `err`, icon: 'none' })
    return Promise.reject(err)
  }
}

// 快捷方法封装 get/post/put/delete
export const http = {
  get: (url, data, config = {}) => request({ url, method: 'GET', data, ...config }),
  post: (url, data, config = {}) => request({ url, method: 'POST', data, ...config }),
  put: (url, data, config = {}) => request({ url, method: 'PUT', data, ...config }),
  delete: (url, data, config = {}) => request({ url, method: 'DELETE', data, ...config })
}