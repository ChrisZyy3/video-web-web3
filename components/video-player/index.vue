<template>
  <view v-show="visible" class="player-mask">
    <video
      :id="videoId"
      :key="video"
      class="player-video"
      :src="video"
      :poster="cover"
      :autoplay="false"
      :loop="false"
      :muted="false"
      :playsinline="true"
      :controls="true"
      :show-center-play-btn="true"
      :show-play-btn="true"
      :show-fullscreen-btn="true"
      :show-progress="true"
      :enable-progress-gesture="true"
      object-fit="contain"
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getMobilePageLayout, setupMobileLayout } from '@/utils/h5-compat'

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
  const layout = getMobilePageLayout()
  closeTop.value = layout.statusBarHeight + 10
}

let unbindViewport = null

onMounted(() => {
  unbindViewport = setupMobileLayout(updateCloseTop)
})

onUnmounted(() => {
  unbindViewport?.()
})

watch(() => props.visible, (val) => {
	if (!val) {
		getCtx().pause()
		needPlay.value = false
	}
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

.player-mask :deep(.uni-video-bar) {
  display: flex !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.player-mask :deep(.uni-video-progress),
.player-mask :deep(.uni-video-progress-container) {
  flex: 1;
  min-width: 0;
  display: block !important;
}

.player-mask :deep(.uni-video-ball) {
  display: none !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  transform: scale(0) !important;
  pointer-events: none !important;
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
