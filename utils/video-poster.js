import { isAndroid } from '@/utils/h5-compat'

/** 视频首帧封面缓存（按 URL） */
const posterCache = new Map()
const blobUrlByVideo = new Map()

/**
 * 截取视频第一帧作为 poster（H5，兼容 iOS / Android WebView）
 * @param {string} videoUrl
 * @returns {Promise<string>} poster URL（Android 优先 blob URL）
 */
export function captureVideoFirstFrame(videoUrl) {
  if (!videoUrl) return Promise.resolve('')
  if (posterCache.has(videoUrl)) return posterCache.get(videoUrl)

  const task = captureWithRetry(videoUrl)
    .then((dataUrl) => normalizePosterUrl(videoUrl, dataUrl))
    .catch(() => '')

  posterCache.set(videoUrl, task)
  return task
}

function findNativeVideoElement(videoId) {
  if (typeof document === 'undefined' || !videoId) return null
  const root = document.getElementById(videoId)
  if (!root) return null
  return root.tagName === 'VIDEO' ? root : root.querySelector('video')
}

/** 将 poster 同步到 uni-app 包裹层内的真实 video（Android 常需手动设置） */
export function applyNativeVideoPoster(videoId, posterUrl) {
  if (typeof document === 'undefined' || !videoId || !posterUrl) return
  const el = findNativeVideoElement(videoId)
  if (!el) return
  el.poster = posterUrl
  el.setAttribute('poster', posterUrl)
}

async function captureWithRetry(videoUrl) {
  const withCors = await captureOnce(videoUrl, true)
  if (withCors) return withCors
  return captureOnce(videoUrl, false)
}

function createCaptureVideo() {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.setAttribute('x5-playsinline', 'true')
  video.setAttribute('x5-video-player-type', 'h5')
  video.preload = 'auto'
  return video
}

function captureOnce(videoUrl, useCors) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('')
      return
    }

    const video = createCaptureVideo()
    if (useCors) video.crossOrigin = 'anonymous'

    let settled = false
    let seeked = false

    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      resolve(result)
    }

    const fail = () => finish('')

    const timer = setTimeout(fail, isAndroid() ? 20000 : 15000)

    const capture = () => {
      if (seeked) return
      seeked = true
      try {
        const w = video.videoWidth
        const h = video.videoHeight
        if (!w || !h) {
          fail()
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(video, 0, 0, w, h)
        finish(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        fail()
      }
    }

    const trySeek = () => {
      if (settled || seeked) return
      if (!video.videoWidth || video.readyState < 2) return
      try {
        video.currentTime = isAndroid() ? 0.001 : 0.01
      } catch {
        capture()
      }
    }

    video.addEventListener('error', fail, { once: true })
    video.addEventListener('loadedmetadata', trySeek)
    video.addEventListener('loadeddata', trySeek)
    video.addEventListener('canplay', trySeek)
    video.addEventListener('seeked', capture, { once: true })

    video.src = videoUrl
    video.load()
  })
}

/** Android WebView 对超长 data URL 支持差，转为 blob URL */
function normalizePosterUrl(videoUrl, dataUrl) {
  if (!dataUrl) return ''
  if (!isAndroid() || !dataUrl.startsWith('data:')) return dataUrl

  const cached = blobUrlByVideo.get(videoUrl)
  if (cached) return cached

  try {
    const comma = dataUrl.indexOf(',')
    const header = dataUrl.slice(0, comma)
    const base64 = dataUrl.slice(comma + 1)
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }))
    blobUrlByVideo.set(videoUrl, blobUrl)
    return blobUrl
  } catch {
    return dataUrl
  }
}
