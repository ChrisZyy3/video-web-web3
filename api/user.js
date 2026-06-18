import { http } from '@/utils/request'

// 登录
export const loginApi = (data) => http.post('/user/login', data, { loadText: '登录中' })

// 获取用户信息
export const getUserInfoApi = () => http.get('/user/info')

// 修改个人信息
export const editUserApi = (data) => http.put('/user/edit', data)

// 退出登录
export const logoutApi = () => http.post('/user/logout')

// 退出登录
export const getVideosApi = (data) => http.get('/api/videos',data)