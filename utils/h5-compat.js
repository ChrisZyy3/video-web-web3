/**
 * H5 移动端（iOS / Android 浏览器、钱包内置 WebView）兼容工具
 */

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isAndroid() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
}

export function isMobileBrowser() {
  return isIOS() || isAndroid()
}

function parseQueryString(qs = '') {
  const out = {}
  const raw = qs.startsWith('?') ? qs.slice(1) : qs
  if (!raw) return out
  for (const part of raw.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const key = decodeURIComponent((eq >= 0 ? part.slice(0, eq) : part).replace(/\+/g, ' '))
    if (!key) continue
    const val = eq >= 0 ? part.slice(eq + 1) : ''
    try {
      out[key] = decodeURIComponent(val.replace(/\+/g, ' '))
    } catch {
      out[key] = val
    }
  }
  return out
}

/** 合并 uni onLoad 参数、search、hash 查询（兼容 iOS / Android 不同 WebView 传参方式） */
export function parseH5RouteQuery(options = {}) {
  const merged = { ...(options || {}) }
  if (typeof window === 'undefined') return merged

  const searchParams = parseQueryString(window.location.search)
  const hash = window.location.hash || ''
  const qIndex = hash.indexOf('?')
  const hashParams = qIndex >= 0 ? parseQueryString(hash.slice(qIndex)) : {}

  return { ...merged, ...searchParams, ...hashParams }
}

/** 可视区域高度（iOS Safari 地址栏伸缩时用 visualViewport） */
export function getViewportHeight() {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (vv?.height) return Math.round(vv.height)
  return window.innerHeight || document.documentElement.clientHeight || 0
}

/** 安全区（uni 缺失时从 safeArea 推算） */
export function getSafeAreaInsets() {
  const sys = uni.getSystemInfoSync()
  let top = sys.safeAreaInsets?.top ?? 0
  let bottom = sys.safeAreaInsets?.bottom ?? 0
  let left = sys.safeAreaInsets?.left ?? 0
  let right = sys.safeAreaInsets?.right ?? 0

  if (sys.safeArea && sys.screenHeight) {
    if (top === 0) top = Math.max(sys.safeArea.top || 0, 0)
    if (bottom === 0) bottom = Math.max(sys.screenHeight - (sys.safeArea.bottom || sys.screenHeight), 0)
  }

  return { top, bottom, left, right }
}

/** 页面布局尺寸（支付页等 custom 导航） */
export function getMobilePageLayout() {
  const sys = uni.getSystemInfoSync()
  const insets = getSafeAreaInsets()
  const windowHeight = getViewportHeight() || sys.windowHeight || sys.screenHeight || 667
  const statusBarHeight = sys.statusBarHeight || insets.top || 0

  return {
    statusBarHeight,
    safeBottom: insets.bottom,
    safeTop: insets.top,
    windowHeight,
    windowWidth: sys.windowWidth || 375,
    isIOS: isIOS(),
    isAndroid: isAndroid()
  }
}

export function bindViewportResize(callback) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener('resize', handler, { passive: true })
  window.addEventListener('orientationchange', handler, { passive: true })
  window.visualViewport?.addEventListener('resize', handler, { passive: true })
  window.visualViewport?.addEventListener('scroll', handler, { passive: true })
  return () => {
    window.removeEventListener('resize', handler)
    window.removeEventListener('orientationchange', handler)
    window.visualViewport?.removeEventListener('resize', handler)
    window.visualViewport?.removeEventListener('scroll', handler)
  }
}

/** 初始化布局并在 H5 视口变化时回调（返回卸载函数） */
export function setupMobileLayout(updateFn) {
  if (typeof updateFn !== 'function') return () => {}
  updateFn()
  return bindViewportResize(updateFn)
}

/** TabBar 内容区高度（与 components/tabbar 保持一致） */
export const TABBAR_BODY_RPX = 110
export const TABBAR_BULGE_RPX = 36

/**
 * 按 payment-confirm 同一套规则计算：状态栏 + 滚动区 + 底部固定区/TabBar
 * @param {object} options
 * @param {number} options.footerRpx - 底部固定按钮区高度（不含安全区）
 * @param {number} options.headerRpx - 状态栏下方固定头部高度（导航栏等）
 * @param {boolean} options.tabbar - 是否有底部 TabBar
 */
export function calcPageScrollLayout(options = {}) {
  const {
    footerRpx = 0,
    headerRpx = 0,
    tabbar = false,
    /** TabBar 内容区 rpx（不含凸起，凸起向上溢出不占底部空间） */
    tabbarBodyRpx = TABBAR_BODY_RPX
  } = options

  const layout = getMobilePageLayout()
  const headerPx = uni.upx2px(headerRpx)
  const footerContentPx = footerRpx > 0 ? uni.upx2px(footerRpx) : 0
  const footerPx = footerContentPx + (footerRpx > 0 ? layout.safeBottom : 0)
  const tabbarContentPx = tabbar ? Math.ceil(uni.upx2px(tabbarBodyRpx)) : 0
  const tabbarInset = tabbar ? tabbarContentPx + layout.safeBottom : 0

  const scrollHeight = layout.windowHeight
    - layout.statusBarHeight
    - headerPx
    - footerPx
    - tabbarInset

  return {
    statusBarHeight: layout.statusBarHeight,
    safeBottom: layout.safeBottom,
    windowHeight: layout.windowHeight,
    scrollHeight: Math.max(0, Math.floor(scrollHeight)),
    tabbarInset,
    bottomSpaceHeight: tabbarInset,
    tabbarBodyPx: tabbarContentPx,
    footerHeight: footerPx
  }
}

/** TabBar 页布局（scroll-view 需绑定 scrollHeight px，iOS H5 不支持 flex 撑满） */
export function calcTabbarPageLayout() {
  return calcPageScrollLayout({ tabbar: true })
}

function applyCssEnvVars() {
  if (typeof document === 'undefined') return
  const insets = getSafeAreaInsets()
  const vh = getViewportHeight()
  const root = document.documentElement
  root.style.setProperty('--sat', `${insets.top}px`)
  root.style.setProperty('--sab', `${insets.bottom}px`)
  root.style.setProperty('--sal', `${insets.left}px`)
  root.style.setProperty('--sar', `${insets.right}px`)
  if (vh > 0) {
    root.style.setProperty('--vh', `${vh * 0.01}px`)
  }
}

/** H5 启动时调用：CSS 变量 + 视口变化监听 */
export function initH5Compat() {
  if (typeof document === 'undefined') return
  applyCssEnvVars()
  bindViewportResize(applyCssEnvVars)
}
