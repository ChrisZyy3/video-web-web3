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

/** 合并 uni onLoad 参数、search、hash 查询 */
export function parseH5RouteQuery(options = {}) {
  const merged = { ...(options || {}) }
  if (typeof window === 'undefined') return merged

  const searchParams = parseQueryString(window.location.search)
  const hash = window.location.hash || ''
  const qIndex = hash.indexOf('?')
  const hashParams = qIndex >= 0 ? parseQueryString(hash.slice(qIndex)) : {}

  return { ...merged, ...searchParams, ...hashParams }
}

export function getViewportHeight() {
  if (typeof window === 'undefined') return 0
  const vv = window.visualViewport
  if (vv?.height) return Math.round(vv.height)
  return window.innerHeight || document.documentElement.clientHeight || 0
}

function readEnvSafeInset(side) {
  if (typeof document === 'undefined' || !document.body) return 0
  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    `${side}:0`,
    `padding-${side}:constant(safe-area-inset-${side})`,
    `padding-${side}:env(safe-area-inset-${side})`
  ].join(';')
  document.body.appendChild(probe)
  const inset = parseFloat(getComputedStyle(probe).getPropertyValue(`padding-${side}`)) || 0
  document.body.removeChild(probe)
  return inset
}

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

  // H5：uni 未返回时，用 env(safe-area-inset-*) 探测（iOS Safari 常见）
  if (typeof document !== 'undefined') {
    if (top === 0) top = readEnvSafeInset('top')
    if (bottom === 0) bottom = readEnvSafeInset('bottom')
    if (left === 0) left = readEnvSafeInset('left')
    if (right === 0) right = readEnvSafeInset('right')
  }

  return { top, bottom, left, right }
}

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

export function getScrollBodyHeight(...fixedHeightsPx) {
  const layout = getMobilePageLayout()
  const fixed = fixedHeightsPx.reduce((sum, h) => sum + (Number(h) || 0), 0)
  return Math.max(0, layout.windowHeight - layout.statusBarHeight - fixed)
}

export function getTabbarInsetPx(tabbarContentRpx, bulgeExtraRpx = 0) {
  const layout = getMobilePageLayout()
  const rpxToPx = layout.windowWidth / 750
  return Math.ceil((tabbarContentRpx + bulgeExtraRpx) * rpxToPx) + layout.safeBottom
}

/** 底部固定按钮区占位（含 safe area） */
export function getFooterInsetPx(contentRpx, extraRpx = 0) {
  const layout = getMobilePageLayout()
  const rpxToPx = layout.windowWidth / 750
  return Math.ceil((contentRpx + extraRpx) * rpxToPx) + layout.safeBottom
}

/** rpx 转 px（不含 safe area） */
export function getRpxPx(rpx) {
  const layout = getMobilePageLayout()
  return Math.ceil((Number(rpx) || 0) * layout.windowWidth / 750)
}

/** 带底部固定按钮的页面布局（iOS / Android H5） */
export function calcFixedFooterPageLayout({
  headerBlockRpx = 220,
  footerBlockRpx = 152,
  scrollEndRpx = 32
} = {}) {
  const layout = getMobilePageLayout()
  const headerPx = getRpxPx(headerBlockRpx)
  const footerPx = getFooterInsetPx(footerBlockRpx)
  return {
    statusBarHeight: layout.statusBarHeight,
    safeBottom: layout.safeBottom,
    mainHeight: layout.windowHeight,
    scrollHeight: Math.max(0, layout.windowHeight - layout.statusBarHeight - headerPx - footerPx),
    bottomSpaceHeight: getRpxPx(scrollEndRpx)
  }
}

/** 全屏滚动页布局（无底部固定按钮） */
export function calcFullScrollPageLayout({
  headerBlockRpx = 88,
  scrollBottomRpx = 40
} = {}) {
  const layout = getMobilePageLayout()
  const headerPx = getRpxPx(headerBlockRpx)
  return {
    statusBarHeight: layout.statusBarHeight,
    mainHeight: layout.windowHeight,
    scrollHeight: Math.max(0, layout.windowHeight - layout.statusBarHeight - headerPx),
    bottomSpaceHeight: getFooterInsetPx(scrollBottomRpx)
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

export function initH5Compat() {
  if (typeof document === 'undefined') return
  applyCssEnvVars()
  bindViewportResize(applyCssEnvVars)
}
