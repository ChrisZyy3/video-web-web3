<template>
  <view v-show="visible" class="player-mask">
    <video
      :id="videoId"
      :key="video"
      class="player-video"
      :class="{ 'player-video--ios': useIosNativeControls }"
      :src="video"
      :poster="framePoster"
      :autoplay="false"
      :loop="false"
      :muted="false"
      :playsinline="true"
      :controls="true"
      :show-center-play-btn="!useIosNativeControls"
      :show-fullscreen-btn="!useIosNativeControls"
      :enable-progress-gesture="true"
      preload="metadata"
      :object-fit="useIosNativeControls ? 'contain' : 'cover'"
      @canplay="onCanPlay"
      @play="onPlay"
      @error="onError"
    />
    <view class="player-close" :style="{ top: closeTop + 'px' }" @click="handleClose">
      <text class="player-close-text">×</text>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getMobilePageLayout,
  bindViewportResize,
  shouldUseIosNativeVideoControls,
  patchNativeVideoControlsForIOS
} from '@/utils/h5-compat'
import { useVideoFirstFramePoster } from '@/utils/use-video-poster'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  video: {
    type: String,
    default: ''
  },
  cover: {
    type: String,
    default: ''
  },
  videoId: {
    type: String,
    default: 'videoPlayer'
  }
})

const emit = defineEmits(['close', 'update:visible'])

const closeTop = ref(20)
const needPlay = ref(false)
const useIosNativeControls = ref(false)

const framePoster = useVideoFirstFramePoster(
  () => props.video,
  () => props.cover,
  () => props.videoId
)

const detectVideoPlatform = () => {
  // #ifdef H5
  useIosNativeControls.value = shouldUseIosNativeVideoControls()
  // #endif
}

const patchVideoControls = () => {
  // #ifdef H5
  nextTick(() => patchNativeVideoControlsForIOS(props.videoId))
  // #endif
}

const getCtx = () => uni.createVideoContext(props.videoId)

const play = () => {
  needPlay.value = true
  getCtx().play()
}

const tryPlay = () => {
  if (!needPlay.value) return
  getCtx().play()
}

const onCanPlay = () => {
  patchVideoControls()
  tryPlay()
}

const onPlay = () => {
  needPlay.value = false
}

const onError = (e) => {
  console.error('全屏视频加载失败', e.detail)
  needPlay.value = false
}

const handleClose = () => {
  getCtx().pause()
  getCtx().seek(0)
  needPlay.value = false
  emit('update:visible', false)
  emit('close')
}

const updateCloseTop = () => {
  closeTop.value = getMobilePageLayout().statusBarHeight + 10
}

let unbindViewport = null

onMounted(() => {
  detectVideoPlatform()
  updateCloseTop()
  patchVideoControls()
  // #ifdef H5
  unbindViewport = bindViewportResize(updateCloseTop)
  // #endif
})

onUnmounted(() => {
  // #ifdef H5
  unbindViewport?.()
  // #endif
})

watch(() => props.visible, (val) => {
  if (!val) {
    getCtx().pause()
    needPlay.value = false
    return
  }
  patchVideoControls()
})

watch(() => props.video, () => {
  patchVideoControls()
})

defineExpose({ play })
</script>

<style>
.player-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000000;
  background: #000;
}

.player-video {
  width: 100%;
  height: 100%;
  display: block;
  background: #000;
}

.player-video--ios {
  object-fit: contain;
}

.player-close {
  position: absolute;
  right: 24rpx;
  z-index: 10;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-close-text {
  font-size: 48rpx;
  color: #fff;
  line-height: 1;
  margin-top: -4rpx;
}
</style>
