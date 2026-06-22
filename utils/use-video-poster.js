import { ref, watch, unref, nextTick } from 'vue'
import { isAndroid } from '@/utils/h5-compat'
import { captureVideoFirstFrame, applyNativeVideoPoster } from '@/utils/video-poster'

function syncNativePoster(videoId, posterUrl) {
  if (!videoId || !posterUrl) return
  nextTick(() => {
    applyNativeVideoPoster(videoId, posterUrl)
    if (isAndroid()) {
      setTimeout(() => applyNativeVideoPoster(videoId, posterUrl), 300)
    }
  })
}

/**
 * 根据视频地址生成首帧 poster，失败时回退 fallback
 * @param {Function|import('vue').Ref} getSrc
 * @param {Function|import('vue').Ref} getFallback
 * @param {Function|import('vue').Ref|string|null} getVideoId 可选，同步 poster 到真实 video 节点（Android）
 */
export function useVideoFirstFramePoster(getSrc, getFallback = () => '', getVideoId = null) {
  const poster = ref('')

  watch(
    () => ({
      src: typeof getSrc === 'function' ? getSrc() : unref(getSrc),
      fallback: typeof getFallback === 'function' ? getFallback() : unref(getFallback),
      videoId: getVideoId
        ? (typeof getVideoId === 'function' ? getVideoId() : unref(getVideoId))
        : null
    }),
    async ({ src, fallback, videoId }) => {
      if (!src) {
        poster.value = fallback || ''
        return
      }
      const frame = await captureVideoFirstFrame(src)
      poster.value = frame || fallback || ''
      // #ifdef H5
      syncNativePoster(videoId, poster.value)
      // #endif
    },
    { immediate: true }
  )

  return poster
}
